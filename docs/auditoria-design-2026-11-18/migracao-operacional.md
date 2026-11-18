# Migração de design — Operacional/Projetos (18/11/2026)

Só aparência. Nenhuma chamada de API, nome de estado ou regra de negócio mudou.
Todos os arquivos tocados responderam 200 no `curl http://localhost:3000/<arquivo>`.

## Números
- Popups migrados para `ui/Modal`: **30** (AlertaSaldo 1, ConfigProjetos 1, MetaAds 1, Dashboard Operacional 2,
  Onboarding 6 + Checklist Saída 6 + Checklist Integração 6, Playbook 3 via o `Modal` local que agora embrulha o
  base, ProjectsModule 7, ClientModal 1). Ficou de fora só a prévia de imagem do ProjectsModule (ver pendências).
- Títulos: 6 (ProjectsModule com `pageLabel`; Dashboard Operacional, Onboarding, 2 Checklists, Playbook, Gestor
  sem className de tamanho → 2xl padrão). Parceiros Squad usa `PageHeader`, que já está em 2xl pela base.
- Abas → `<Abas>`: 4 (Dashboard Operacional sublinhado; popup do projeto segmentado; ClientModal segmentado;
  filtro de status da pasta do Playbook segmentado).
- Carregamento: 15 spinners próprios trocados (CarregandoPagina/CarregandoBloco/LoadingSpinner); Playbook passou a
  mostrar carregamento até a resposta (antes os 10 nichos diziam "Clique para adicionar ações").
- Vazio: 4 (Dashboard comentários com emoji → EstadoVazio; popup "projetos por resultado"; ProjectsModule sem
  grupos; Parceiros Squad busca sem resultado).
- Emojis de interface removidos: ~35 ocorrências (grupos do Onboarding/Checklists, 10 ícones de nicho e 4 status do
  Playbook + 🔥, 👍 ×4, 🔒 ×3, ícones de plataforma de token ×4, ⚠, 🔍 📝, ℹ️ ×3).
- Cores: "Ok" unificado em emerald-500 (#10b981), Bom emerald-600, Ruim rose-500, Pausada amber-500, Testando
  sky-500 em Dashboard Operacional, aba Ações e Nichos, Consolidado (Risco de Churn, vivo), Parceiros Squad e
  ClientModal.

## Por arquivo

### src/components/AlertaSaldoBaixo.tsx
- Popup → `Modal` (`semCabecalho semPadding`, max-w-[480px]). **fecharAoClicarFora={false}**: antes não fechava
  clicando fora, e fechar adia o alerta (tem de ser gesto explícito). Esc = mesmo efeito do X (adiar 1 h).
- Tirado o `animate-in fade-in` (classe inexistente); a animação agora vem do Modal (entrada e saída).
- Botão "Abrir projetos": hover violet-700.
- z-index: era 9100; agora 1000 como todo popup. Como o portal entra no body na hora em que abre, ele fica por
  cima de quem já estava aberto (inclusive no "Testar popup" das Configurações).

### src/components/ConfigProjetosModal.tsx
- Popup → `Modal` (max-w-[520px]). Clique fora **fecha** (como antes).
- Loader2 solto → `CarregandoBloco`. Salvar: hover violet-700.

### src/components/MetaAdsModal.tsx
- Popup → `Modal` (max-w-[1200px], clique fora **fecha**, como antes). Fundo deixou de ser `bg-dark-bg`
  (cabeçalho fixo agora `bg-dark-card/95`).
- O documento do PDF (`MetaAdsReport`, fora da tela) foi para um `createPortal` no body, fora do popup, para não
  herdar transform/overflow do container animado.
- Spinner "Carregando dados..." → `CarregandoBloco`. 6 KPIs com acento único violeta (antes 6 cores). Erro em
  rose. Mantido o `KpiCard` próprio (não troquei por `CartaoKpi` para não mudar a densidade do popup).

### src/pages/DashboardOperacional.tsx
- 2 popups (Projetos por resultado, Detalhe do projeto) → `Modal`, clique fora **fecha** (como antes). Mantidos
  como `{cond && <Modal isOpen>}` porque o miolo depende do dado (sem animação de saída).
- Cartões internos dos popups: `bg-dark-card` (igual ao fundo do popup) → `bg-black/[0.03] dark:bg-white/5`;
  textos slate-300 fixos com par claro.
- Abas → `<Abas>` (sublinhado). Título sem className. Botão atualizar: gira só o ícone, borda com par claro.
- Cores de resultado: mapa próprio (#2ecc8f/#f74c4c/#f5c842/#4c8ef7) → padrão (#10b981/#f43f5e/#f59e0b/#0ea5e9;
  Bom #059669). **"Evolução da carteira" intacta** (já usava #10b981/#f43f5e; não mexi no que mostra).
- Emoji: 👍 → ThumbsUp preenchido; "🔍/📝" → EstadoVazio; "⚠" → AlertTriangle (caixa de erro em rose).
- Botões Salvar/Responder: violet-600/700, rounded-xl. Cascata dos comentários com teto (8).

### src/pages/OperacionalAcoesTab.tsx
- COR_OK azul (#38bdf8) → #10b981; COR_BOM → #059669 (para continuar distinto de Ok); selo "OK" sky → emerald.
- "Calculando…" → `CarregandoBloco`.
- A paleta categórica dos nichos (anel) ficou como estava.

### src/pages/OperacionalConsolidado.tsx
- Só o mapa de cores de resultado (usado pela aba Risco de Churn, viva) alinhado ao padrão.
- **Não apaguei** o `export default` morto nem `KpiCard`/`ResultBar`: `App.tsx` ainda importa o default
  (linha 37). Apagar exige mexer no App (arquivo da base) — fica para o coordenador.

### src/pages/OnboardingOperacional.tsx, ChecklistSaida.tsx, ChecklistIntegracao.tsx (mesma correção nos três)
- `framer-motion` → `motion/react`.
- 6 popups cada → `Modal`:
  - Adicionar cliente: **fecharAoClicarFora={false}** (formulário — perderia o nome digitado).
  - Modelo padrão: **fecharAoClicarFora={false}** (edição só vale com "Salvar Modelo") e
    `fecharComEsc={!selectedItem}` (Esc com o item aberto fecharia os dois).
  - Item do modelo (aninhado): clique fora **fecha** (a edição já vai para o estado do modelo).
  - Detalhe da tarefa: **fecharAoClicarFora={false}** (formulário de dados do cliente com Salvar).
  - Editor de documento: **fecharAoClicarFora={false}** e **fecharComEsc={false}** (texto longo com Salvar).
  - Detalhe da subtarefa: clique fora **fecha** (salva sozinho); `fecharComEsc={!editingDoc}`.
- Emoji dos grupos de status → bolinha da cor do grupo; rótulo "⬆️📢 SUBIR CAMPANHA" → "SUBIR CAMPANHA"
  (só Onboarding). O campo `emoji` continua nos dados, só não é desenhado.
- Spinners `border-4/border-2 … animate-spin` → `CarregandoBloco`. Fantasma do arraste legível no claro.
- Título sem className. Cascata com teto (`Math.min(idx, 8) * 0.04`). Chevron do grupo vazio slate-400.
- Tema claro: `hover:bg-white/x`, `border-white/x`, `bg-white/5`, `hover:text-white` sem par → pares
  black/dark: (10 por arquivo). "ℹ️ Sobre o modelo" → ícone Info. Primários hover violet-700.

### src/pages/PlaybookAcoes.tsx
- `framer-motion` → `motion/react`.
- `Modal` local agora embrulha o `ui/Modal` (portal, Esc, animação de saída). EditModal (formulário):
  **fecharAoClicarFora={false}**; Comparar e Detalhe: clique fora **fecha** (como antes).
- Ícones de nicho emoji → lucide (Landmark, Building2, ClipboardList, Scale, ShieldCheck, Users, HeartPulse,
  Briefcase, Lock, Home; Folder de reserva). Status 🟢🟡🔴🔵 → bolinha; amarelo/vermelho/azul → amber/rose/sky
  (com par claro). 🔥 → Flame.
- `carregando` agora é usado: `CarregandoBloco` no lugar da grade até a resposta.
- Filtro de status na pasta → `<Abas variante="segmentado">` (antes ativo violeta cheio).
- "Pasta iOS" mantida (pode ser gosto do Jean), só com o mínimo da auditoria: raio 22 e 0,25 s.
- Botões primários sem sombra colorida, hover violet-700. Contratos `text-blue-300` (sumia no claro) →
  `text-sky-600 dark:text-sky-300`.

### src/pages/ProjectsModule.tsx
- `pageLabel` nas props → título (última palavra em destaque), reserva "Projetos & Parceiros".
- `if (isLoading)`: `modalOnly ? null : <CarregandoPagina/>`; e no modo `modalOnly` a raiz virou `contents`
  (antes desenhava um bloco `min-h-screen p-8` vazio embaixo da tabela de Parceiros Squad). Raiz `text-white` →
  `text-dark-text`.
- 7 popups → `Modal`:
  - Produto: clique fora **fecha** (edita campo a campo); `fecharComEsc={!productToDelete}`.
  - Cadastrar novo produto: **fecharAoClicarFora={false}** (formulário); `!overflow-visible` para o seletor de
    ação continuar saindo da caixa (comentário do próprio código).
  - Mudar grupo / Mudar de página: clique fora **fecha**; overlay e caixa próprios saíram.
  - Nova/Editar reunião, Novo parceiro (também `!overflow-visible`), Token: **fecharAoClicarFora={false}**
    (formulários).
  - Popup do projeto (já era ui/Modal): `fecharComEsc` desligado enquanto há outro popup por cima.
- Abas do popup do projeto → `<Abas variante="segmentado">` (mesmo desenho da barra compacta aprovada em 06/10,
  sem a pílula animada).
- Emoji: 👍 ×3 → ThumbsUp preenchido; 🔒 ×3 → Lock; plataforma do token 📘🔴🎵🔑 → Megaphone/Search/Music/KeyRound.
- Excluir (×2): `bg-rose-600 hover:bg-rose-700 rounded-xl`. Primários: hover violet-700, sem sombra colorida.
- Spinner `motion.div rotate` no "Salvar Nota" → Loader2. Cascata dos tokens com teto.
- Grupo: `rounded-3xl shadow-xl backdrop-blur` → `bg-dark-card rounded-2xl` com borda do tema. Cartão de produto
  sem `shadow-xl` e sem o degradê `before:`. NPS: `rounded-3xl` → 2xl, sem degradê no cabeçalho.
- Estado vazio quando não há grupo para mostrar (EstadoVazio FolderOpen).
- `gray-*` e classes de escuro duplicadas → slate. Nota interna `text-amber-100/80` (invisível no claro) com par.

### src/components/ClientModal.tsx
- Popup "Produto do cliente" → `Modal`, clique fora **fecha** (como antes). Popup do cliente:
  `fecharComEsc={!selectedProductView}`.
- Abas → `<Abas variante="segmentado">` — igual às do popup do projeto (irmãos ficam iguais).
- 3 spinners → `CarregandoBloco`. Pílulas de motivo de saída: fundo cheio + branco → `bg-X-500/10 text-X-600
  dark:text-X-400`, rounded-full. Resultado "OK" azul → emerald (Bom emerald-600).

### src/pages/ParceirosSquad.tsx
- 4 KPIs → `CartaoKpi` ("Atenção" com `alerta` quando > 0). Filtros e tabela: `bg-dark-card rounded-2xl` sem
  blur/sombra-2xl. Botão Atualizar legível no claro. Avatar sem degradê (violet-500/10). Linha "Nenhum parceiro
  encontrado". Cascata com teto. Cores de resultado alinhadas (Bom era violeta). Spinner → `CarregandoPagina`.

### src/pages/GestorDashboard.tsx
- "Carregando..." cru → `CarregandoPagina`; raiz `text-white` → `text-dark-text`; título sem `text-4xl`.
- Cartões → `CartaoKpi` ×3; pizza recharts → `Anel`; barras recharts → `BarrasPorCategoria`, dentro de `Cartao`.

### src/components/ClientesMapa.tsx
- Seletor Mapa/Satélite: ativo no estilo segmentado (não mais preto/branco cheio). `rounded-3xl` → 2xl.
  Loader2 → LoadingSpinner sm.

## O que NÃO fiz, e por quê
- **Botões sem ação**: "Novo status" (Onboarding e os 2 Checklists) e Filtro/Download (Parceiros Squad)
  continuam sem `onClick`. Não inventei comportamento — decidir: implementar ou remover.
- **"Ok" no ProjectsModule é âmbar** (`projectResults`: OK = bg-amber-500, Bom = emerald-500, Testando = blue).
  Não mudei: é a tela de trabalho diário e a cor carrega significado ("meh"). Com isso, Ok é verde no Dashboard/
  Parceiros/ClientModal e âmbar no Projetos. Decidir se Projetos segue o padrão.
- **Constante única de cores de resultado**: a auditoria sugeria exportar de `graficos.tsx`/`src/lib`. Não criei
  (graficos é da base); os valores ficaram iguais, copiados em 5 arquivos.
- **Prévia de imagem** do ProjectsModule (z-2000, motion.img solto): não migrei — não é caixa; sem Esc.
- **Pasta iOS** do Playbook: não virou Modal (não fecha com Esc). Só raio/tempo.
- **OperacionalConsolidado**: código morto não apagado (App.tsx importa o default).
- **ProjectTasks.tsx** (morto) e **MetaAdsReport.tsx** (documento do PDF): não tocados.
- `SingleDatePicker` próprio nos 3 (duplica `ui/DatePicker`): troca muda comportamento de calendário; não fiz.
- `KpiCard` do MetaAds não virou `CartaoKpi` (só acento único).
- Esc com popups empilhados: o `ui/Modal` ouve Esc no `window` e cada popup aberto reage — com dois abertos, Esc
  fecharia os dois. Contornei desligando o Esc do de baixo (`fecharComEsc={!filhoAberto}`) nos casos que achei;
  o ideal é a base fechar só o de cima (pilha) — sugestão para o coordenador.
- Popups com `{cond && <Modal>}` (dado só existe aberto) perderam a animação de SAÍDA (entrada continua).

## tsc
1ª rodada (`tsc-operacional.txt`, 102 linhas no projeto): 3 erros NOVOS meus, todos o mesmo — `onChange={setX}`
no `<Abas>` (o tipo do id é inferido como `string`) em ClientModal:1004, DashboardOperacional:1273 e
PlaybookAcoes:1724. Corrigido com `onChange={(id) => setX(id as typeof x)}`.
2ª rodada (`tsc-operacional-2.txt`, 93 linhas): nos arquivos da área sobra só
`ParceirosSquad.tsx(55,54) TS2367` (comparação `role === 'admin'`), **pré-existente** (linha fora do meu diff).
(`ArchiveClientModal.tsx` aparece no filtro por casar "ClientModal", mas não é da área.)

Verificação visual no navegador: **não feita** (só curl 200 + tsc).
