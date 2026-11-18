# Migração de design — Hubs, Tarefas e Conteúdo (18/11/2026)

Base: `docs/auditoria-design-2026-11-18/GUIA-MIGRACAO.md` + `auditoria-hubs.md`. Só aparência; nenhum arquivo da base,
de servidor ou de outra área foi tocado. Todos os 18 arquivos da área respondem 200 no `curl` do dev.

## Resumo em números
- **Popups → `<Modal>`: 32** (TodoStaff 6, VisualHub 9, ImplementacaoIA 8, ListaPage 2, Estudio 2, TaskDetailModal 1,
  ListaTaskDetailModal 1, PostagensUI 1, EstudioConfig 1, MarketingAcoes 1 — o `ModalOverlay` que serve Adicionar/Editar
  Campanha e Registrar Ação). Todos ganharam portal, Esc, overlay/fundo do tema e animação de entrada.
- **Lightbox → `MediaLightbox`: 4** (TodoStaff 2, TaskDetailModal 1, ListaTaskDetailModal 1). `MediaLightbox` ganhou fade de entrada.
- **Títulos: 5** (TodoStaff, IdeaisCriativos, TodoPage, MeetingNotes, Estudio).
- **Abas → `<Abas>`: 7** (TodoStaff Tarefas/Ideias + visão Kanban/Lista/Pastas/Documento; TodoPage Ativos/Arquivadas +
  Kanban/Lista; ListaPage Visão geral/Quadro; EstudioConfig; filtro de status do MarketingAcoes).
- **Carregamento: 10 `CarregandoBloco`** (2 novos estados: TodoStaff e fila do Estúdio) + **8 mini-spinners feitos à mão → `Loader2`**.
- **Vazio → `EstadoVazio`: 4** (MeetingNotes, SolicitacoesTab, MarketingAcoes, Estúdio).
- **KPIs → `CartaoKpi`: 16 cartões** (TodoStaff 3+3, MeetingNotes 4, MarketingAcoes 5 via map, ListaPage `Kpi`).
- **Emojis de interface → lucide: 5** (📋 e 💡 das colunas vazias do TodoStaff; 📎 e ✓ do SolicitacoesTab; ✓ Salvo do ListaPage).
- **Cores**: ~230 linhas com `border-white/*`, `bg-white/*`, `hover:text-white` sem par claro corrigidas por script
  (VisualHub 91, ImplementacaoIA 63, TodoStaff 29, TodoPage 14, MarketingAcoes 14…); paleta `gray-*`/`purple-*` →
  `slate-*`/`violet-*` e pares fixos → tokens (`text-dark-text`, `bg-dark-card`) em TodoPage, TaskDetailModal (31) e MeetingNotes (77).
  Azul/fúcsia/sky de botões → violeta. `text-white` restante foi revisado um a um: sobra só sobre fundo sólido/escuro.
- **Animação**: `framer-motion` → `motion/react` em 8 arquivos; cascatas com teto (`Math.min(i, 8) * 0.04`);
  grupos do VisualHub/IA sem `scale` e 0,25 s; barras `transition-all duration-1000` → `transition-[width] duration-300`;
  TodoStaff: 61 `transition-all` → `transition-colors` (22 mantidos onde animam opacidade/escala/largura).
- **`alert`/`confirm` nativos → `toast`/`confirmDialog`: 5** (VisualHub 1, TaskDetailModal 3, Estúdio 1).

## Regra de Esc e clique fora (preservada)
- Clique fora: mantido onde já fechava. Onde não fechava (TodoStaff: Tags, Nova/Editar Tarefa, Nova Recorrente,
  Nova/Editar Ideia) → `fecharAoClicarFora={false}`. Tarefa, Recorrente e Ideia também `fecharComEsc={false}`
  (formulário que só fechava pelo X).
- Popup sobre popup: o de baixo desliga o Esc enquanto o de cima está aberto (`fecharComEsc={!previewFile …}`), senão
  um Esc fecharia os dois (o listener do Modal é no `window`). Campos que usam Esc para cancelar edição ganharam
  `data-segura-esc` (VisualHub, IA, TaskDetailModal, ListaTaskDetailModal).

## Por arquivo

### TodoStaff.tsx (+ IdeaisCriativos.tsx, ChamadosGrapehub.tsx)
- Título vem de `pageTitle || pageLabel || 'TODO Staff'` com destaque na última palavra (`lastIndexOf`). Corrige também
  título de uma palavra só, que antes saía duplicado ("Chamados Chamados"). Novo prop `pageLabel`.
- IdeaisCriativos recebe `pageLabel` e repassa (`'Ideais Criativos'` de reserva). ChamadosGrapehub já repassava.
- 6 popups → Modal; 2 previews de imagem → MediaLightbox.
- **Carregamento**: usa o `dbLoaded` que já existia — até a API responder, `CarregandoBloco` no lugar de KPIs/filtros/quadro
  (acabou o "Nenhum item" + emoji em todas as colunas). Vale para Chamados e Ideais Criativos.
- Abas Tarefas/Ideias → `Abas` sublinhado; visões → `Abas` segmentado. KPIs → `CartaoKpi` (Urgentes com `alerta`).
- Cabeçalho de coluna em degradê → `bg-x-500/10` chapado. Botão "Recorrente" e modal azul → violeta/secundário.
- Overlay de arraste sem sombra colorida e com `text-dark-text`.
- NÃO fiz: `catch` silenciosos (não há). O seletor de data (dia selecionado em violeta cheio) ficou — é seleção, não aba.

### TodoPage.tsx
- Título do `pageLabel` (reserva "To Do Gestor"), 2xl padrão. Kanban/Lista → `Abas` segmentado (ganhou rótulo);
  Ativos/Arquivadas → `Abas` sublinhado com contador. Pílula Otimizados/Pendentes em `bg-dark-card`; "〜" virou "·".
- `Loader2` 32px → `CarregandoBloco`. Colunas/grupos `rounded-3xl bg-dark-bg/40` → `bg-dark-card rounded-2xl`.
- Lote: `gray/purple/neutral` → tokens. Classes `darker:` do lote ficaram (inertes).

### TaskDetailModal.tsx
- Container → Modal (Esc desligado só enquanto o lightbox está aberto); lightbox → MediaLightbox.
- `alert`×2 → `toast.error`; `confirm` → `confirmDialog({ danger })`. `purple`/`gray` → `violet`/`slate`; avatar em degradê → `bg-violet-500/15`.

### ListaPage.tsx / ListaTaskDetailModal.tsx / PostagensUI.tsx
- Tags e Etapas → Modal; Nova postagem → Modal com título e rodapé padrão (`modal-btn-*`).
- Abas da página → `Abas`; spinner → `CarregandoBloco`; `Kpi` → `CartaoKpi`; `card` em `bg-dark-card`.
- Detalhe da postagem → Modal (o `exit` que não rodava deixa de importar); lightbox (texto escuro sobre preto no tema claro) → MediaLightbox.
- NÃO fiz: os 18 `catch { /* silent */ }` → `toast.error` (ver pendências). Emojis das etapas (`⬜🟡✅🔵`) são dados gravados
  pelo seed/criação — não mudei (seria mudar o que é salvo); a tela não os desenha.

### MeetingNotes.tsx
- Título "Notas de {pageLabel}" com destaque só na última palavra, 2xl. KPIs com hex inline → `CartaoKpi`.
- `LoadingSpinner md` → `CarregandoBloco`; vazio → `EstadoVazio`; spinner do botão Criar → `Loader2`; 77 `gray-*` → tokens/slate; cascata com teto.

### Estudio.tsx / EstudioConfig.tsx
- **EditorRoteiro intacto** (diff do bloco contra o backup: zero linhas).
- CTA em degradê fúcsia → `bg-violet-600 hover:bg-violet-700 rounded-[22px]`, sem sombra colorida.
- Assistente de geração → Modal com `fecharAoClicarFora={false}` e `fecharComEsc={false}` (antes clicar fora perdia o passo
  em andamento — mudança pedida pela auditoria; fecha pelo X). "Gasto por pessoa" → Modal normal.
- `window.confirm` do avatar de outro cliente → `confirmDialog`.
- Fila: novo `carregandoFila` (vira false no `finally` do fetch que já existia) → `CarregandoBloco` em vez de "Nenhum vídeo gerado ainda".
- Configurações → Modal com `fecharAoClicarFora={false}` (formulário com Salvar; Esc e X fecham). Abas → `Abas`;
  texto "Visível apenas para o super admin" → "Visível para o superadmin e a diretoria operacional".

### MarketingAcoes.tsx
- `ModalOverlay` → Modal (título e X padrão). KPIs → `CartaoKpi`; filtro de status → `Abas` segmentado; vazio → `EstadoVazio`.
- Lightbox de anexo **não** foi para MediaLightbox: o anexo é data URL e o "Baixar" do MediaLightbox passa por
  `/api/file-download?url=` — quebraria. Ficou à mão, em portal, mesmo fundo/z do MediaLightbox.

### VisualHub.tsx / ImplementacaoIA.tsx (em par)
- 9 + 8 popups → Modal. IA: detalhe da tarefa saiu de 860×560 px fixos para `max-w-5xl` × 90vh, igual ao VisualHub.
- Previews de arquivo (VisualHub, 2) → Modal 92vw × 86vh, mantendo setas/baixar próprios: os arquivos são data URL
  (`readAsDataURL`), então MediaLightbox não serve. Lightbox de imagem de comentário (1 em cada) ficou à mão pelo mesmo motivo.
- Tema claro: 91 + 63 linhas de borda/fundo/hover sem par → zero `border-white/*` sem par nos dois arquivos; nome do arquivo
  no preview e "Movendo grupo/tarefa…" → `text-dark-text`.
- Botões do topo fúcsia/sky → violeta. Spinner de página → `CarregandoBloco`; mini-spinners → `Loader2`.
- `alert` (renomear tarefa) → `toast.error`.
- NÃO fiz: emoji dos grupos de status (🔵🟠🏆📌) — vem de um seletor de emoji do usuário (conteúdo, pela regra do guia).
  Os 79 `catch` silenciosos (42 + 37) → ver pendências.

### SolicitacoesTab.tsx, TaskHistory.tsx, RichTextEditor.tsx, MediaLightbox.tsx
- Solicitações: spinner → `CarregandoBloco`, vazio `Inbox`, 📎/✓ → `Paperclip`/`Check`, autor com `text-teal-500`/`text-violet-500`.
- TaskHistory: "Carregando histórico..." → `Loader2` pequeno + texto cinza. RichTextEditor: borda com par claro.
- MediaLightbox: fade de entrada (motion/react).

## Pendências / decisões para o coordenador
1. **`catch` silenciosos → `toast.error`** (~100 no grupo: VisualHub 42, IA 37, ListaTaskDetailModal 10, ListaPage 8…):
   não fiz. Cada um precisa de mensagem própria e alguns são polling/fallback de carga onde o toast viraria ruído.
2. **Emoji dos grupos de status** (VisualHub/IA/Lista): mantido por ser escolha do usuário; trocar por bolinha só se o Jean quiser.
3. **Assistente do Estúdio**: agora só fecha pelo X (sem clique fora e sem Esc). Era o pedido da auditoria; confirmar.
4. Lightboxes de data URL (3) continuam à mão; para unificar, o MediaLightbox precisaria baixar data URL sem passar pelo proxy — é mudança de comportamento, não fiz.
5. Inputs `bg-dark-card` dos inputs dentro do Modal (que também é dark-card no escuro) ficam só com a borda — igual ao resto do app.

## tsc filtrado
`npx tsc --noEmit -p .` (saída em `tsc-hubs2.txt`, 60 linhas no projeto todo). Filtrado pelos 18 arquivos da área:

```
src/pages/MeetingNotes.tsx(477,30): error TS2552: Cannot find name 'setExpanded'.
```
Pré-existente (está igual no backup `../grapehub-backup-design-20261118/src/pages/MeetingNotes.tsx:486`) — não é aparência,
não mexi. A 1ª rodada acusou 5 erros novos de tipo no `onChange` das `Abas` (o genérico alargava para `string`);
corrigidos com `onChange={id => setX(id as …)}`. Zero erros novos.

## Não verificado
Só `curl` 200 e tsc. Não abri as páginas no navegador logado (Esc/clique fora, tema claro e o layout novo do detalhe da
Implementação de IA, que passou de 860×560 px para max-w-5xl × 90vh, merecem um olhar).
6. `MeetingNotes.tsx:477` usa `setExpanded`, que não existe (erro de tipo pré-existente; provável crash ao clicar ali).
