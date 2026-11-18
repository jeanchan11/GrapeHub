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
