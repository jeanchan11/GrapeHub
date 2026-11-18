# Migração de design — Financeiro e Clientes (18/11/2026)

Só aparência. Nenhum cálculo, filtro, query, chamada de API, ordem de dados ou número exibido foi alterado.
Todos os 23 arquivos responderam 200 no curl do servidor de dev depois de cada edição.
Não houve verificação visual no navegador (o app exige login Firebase) — conferir na tela.

## Números

| item | qtde |
|---|---|
| Popups de tela cheia migrados para `ui/Modal` | 28 (ContasAReceber 5, ContasAPagar 6, Extrato 3, ModalConciliacao 1, FinanceiroDashboard 1, DespesasPorCategoria 1, ActiveClients 4, CrmFinanceiro 1, CrmChecklist 4, CrmCommentHistory 1, PlanejamentoCrescimento 1) |
| Títulos | 3 tamanhos explícitos removidos (FinCategories 4xl, Extrato 2xl explícito); `pageLabel?` opcional acrescentado em 7 páginas (ContasAPagar, Extrato, FinanceiroDashboard, Dre, ActiveClients, CrmFinanceiro, PlanejamentoCrescimento), com o título atual como reserva |
| Abas de página → `ui/Abas` | 4 barras (Dre, ContasAReceber principal, ContasAPagar principal, ActiveClients) |
| Cartões KPI → `CartaoKpi` | 34 (CartaoNumero 14, KpiCard do ContasAPagar 7, Extrato 4, DrePanel 6 — via componente —, DreDashboard 4, FinCategories 4; os 3 do ContasAPagar Cartões contam no 7) |
| Spinners próprios / "Carregando…" → CarregandoPagina/CarregandoBloco | 23 |
| Estados vazios → `EstadoVazio` | 20 |
| Emojis/caracteres de interface → lucide | 15 locais (⚡📄💳🏦📁 forma de pagamento, ⚠️ Sem categoria ×4, ✓/⚠ pílulas e conferência ×4, ✕ Cancelado, ✕ fechar, emojis por categoria no pill do Extrato) |
| Cores (hex, tema claro, botões fora do violeta) | ~70 classes |

## Por arquivo

### src/pages/ContasAReceber.tsx
- 5 modais → `Modal` (Régua, Configurações, Confirmar disparar, Editar regra, Detalhe por fase). Clique fora mantido (todos fechavam). Esc agora fecha.
- `CartaoNumero` reescrito por dentro sobre `CartaoKpi` (assinatura igual, 14 chamadas intactas). Ícone/cor saíram (o padrão não tem); clique, sinal pulsante e `alerta` ficaram. Prop nova `moeda` reduz a fonte do valor em reais (clamp 22–34px) para não cortar dígito em 4 colunas.
- Abas principais (Cobranças / Inadimplentes) → `Abas` com contador em alerta. Sub-abas continuam segmentadas (já eram iguais ao `segmentado`).
- Forma de pagamento: emojis → `Zap`, `FileText`, `CreditCard`, `Landmark`, `Folder`.
- Hex da régua (#2dd4bf, #f59e0b, #f87171, #a78bfa, #fb923c) → teal-400, amber-500, rose-400, violet-400, orange-400.
- 4 spinners → CarregandoBloco; 3 vazios → EstadoVazio. CountUp 1200 → 600 ms.
- Código morto `CollapsibleGroup` (com emoji) apagado.
- NÃO fiz: menu da linha em portal (é menu, não popup); "Disparar Fila"/"Retomar Régua" verde ficaram (semântico); controle de mês h-10.

### src/pages/ContasAPagar.tsx
- 6 modais → `Modal` (Nova/Editar conta, Marcar pago, Editar lançamento cartão, Editar lançamento do mês, Contas cadastradas, Vincular). Clique fora mantido.
- `KpiCard` reescrito sobre `CartaoKpi` (7 cartões); prop `texto` no "Período".
- Abas Contas a Pagar / Cartões → `Abas`. Seletor de cartão segue segmentado.
- "✓ Pago"/"⚠ Atrasado" → Check/AlertTriangle; "✓ conferida"/"⚠ soma…" da lista de importações → ícone.
- Salvar do "Editar lançamento" (cartão) emerald → violeta. CountUp 1000 → 600 ms; cascata da lista limitada a 12.
- NÃO fiz: `· ✓ conferida…` / `· ⚠ importada…` na mensagem do upload (é texto montado numa string de estado — mudar exigiria mexer no estado); "× Cancelado", "~ Parcial", "● Hoje" (caracteres tipográficos, não emoji — dá para trocar depois).

### src/pages/Extrato.tsx
- 3 modais → `Modal` (Regras de conciliação, Detalhe da transação, Importar OFX).
- 4 cartões → `CartaoKpi` (skeleton de carregamento preservado; "pares identificados" virou pílula).
- Título sem className (2xl padrão); `pageLabel?` opcional.
- ⚠️ Sem categoria → AlertTriangle; emojis por categoria no pill removidos (o nome já identifica); ✕ Cancelado → X.
- Botões: Aplicar Regras (emerald), Importar (azul) → violeta; "Importar OFX" azul → secundário; "Sicredi" e caixa de arquivo azul → violeta.
- Código morto `SubGroup`/`CollapsibleGroup` apagado.

### src/components/ModalConciliacao.tsx
- → `Modal` (portal, `bg` do tema em vez de `bg-dark-bg`, rounded do padrão). Listener de Esc próprio removido (o Modal faz). `framer-motion` → `motion/react`. Spinner/vazio padronizados.

### src/pages/FinanceiroDashboard.tsx (Fluxo de Caixa)
- Popup do dia → `Modal`; `divide-white/5` e `hover:bg-white/[0.02]` com par claro; spinner/vazio padronizados.
- Erro em `gf-cartao` + AlertTriangle. "Consultar Fred" ativo sem sombra violeta. Recharts 1000 → 600 ms. CarregandoPagina.
- Código morto `StatCard`/`CollapsibleGroup` apagado. `pageLabel?` opcional (reserva "Fluxo de Caixa").

### src/pages/PainelFinanceiro.tsx / src/pages/SuperAdminDashboard.tsx
- CarregandoPagina; vazios → EstadoVazio. NÃO fiz: controles `h-[38px] rounded-lg` × `h-10 rounded-xl` (#8 — decisão do coordenador).

### src/pages/Dre.tsx
- Abas → `Abas` (DFC, Dashboard, Despesas com contador em alerta, Fechamento). Título reserva passou de "DFC / Fluxo de Caixa" para **"DFC"** (audit #3: o destaque repetia o do Fluxo de Caixa); `pageLabel?` opcional.
- Perdido: o `title` (dica) do contador de alertas — o `Abas` não tem dica.

### src/pages/DrePanel.tsx
- `KpiCard` sobre `CartaoKpi` (6 indicadores; `accent="rose"` continua = alerta). Spinner → CarregandoBloco. Menu "Colunas" z-30 → z-50.
- NÃO fiz: trocar `dark:bg-[rgb(var(--dark-card))]` por `bg-dark-card` (#49) — o comentário do arquivo diz que `dark:bg-dark-card` ganha `position: relative` no index.html e soltaria o menu absoluto.

### src/pages/DreDashboard.tsx / DreDespesas.tsx / DreFechamento.tsx
- 4 cartões → `CartaoKpi`; painéis em `gf-cartao`; "Carregando…" em texto → CarregandoBloco; vazios/erro → EstadoVazio. DreFechamento: Loader2 → CarregandoBloco, detalhe do mês em `gf-cartao`.

### src/components/DespesasPorCategoria.tsx
- Popup de lançamentos → `Modal` (Esc próprio removido). Cartão em `gf-cartao`. Seletor de período no desenho segmentado (sem violeta cheio; mês calculado em amber-600/400). Todos os `border-white/x`, `text-amber-300`, `bg-black/20`, hovers com par claro.

### src/components/AlertasCusto.tsx
- `<select>` nativo → `ThemedDropdown`; borda e cores com par claro.

### src/components/SeletorCategoriaDRE.tsx / FiltroCategoriasDRE.tsx
- ⚠️ → AlertTriangle; todas as classes só-escuro com par claro (`text-slate-300`, `text-violet-300`, `bg-black/20`, `border-white/10`, `hover:bg-white/5`, `text-amber-400`, `text-slate-600`).

### src/pages/FinCategories.tsx
- Título sem `text-4xl`; 4 cartões → `CartaoKpi`; spinner `border-3` (invisível) → CarregandoBloco; vazio → EstadoVazio; "Voltar" com ChevronLeft.

### src/pages/ActiveClients.tsx
- Abas coloridas → `Abas` (contador em Ativos/Retenção; o card "Assinaturas Ativas" do superadmin ficou ao lado).
- 4 modais → `Modal` (Upload de contrato, Prévia de imagem, Prévia de contrato, Churn). Clique fora mantido.
- Cascata das linhas limitada (`min(idx,12) × 0,03 s` — antes a 75ª linha entrava em ~3 s).
- "Novo Cliente" roxo com sombra → violeta h-10. Tabela em `gf-cartao`. Vazio/carregando padronizados.
- Motivos de saída: uma cor sólida por motivo → seleção única violeta clara. Texto `text-slate-300` das colunas de churn com par claro.
- NÃO fiz: botões INEVITÁVEL/EVITÁVEL (rosa/âmbar sólidos — semântico); menu da linha (é menu).

### src/pages/CrmFinanceiro.tsx (Retenção)
- Modal de coluna → `Modal`; CarregandoPagina; selo "Arquivado" sem `bg-slate-800 text-white`; colunas do kanban rounded-[22px]; `pageLabel?` opcional.
- NÃO fiz: default "📌" das colunas novas (#39) — é o valor gravado no banco ao criar coluna; trocar muda o que é salvo. Decidir com o molde do Comercial.

### src/components/CrmChecklist.tsx
- 4 popups → `Modal` com `fecharAoClicarFora={false}` (como pedido). Editor do modelo e editor de observação do modelo também com `fecharComEsc={false}` (formulários sem outro jeito de fechar antes). Spinner → CarregandoBloco. "Confirmar" aplicar modelo emerald → violeta.
- Mantido: "Concluir saída" verde (semântico).

### src/components/CrmCommentHistory.tsx
- Lightbox → `Modal` (antes era `fixed` z-100 dentro do popup do cliente, sem portal). Vazio → EstadoVazio. "Salvar" da promessa âmbar/rounded-full → violeta rounded-lg.
- Mantido: emoji da etapa na pílula (vem da coluna — conteúdo).

### src/components/ArchiveClientModal.tsx
- Motivos de saída com seleção única violeta (já usava `ui/Modal`).

### src/pages/PlanejamentoCrescimento.tsx
- Modal de edição → `Modal` com `fecharAoClicarFora={false}` (não fechava). "✕" → X lucide.
- Subtítulo sem caixa alta fixa e com o ano da tela (`${year}` em vez de "2026").
- 12 `border-white/x` com par claro; hex `#7c3aed`/`#b392f0` → violeta; painéis em `gf-cartao`; botão atualizar h-10 rounded-xl. CarregandoPagina. `pageLabel?` opcional.
- NÃO fiz: trocar o `OptionPicker` de mês pelo controle de setas (#7) — muda o controle de seleção, não só a aparência.

## Pendências / para o coordenador decidir
1. **App.tsx (base)**: passar `pageLabel={findPageLabel(menu, activePage)}` para ContasAPagar, Extrato, FinanceiroDashboard, Dre, ActiveClients, CrmFinanceiro e PlanejamentoCrescimento — os componentes já aceitam o prop, com o título atual como reserva.
2. **Esc em popups empilhados** (base `ui/Modal`): o listener é no `window` e usa `stopPropagation`, que não impede os outros listeners do mesmo alvo. Com popup sobre popup (Régua → Editar regra; Contas a Pagar não; Retenção → Lightbox), um Esc fecha os dois. Sugestão: `stopImmediatePropagation` ou pilha de modais no Modal.
3. **#8 altura dos controles** (38px rounded-lg × 40px rounded-xl) — não mexi.
4. **#39 emoji 📌 default de coluna** da Retenção — é dado salvo.
5. **Dre: título agora "DFC"** (reserva) em vez de "DFC / Fluxo de Caixa" — confirmar.
6. `CartaoKpi` não tem slot de ícone nem clique: os ícones coloridos dos cartões antigos sumiram em todos os KPIs; o clique dos cartões da régua foi mantido por um wrapper.

## tsc (filtrado pelos 23 arquivos)
`npx tsc --noEmit -p .` — saída em `tsc-financeiro.txt` (1ª) e `tsc-financeiro-2.txt` (depois da correção).
- 1ª rodada: 4 erros NOVOS, todos do `onChange` do `Abas` (T inferido como `string`) em ActiveClients, ContasAPagar, ContasAReceber, Dre → corrigidos com `id => setX(id as typeof x)`.
- 2ª rodada: 0 erros novos. Restam 4 pré-existentes (conferidos no HEAD/backup):
  - ArchiveClientModal.tsx(55) e CrmFinanceiro.tsx(1318): `user.name` não existe em `User`.
  - PlanejamentoCrescimento.tsx(206, 252): `string | number > number` (mesma expressão no backup, linhas 204/250).
