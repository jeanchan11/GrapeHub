# Auditoria de design — Financeiro e Clientes (18/11/2026)

Escopo: 23 arquivos (ContasAReceber, ContasAPagar, Extrato, FinanceiroDashboard, PainelFinanceiro,
SuperAdminDashboard, Dre, DrePanel, DreDashboard, DreFechamento, DreDespesas, DespesasPorCategoria,
FinCategories, ModalConciliacao, SeletorCategoriaDRE, FiltroCategoriasDRE, AlertasCusto, ActiveClients,
CrmFinanceiro, CrmChecklist, CrmCommentHistory, ArchiveClientModal, PlanejamentoCrescimento).
Caminhos relativos a `src/`. Somente leitura — nada foi editado.

**O que já está no padrão e não entra na lista:** PainelFinanceiro e SuperAdminDashboard (Cartao/CartaoKpi,
`.numero`, `pageLabel`, LoadingSpinner); cartões KPI do Fluxo de Caixa (`gf-cartao` + `.numero`); cartões de
ActiveClients; abas `ABAS_CLS` de Contas a Receber e barra segmentada de Contas a Pagar / DFC / DreDespesas;
nenhum `alert()`/`confirm()`/`prompt()` nativo (todos usam `confirmDialog`/`promptDialog`/`toast`); nenhum texto
de interface em inglês; hex em séries de gráfico (recharts / `cor=` dos KPIs) é aceitável.

---

## 1. Achados

| # | arquivo:linha | categoria | o que está fora | correção sugerida |
|---|---|---|---|---|
| 1 | `pages/ContasAReceber.tsx:101-129` (CartaoNumero, 14 usos: 788-815, 1979-1989, 2459-2471), `pages/ContasAPagar.tsx:521-532` (KpiCard, 4 usos 958-969), `pages/Extrato.tsx:1550-1590` (4 cartões), `pages/DrePanel.tsx:35`, `pages/DreDashboard.tsx:121-125` + cartões 155/194/218/242, `pages/DreFechamento.tsx:159`, `pages/FinCategories.tsx:351-385` (4 cartões), `pages/PlanejamentoCrescimento.tsx:334/370/381/468…` | formato | Segunda geração de cartão convivendo com a nova: `px-5 py-4 rounded-2xl border bg-white dark:bg-dark-card/60`, rótulo uppercase 10px, valor `text-2xl font-bold` **sem `.numero`**. Navegar Fluxo de Caixa → Contas a Receber/Pagar → Extrato → DFC troca o desenho do cartão a cada tela. | `CartaoKpi`/`Cartao` de `components/graficos.tsx` (ou `div.gf-cartao`), valor com `className="numero"`. Começar por CartaoNumero e KpiCard (2 componentes = 18 cartões). |
| 2 | `pages/ContasAReceber.tsx:2412`, `ContasAPagar.tsx:908`, `SuperAdminDashboard.tsx:160`, `PainelFinanceiro.tsx:175` (SplitHeadline sem className → **text-4xl**); `FinCategories.tsx:341-345` (text-4xl explícito); `FinanceiroDashboard.tsx:507`, `Dre.tsx:40`, `ActiveClients.tsx:591`, `CrmFinanceiro.tsx:822`, `PlanejamentoCrescimento.tsx:297` (PageHeader → **text-3xl**, subtítulo `text-sm`); `Extrato.tsx:1493` (**text-2xl**) | cabeçalho | Três tamanhos de título no mesmo grupo de menu (2xl / 3xl / 4xl) e três estilos de subtítulo. | `className="text-2xl font-black tracking-tight text-dark-text"` + subtítulo `text-[10px] font-bold uppercase tracking-widest text-slate-500`. Mais barato: trocar o default de `SplitHeadline` e `designSystem.pageTitle` (afeta o app inteiro — decidir antes). |
| 3 | `pages/Dre.tsx:41-42` ("DFC / **Fluxo de Caixa**") × `pages/FinanceiroDashboard.tsx:508-509` ("Fluxo de **Caixa**") | cabeçalho | Duas páginas diferentes com o mesmo destaque "Fluxo de Caixa"; nenhuma usa `pageLabel`. Idem título fixo em `ContasAPagar.tsx:908`, `Extrato.tsx:1493`, `ActiveClients.tsx:592`, `CrmFinanceiro.tsx:823-824` (title="" / "Retenção"), `PlanejamentoCrescimento.tsx:298`. | Receber `pageLabel` e montar o título com ele, como ContasAReceber/SuperAdmin/PainelFinanceiro já fazem. No DFC, título "DFC" (o subtítulo já explica o regime de caixa). |
| 4 | `pages/ActiveClients.tsx:660-720` | abas | Abas com fundo cheio colorido por aba (`bg-violet-500` / `bg-amber-500` / `bg-rose-500 text-white shadow-lg shadow-*-500/25`) dentro de caixa `rounded-2xl backdrop-blur-md shadow-sm`. | `ABAS_CLS` + `abaCls()` (mover para um módulo comum e importar de ContasAReceber); a cor fica só no contador. |
| 5 | `components/DespesasPorCategoria.tsx:119-125` | abas / cor | Seletor de período (Ano/Jan…Dez) com ativo `bg-violet-500 text-white`, caixa `bg-black/20 border-white/5`, inativos `text-amber-400/80 hover:text-white` — só funciona no escuro. Aparece na aba Despesas do DFC. | Barra segmentada do DFC: caixa `bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5`, ativo `bg-white dark:bg-white/10 text-dark-text shadow-sm`; mês calculado em `text-amber-600 dark:text-amber-400`. |
| 6 | `pages/PlanejamentoCrescimento.tsx:300` | cabeçalho / texto | Subtítulo escrito em CAIXA ALTA na string e com ano fixo ("…REAIS DE 2026"). | `subtitle={\`Acompanhamento de metas vs resultados reais de ${year}\`}` + classe uppercase. |
| 7 | `pages/PlanejamentoCrescimento.tsx:305-326` | cabeçalho | Mês num `OptionPicker compact` e botão de atualizar `w-9 h-9 bg-dark-card border-white/10`; o resto do Financeiro usa o controle de mês `h-10 rounded-xl` com setas. | Copiar o controle de mês de `ContasAPagar.tsx:911-925`; atualizar com `h-10 rounded-xl border-slate-200 dark:border-white/10`. |
| 8 | `pages/PainelFinanceiro.tsx:182-191`, `SuperAdminDashboard.tsx:161`, `CrmFinanceiro.tsx:836-865` | formato | Controles do topo `h-[38px] rounded-lg`; Contas a Receber/Pagar, Extrato, Fluxo e DFC usam `h-10 rounded-xl`. | Escolher um (o novo é 38px/rounded-lg — então migrar os `h-10 rounded-xl`, ou o contrário) e registrar no padrão. |
| 9 | `pages/PlanejamentoCrescimento.tsx:323, 334, 370, 381, 468, 478, 488, 504, 535, 545, 555, 573` (12) | cor | `border border-white/10` sem par claro: no tema claro os cartões ficam sem borda. | `border-black/10 dark:border-white/10` (ou `gf-cartao`). |
| 10 | `pages/PlanejamentoCrescimento.tsx:457` | cor | Hex `border-[#7c3aed]/10 bg-[#7c3aed]/5 text-[#b392f0]` (texto lilás claro ilegível no tema claro). | `border-violet-500/10 bg-violet-500/5 text-violet-600 dark:text-violet-300`. |
| 11 | `components/FiltroCategoriasDRE.tsx:191, 198, 208, 211, 225, 230, 245` | cor | Filtro de categorias do Extrato desenhado só para o escuro: `text-slate-300`, `text-violet-300`, `bg-black/20`, `border-white/10`, `hover:bg-white/5`, `text-amber-400`, `text-slate-600`. No claro o botão fica com texto quase branco. | Pares claro/escuro: `text-slate-600 dark:text-slate-300`, `text-violet-600 dark:text-violet-300`, `bg-black/5 dark:bg-black/20`, `border-black/10 dark:border-white/10`, `hover:bg-black/5 dark:hover:bg-white/5`. |
| 12 | `components/SeletorCategoriaDRE.tsx:256` | cor | Menu da pílula de categoria com `border-white/10` sem par claro (o resto do arquivo já usa `border-black/10 dark:border-white/10`). | `border-black/10 dark:border-white/10`. |
| 13 | `components/AlertasCusto.tsx:27, 46-47` | cor / formato | Caixa `border-white/10` sem par claro; seletor de mês é `<select>` nativo `bg-black/20 border-white/10` (lista do SO, fundo escuro no tema claro). | `ThemedDropdown` (usado em ContasAPagar.tsx:259 e 976) ou `OptionPicker`; borda `border-black/10 dark:border-white/10`. |
| 14 | `components/DespesasPorCategoria.tsx:99, 215, 272, 290, 303` | cor | `border-white/10`/`border-white/5` sem par, `text-amber-300` no aviso Marvee, input `bg-black/20` — popup de lançamentos ilegível no claro. | Mesmos pares do #11; aviso `text-amber-700 dark:text-amber-300`. |
| 15 | `pages/ContasAReceber.tsx:700-712, 868-872, 1653, 1682` (13 ocorrências) | cor | Régua de cobrança com hex em classe arbitrária (`bg-[#2dd4bf]`, `#f59e0b`, `#f87171`, `#a78bfa`, `#fb923c`). | Paleta Tailwind: `teal-400`, `amber-500`, `rose-400`, `violet-400`, `orange-400` (mesmos tons). |
| 16 | `pages/ActiveClients.tsx:1329-1335` | cor | Motivos de saída (popup de churn): cada chip selecionado vira cor sólida diferente — blue-500, rose-500, orange-500, red-600, purple-500, cyan-500, slate-600. | Seleção única: `bg-violet-500/10 border-violet-500/40 text-violet-600 dark:text-violet-300`, ou `PilulaTag` com bolinha da cor. (Mesmo padrão em `ArchiveClientModal.tsx:135`.) |
| 17 | `pages/CrmFinanceiro.tsx:262` | cor | Selo "Arquivado" `bg-slate-800 text-white` fixo. | `bg-slate-500/15 text-slate-600 dark:text-slate-300` (pílula). |
| 18 | `pages/FinanceiroDashboard.tsx:821, 829, 850` | cor | Popup do dia: `divide-white/5` e `hover:bg-white/[0.02]` só escuro (lista de dias futuros). | `divide-slate-100 dark:divide-white/5`, `hover:bg-slate-50 dark:hover:bg-white/[0.02]` (como já está em 867-874). |
| 19 | `pages/ActiveClients.tsx:759` | formato | Tabela em `rounded-3xl … shadow-2xl backdrop-blur-md` logo abaixo dos cartões `gf-cartao` (22px, sombra longa) — raio e sombra diferentes lado a lado. | `gf-cartao overflow-hidden`. |
| 20 | `pages/FinanceiroDashboard.tsx:310` | formato | Estado de erro em `rounded-3xl shadow-2xl border-red-200`. | Cartão neutro: `gf-cartao p-6` + `AlertTriangle` rose + frase. |
| 21 | `pages/CrmFinanceiro.tsx:952` | formato | Colunas do kanban `rounded-3xl`, cartões `rounded-xl`, modais 22px. | `rounded-[22px]` nas colunas (baixo; confira contra o Comercial, que é o molde). |
| 22 | Modais: `ContasAReceber.tsx:835/1563/1644` (rounded-2xl) × `1301/1530` (rounded-[22px]); `ModalConciliacao.tsx:192`, `DespesasPorCategoria.tsx:271`, `ActiveClients.tsx:994`, `PlanejamentoCrescimento.tsx:611` (rounded-3xl); demais rounded-2xl | popup / formato | Três raios de modal no grupo; dentro de Contas a Receber há dois. | `rounded-[22px]` em todos (= `.modal-container` e `.gf-cartao`). |
| 23 | `components/ModalConciliacao.tsx:192`, `components/DespesasPorCategoria.tsx:271` | popup / cor | Container do modal em `bg-dark-bg` (cor do fundo da página), não `bg-dark-card`. | `bg-white dark:bg-dark-card`. |
| 24 | Todos os modais exceto `ModalConciliacao` e o popup de `DespesasPorCategoria` (ver inventário: 25 de 27) | popup | **Esc não fecha.** | `useEffect` com `keydown` Escape (copiar `ModalConciliacao.tsx:148-152`) — ou, melhor, pôr Esc no `ui/Modal.tsx` e migrar. |
| 25 | `components/CrmChecklist.tsx:139, 284, 454, 693`; `pages/PlanejamentoCrescimento.tsx:610` | popup | Clique fora não fecha (overlay sem `onClick`). | `onClick={e => e.target === e.currentTarget && fechar()}` no overlay. |
| 26 | `pages/Extrato.tsx:873, 1872, 2090`; `FinanceiroDashboard.tsx:749`; `DespesasPorCategoria.tsx:270`; `CrmFinanceiro.tsx:1111`; `CrmChecklist.tsx:139, 284, 454, 693`; `PlanejamentoCrescimento.tsx:610` (11) | animação | Modal sem animação de entrada (aparece seco). `PlanejamentoCrescimento:610` tem `transition-opacity` sem nada que a acione. | `motion.div` com `initial={{opacity:0, scale:.95}} animate={{opacity:1, scale:1}} transition={{duration:.2}}` — ou `ui/Modal`. |
| 27 | `pages/ContasAReceber.tsx:836-838` (+1302, 1531, 1564, 1645); `ActiveClients.tsx:990-993` (spring 400/30) | animação | Entrada mais forte que a do padrão: `scale .92 + y 20` em 0,3 s (CR) e mola (AC). | `scale .95`, sem `y`, 0,2 s. |
| 28 | `components/ModalConciliacao.tsx:2` | animação | Importa `framer-motion`; o resto do grupo usa `motion/react`. Montado sem `AnimatePresence` em `Extrato.tsx:2145` → sem saída. | `motion/react`; envolver em `AnimatePresence`. |
| 29 | `pages/ActiveClients.tsx:585-588, 807` | animação | `rowFadeIn` com `animationDelay: idx*0.04s` por linha: com ~75 clientes a última linha aparece ~3 s depois, e refaz a cada busca/troca de aba. | Teto no atraso: `Math.min(idx, 12) * 0.03`s, ou animar só o `tbody`. |
| 30 | `pages/ContasAReceber.tsx:83` (1200 ms), `ContasAPagar.tsx:129` (1000 ms), `FinanceiroDashboard.tsx:724-726` (recharts 1000 ms + 300 ms) | animação | Contadores/gráficos acima de 500 ms. | 600 ms no `useSpring`; `animationDuration={600}`. (Baixo.) |
| 31 | `pages/ContasAPagar.tsx:243, 346, 409, 474, 1010` | animação | Overlay é `div` comum: na saída o painel anima e o escuro some de uma vez. | Overlay em `motion.div` com `exit={{opacity:0}}` (como `ContasAPagar.tsx:1503`). (Baixo.) |
| 32 | `pages/FinCategories.tsx:447` | carregamento | Spinner com `border-3` — classe que não existe no Tailwind (escala 0/2/4/8) → largura 0, **spinner invisível**: a árvore fica em branco enquanto carrega. | `<LoadingSpinner size="md" />`. |
| 33 | `pages/DreDashboard.tsx:127`, `pages/DreDespesas.tsx:76` | carregamento | "Carregando…" em texto cru. | `<div className="py-20 flex justify-center"><LoadingSpinner size="md" /></div>`. |
| 34 | `ContasAReceber.tsx:770, 1664, 1962 (rose), 2449`; `ContasAPagar.tsx:1122, 1400`; `FinanceiroDashboard.tsx:812-813`; `CrmChecklist.tsx:622-623` (8 spinners `border-4 … animate-spin`) + `Loader2` solto em `DrePanel.tsx:305`, `DreFechamento.tsx:196`, `DespesasPorCategoria.tsx:309`, `ModalConciliacao.tsx:222`, `ContasAPagar.tsx:1522`, `Extrato.tsx:914` (6) | carregamento | Carregamento de seção com spinner próprio (um deles rosa). | `LoadingSpinner size="md"` centralizado. Spinners de 12–16 px dentro de botões podem ficar. |
| 35 | `pages/ContasAReceber.tsx:142-148` → renderizados em `2170, 2528, 2598` | vazio / ícone | Emoji como ícone da forma de pagamento (⚡ 📄 💳 🏦 📁) nas tabelas de Inadimplentes e Recebidas. | Lucide: `Zap`, `FileText`, `CreditCard`, `Landmark`, `Folder` em `size={12}`. |
| 36 | `pages/Extrato.tsx:438`; `components/SeletorCategoriaDRE.tsx:249`; `components/FiltroCategoriasDRE.tsx:180, 230` | vazio / ícone | "⚠️" emoji em "Sem categoria" — aparece em cada linha sem categoria do Extrato e da Conciliação. | `<AlertTriangle size={11} />`. |
| 37 | `pages/ContasAPagar.tsx:140, 143, 822-823, 1333-1334` | vazio / ícone | "✓ Pago", "⚠ Atrasado", "✓ conferida", "⚠ soma…" com caracteres unicode nas pílulas. | `<Check size={11}/>` / `<AlertTriangle size={11}/>` dentro da pílula. |
| 38 | `pages/Extrato.tsx:1804` ("✕ Cancelado"); `PlanejamentoCrescimento.tsx:626` (botão fechar = "✕" texto) | vazio / ícone | Caractere no lugar de ícone. | `<X size={11}/>` na pílula; `<X size={18}/>` no botão. |
| 39 | `pages/CrmFinanceiro.tsx:423, 876, 958, 1122`; `components/CrmCommentHistory.tsx:327` | vazio / ícone | Coluna da Retenção nasce com emoji "📌" e o emoji aparece no cabeçalho e na pílula de etapa do histórico. | Default sem emoji (bolinha da `color`); manter o campo para quem quiser. (Baixo — confira com o Comercial.) |
| 40 | Código morto com emoji: `ContasAReceber.tsx:159-200` (CollapsibleGroup), `Extrato.tsx:453-550` (SubGroup/CollapsibleGroup), `FinanceiroDashboard.tsx:85-180` (StatCard/CollapsibleGroup) | vazio | Componentes legados nunca renderizados (`grep "<CollapsibleGroup"` = 0), com emoji e `border-white/10`. | Apagar. (Invisível ao usuário.) |
| 41 | `pages/FinanceiroDashboard.tsx:815-817`; `pages/ActiveClients.tsx:790-797` | vazio | Fluxo: "Nenhum lançamento neste dia" sem ícone, em negrito. Clientes: círculo `w-16 h-16` + título `text-lg font-bold` — mais pesado que o padrão. | Ícone lucide 28–32 px `text-slate-300 dark:text-slate-600` + frase `text-sm text-slate-500` (como `Extrato.tsx:1773-1775`). |
| 42 | `pages/ActiveClients.tsx:598` | botão | "Novo Cliente" em `bg-purple-600 … shadow-lg shadow-purple-600/20 px-6 py-3` — roxo diferente do violeta, sombra colorida e maior que os outros botões do topo. | `h-10 px-4 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold`. |
| 43 | `pages/Extrato.tsx:2133` (Importar OFX `bg-blue-600`), `1733` (botão azul), `2093` ("Sicredi" em azul) | botão | Primário azul. | `bg-violet-600 hover:bg-violet-700`; botão de abrir = secundário com borda. |
| 44 | `pages/Extrato.tsx:1143` ("Aplicar Regras Agora" `bg-emerald-600`) | botão | Primário verde. | `bg-violet-600 hover:bg-violet-700`. |
| 45 | `pages/ContasAPagar.tsx:437` | botão | "Salvar" do Editar Lançamento do Mês em `bg-emerald-600`; os outros dois "Salvar" do mesmo arquivo (322, 509) são violeta. | `bg-violet-600`. (`369` "Marcar como pago" em verde é semântico e pode ficar; idem `CrmChecklist.tsx:681` "Concluir saída".) |
| 46 | `components/CrmChecklist.tsx:718` ("Confirmar" aplicar modelo, emerald); `components/CrmCommentHistory.tsx:624` ("Salvar" promessa, `bg-amber-500 rounded-full h-6`) | botão | Confirmação/salvar em verde e âmbar. | `bg-violet-600`; o "Salvar" da promessa como `h-6 px-2 rounded-lg bg-violet-600`. |
| 47 | `pages/FinanceiroDashboard.tsx:518` | botão | "Consultar Fred" ativo com `shadow-lg shadow-violet-500/30`. | Ativo `bg-violet-500/10 border-violet-500/40 text-violet-600` (como "Arquivados" ativo em CrmFinanceiro:842). (Baixo.) |
| 48 | `pages/FinCategories.tsx:333-336` | cabeçalho | "Voltar" com `<svg>` inline em vez de lucide. | `<ChevronLeft size={16}/>`. (Baixo.) |
| 49 | `pages/DrePanel.tsx:257` | popup | Menu "Colunas" `absolute z-30` sem portal, `bg-[rgb(var(--dark-card))]` hex-ish. | `bg-dark-card`; z-50 (menu dentro da página). (Baixo.) |
| 50 | z-index do grupo | popup | Escala solta: modais em 50, 60, 100, 110, 150, 200, 300, 9990, 9999; menus em 100/101, 99990/99999, 100000. Funciona hoje porque o `<main>` não cria contexto de empilhamento, mas modal z-50 empata com o menu lateral (z-50) e só fica por cima pela ordem do DOM. | Fixar: modal `z-[9990]`, modal sobre modal `z-[9995]`, menu/dropdown em portal `z-[100000]`. |

### Contagem por categoria

| categoria | achados (linhas da tabela) |
|---|---|
| cor | 11 (#9-18, #15 conta 13 ocorrências) |
| formato | 6 (#1, #8, #19, #20, #21, #22) |
| cabeçalho / abas | 8 (#2-7, #48 + #3 cobre 7 páginas) |
| popup | 7 (#22-25, #49, #50 + inventário) |
| animação | 6 (#26-31) |
| carregamento | 3 (#32-34; #34 = 14 spinners) |
| vazio / ícone (emoji) | 7 (#35-41) |
| texto (inglês) | 0 |
| botão | 6 (#42-47) |
| `alert/confirm/prompt` nativos | 0 |

---

## 2. Inventário de popups / modais

Legenda: Esc = fecha com Escape; Fora = fecha com clique no overlay.

| # | arquivo:linha | modal | overlay | z | container | animação | portal | Esc | Fora |
|---|---|---|---|---|---|---|---|---|---|
| 1 | ContasAReceber.tsx:825 | Régua de Cobrança | `bg-black/60 backdrop-blur-sm` (motion) | 50 | `bg-white dark:bg-dark-card border-gray-200/white-10 rounded-2xl shadow-2xl max-w-5xl` | motion/react, scale .92 y20 0,3 s | não | não | sim |
| 2 | ContasAReceber.tsx:1291 | Configurações de disparo | idem | 50 | idem, `rounded-[22px]` max-w-md | idem | não | não | sim |
| 3 | ContasAReceber.tsx:1520 | Confirmar "disparar todos" | idem | 50 | idem, `rounded-[22px]` max-w-sm | idem | não | não | sim |
| 4 | ContasAReceber.tsx:1553 | Editar regra da régua | idem | 60 | idem, `rounded-2xl` max-w-lg | idem | não | não | sim |
| 5 | ContasAReceber.tsx:1634 | Detalhe por fase | idem | 50 | idem, `rounded-2xl` max-w-2xl | idem | não | não | sim |
| 6 | ContasAReceber.tsx:1757 | Menu da linha (disparo) | transparente | 99990/99999 | `bg-white dark:bg-dark-card rounded-xl shadow-xl` | nenhuma | sim | não | sim |
| 7 | ContasAPagar.tsx:243 | Nova/Editar conta | `bg-black/60 backdrop-blur-sm` (div) | 50 | `bg-dark-card border-black/10 dark:border-white/10 rounded-2xl shadow-2xl` | motion/react scale .96 | não | não | sim |
| 8 | ContasAPagar.tsx:346 | Marcar como pago | idem | 50 | idem max-w-sm (sem sombra) | idem | não | não | sim |
| 9 | ContasAPagar.tsx:409 | Editar lançamento (cartão) | idem | 50 | idem | idem | não | não | sim |
| 10 | ContasAPagar.tsx:474 | Editar lançamento do mês | idem | 50 | idem | idem | não | não | sim |
| 11 | ContasAPagar.tsx:1010 | Contas cadastradas | idem | 50 | idem max-w-4xl | motion/react scale .96 y10 | não | não | sim |
| 12 | ContasAPagar.tsx:1503 | Vincular pagamento | `bg-black/60 backdrop-blur-sm` (motion) | 50 | `bg-dark-card rounded-2xl` (sem sombra) | motion/react scale .95 | não | não | sim |
| 13 | Extrato.tsx:873 | Regras de conciliação | `bg-black/60 backdrop-blur-sm` | 9990 | `bg-white dark:bg-dark-card rounded-2xl shadow-2xl max-w-2xl` | nenhuma | sim | não | sim |
| 14 | Extrato.tsx:1872 | Detalhe da transação | idem | 9999 | idem max-w-lg | nenhuma | sim | não | sim |
| 15 | Extrato.tsx:2090 | Importar OFX | idem | 9999 | idem max-w-md | nenhuma | sim | não | sim |
| 16 | Extrato.tsx:2145 → ModalConciliacao.tsx:188 | Conciliar lançamentos | `bg-black/70 backdrop-blur-sm` | 9990 | **`bg-dark-bg`** `rounded-3xl` sem sombra, max-w-5xl | framer-motion scale .97, sem saída | sim | **sim** | sim |
| 17 | FinanceiroDashboard.tsx:749 | Movimentações do dia | `bg-black/50 backdrop-blur-sm` | 9999 | `bg-white dark:bg-dark-card rounded-2xl shadow-2xl` | nenhuma | sim | não | sim |
| 18 | DespesasPorCategoria.tsx:270 (aberto por DespesasPorCategoria e AlertasCusto) | Lançamentos da categoria | `bg-black/70 backdrop-blur-sm` | 9990 | **`bg-dark-bg` `border-white/10`** `rounded-3xl` | nenhuma | sim | **sim** | sim |
| 19 | SeletorCategoriaDRE.tsx:252 | Menu de categoria | — | 100000 | `bg-dark-card border-white/10 rounded-xl shadow-2xl` | nenhuma | sim | sim | sim |
| 20 | FiltroCategoriasDRE.tsx:204 | Filtro de categorias | — | 100000 | idem | nenhuma | sim | sim | sim |
| 21 | ActiveClients.tsx:981 | Upload de contrato | `bg-black/50 backdrop-blur-sm` | 300 | `bg-white dark:bg-dark-card rounded-3xl shadow-2xl` | motion/react mola, scale .92 y16 | não | não | sim |
| 22 | ActiveClients.tsx:1085 | Menu da linha | transparente | 100/101 | `bg-white dark:bg-dark-card rounded-xl shadow-2xl` | nenhuma | não | não | sim |
| 23 | ActiveClients.tsx:1173 | Prévia de imagem | `bg-slate-900/20 dark:bg-black/40` (quase sem escurecer no claro) | 200 | imagem `rounded-xl` | motion/react scale .9 | não | não | sim |
| 24 | ActiveClients.tsx:1197 | Prévia de contrato (95vw×95vh) | idem | 200 | `bg-white dark:bg-dark-card rounded-2xl` | motion/react scale .9 | não | não | sim |
| 25 | ActiveClients.tsx:1259 | Registrar churn | `bg-black/50 backdrop-blur-sm` | 200 | `rounded-2xl shadow-2xl max-w-lg` | motion/react scale .95 y10 | não | não | sim |
| 26 | CrmFinanceiro.tsx:1154 (ui/Modal) | Popup do cliente (Histórico/Checklist) | `.modal-overlay` (rgba, **sem blur**) | 50 | `.modal-container` (**hex #1E1B2E / #1A1726**, 22px) | motion/react .25 s scale .95 y20 | não | não | sim |
| 27 | CrmFinanceiro.tsx:1297 (ui/Modal) | Nova tarefa | idem | 50 | idem | idem | não | não | sim |
| 28 | CrmFinanceiro.tsx:1111 | Nova/editar coluna | `bg-black/60 backdrop-blur-sm` | 9999 | `bg-white dark:bg-dark-card rounded-2xl shadow-2xl` | nenhuma | não | não | sim |
| 29 | ArchiveClientModal.tsx:63 (ui/Modal) | Arquivar cliente | `.modal-overlay` | 50 | `.modal-container` | motion/react | não | não | sim |
| 30 | CrmChecklist.tsx:139 | Editar modelo do checklist | `bg-black/60 backdrop-blur-sm` | 100 | `bg-white dark:bg-dark-card rounded-2xl shadow-2xl` | nenhuma | não | não | **não** |
| 31 | CrmChecklist.tsx:284 | Observação do item (modelo) | idem | 110 | idem | nenhuma | não | não | **não** |
| 32 | CrmChecklist.tsx:454 | Observação do item | idem | 200 | idem | nenhuma | não | não | **não** |
| 33 | CrmChecklist.tsx:693 | Confirmar aplicar modelo | idem | 150 | idem | nenhuma | não | não | **não** |
| 34 | CrmCommentHistory.tsx:667 | Lightbox de imagem | `bg-black/90 backdrop-blur-sm` (motion) | 100 | imagem `rounded-lg` | motion/react mola | não | não | sim |
| 35 | PlanejamentoCrescimento.tsx:610 | Editar meta/realizado | `bg-slate-950/60`, **sem blur** | 50 | `bg-white/95 dark:bg-dark-card/95 rounded-3xl shadow-2xl` | nenhuma | não | não | **não** |
| — | AlertaSaldo/confirmDialog/promptDialog (`lib/confirm`) usados em ContasAPagar, ContasAReceber, CrmFinanceiro, DreFechamento, FinCategories | diálogos de confirmação | fora deste grupo | | | | | | |

**Padrão predominante:** modal **feito à mão no próprio arquivo** — `fixed inset-0` + overlay `bg-black/60 backdrop-blur-sm` + container `bg-white dark:bg-dark-card rounded-2xl shadow-2xl`, **sem portal, sem Esc, fechando por clique fora** (≈ 25 dos 31 modais de tela cheia). Só 3 usam `ui/Modal.tsx` (CrmFinanceiro ×2, ArchiveClientModal), e esse componente também não tem Esc nem portal, e pinta o fundo com hex próprio em `index.html:110-181`. Animação: metade com motion/react (ContasAReceber, ContasAPagar, ActiveClients), metade sem nenhuma (Extrato, Fluxo, CrmChecklist, CrmFinanceiro coluna, Planejamento). z-index: duas famílias — 50/60 (ContasAReceber, ContasAPagar, Planejamento, ui/Modal) e 9990/9999 em portal (Extrato, Fluxo, DFC).

---

## 3. Os 5 problemas mais visíveis, em ordem

1. **Dois desenhos de cartão no mesmo menu Financeiro** (#1). Fluxo de Caixa, Dashboard Financeiro, Agenda Financeira e Clientes Ativos já estão no `gf-cartao` com `.numero`; Contas a Receber (`ContasAReceber.tsx:101`), Contas a Pagar (`ContasAPagar.tsx:521`), Extrato (`Extrato.tsx:1550`), DFC (`DrePanel.tsx:35`, `DreDashboard.tsx`) e Plano de Categorias (`FinCategories.tsx:351`) continuam no cartão antigo de borda fina com número sem a fonte mono. Trocar `CartaoNumero` e `KpiCard` resolve 18 cartões de uma vez.
2. **Título de página em três tamanhos** (#2): 4xl em Contas a Receber/Pagar, Agenda e Dashboard Financeiro; 3xl em Fluxo, DFC, Clientes Ativos, Retenção, Planejamento; 2xl no Extrato. Somado a isso, Fluxo de Caixa e DFC exibem os dois "Fluxo de Caixa" em destaque (`Dre.tsx:41`, `FinanceiroDashboard.tsx:508`).
3. **Tema claro quebrado nos filtros e popups do DFC/Extrato** (#5, #11, #13, #14): `FiltroCategoriasDRE.tsx:191`, `DespesasPorCategoria.tsx:119/271/290`, `AlertasCusto.tsx:46` foram desenhados só para o escuro (`text-slate-300`, `bg-black/20`, `border-white/10`, `<select>` nativo). Quem usa o claro vê texto quase branco e bordas que somem.
4. **Abas de Clientes Ativos com fundo colorido cheio + botão roxo com sombra** (#4, #42): `ActiveClients.tsx:660-720` (violeta/âmbar/rosa sólidos com `shadow-lg`) e `ActiveClients.tsx:598` (`bg-purple-600 shadow-purple-600/20`), ao lado da barra segmentada usada em Contas a Receber/Pagar/DFC. Na mesma tela, as linhas da tabela entram em cascata e a última aparece ~3 s depois (`ActiveClients.tsx:807`, #29).
5. **Emoji e caractere no lugar de ícone em linhas de tabela** (#35-37): ⚡📄💳🏦 na forma de pagamento (`ContasAReceber.tsx:142` → 2170/2528/2598), "⚠️ Sem categoria" em cada linha pendente do Extrato e da conciliação (`Extrato.tsx:438`, `SeletorCategoriaDRE.tsx:249`), "✓ Pago / ⚠ Atrasado" nas pílulas de Contas a Pagar (`ContasAPagar.tsx:140-143`).

Menção honrosa (não visível como desenho, mas como tela vazia): `FinCategories.tsx:447` usa `border-3`, que não existe — o spinner de carregamento do Plano de Categorias fica invisível (#32).
