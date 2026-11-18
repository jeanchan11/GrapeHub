# Migração de design — src/pages/CrmComercial.tsx (fork A, 18/11/2026)

Só este arquivo. `curl http://localhost:3000/src/pages/CrmComercial.tsx` = 200 depois de cada bloco.
tsc completo não rodado aqui (fica com o coordenador). Diff: 242 linhas a mais, 324 a menos.

## Popups migrados para `<Modal>` (9 feitos à mão → Modal)

| popup | fecharAoClicarFora | por quê |
|---|---|---|
| Card do lead (`LeadDetailModal`) | true (padrão) | já fechava clicando fora. `semCabecalho semPadding`, `max-w-7xl`, `h-[90vh] !my-0`. Ganhou Esc, mas **Esc fica desligado enquanto houver popup interno aberto** (`popupInternoAberto`: nova atividade, sequência, modelo, padrão do checklist, detalhe da tarefa, reunião, imagem) e enquanto "Gerenciar modelos" está aberto por cima (prop nova `bloquearEsc`) — senão Esc fecharia o card junto. |
| Aplicar Sequência (dentro do card) | true | lista de escolha, já fechava |
| Selecionar modelo (dentro do card) | true | idem |
| Padrão de Tarefas / editor do checklist | **false** | formulário: fechar perderia a edição (antes fechava) |
| Detalhes da Tarefa | true | só leitura; mantido `{taskDetailPopup && <Modal isOpen>}` porque o miolo lê o objeto |
| Adicionar Reunião | **false** | formulário (antes fechava) |
| Visualizar imagem | true | já fechava; Modal sem caixa (`!bg-transparent !border-0 !shadow-none`) |
| Gerenciar Kanbans | true | já fechava; virou `title=` padrão. Input de renomear tem `data-segura-esc` (Esc cancela a edição sem fechar o popup) |
| Gerenciar modelos (tarefas recorrentes) | **false** | não fechava clicando fora — preservado. `fecharComEsc` só na lista (no editor perderia o que foi digitado) |
| Configurações do CRM | true | já fechava; cada bloco tem botão próprio de salvar. Virou `title`+`icon` padrão; z-[99999] → z-[1000] do Modal |

Modais que já eram `<Modal>` (7): só "Novo Lead" ganhou `fecharAoClicarFora={false}` (formulário de vários campos).
Nova Coluna / Editar Coluna / Novo Kanban (1–2 campos), Comentários, Histórico e Excluir Coluna seguem fechando clicando fora.

`PlainMenu` (menu do arquivo) ganhou `data-segura-esc` enquanto aberto: Esc fecha só o menu, não o popup em volta.

Não migrado: comemoração "NEGÓCIO GANHO" (exceção intencional) — só tirei o 🔥 do título.

## Abas
- Card do lead: 7 abas → `<Abas>` (sublinhado).
- Configurações do CRM: Webhook | Motivos de Perda → `<Abas>` (sublinhado). O estado aceita 'sequencias' (não exibido); mapeado para 'webhook' só na exibição.

## Título
- Página usa `PageHeader` (já 2xl via design-system). Nada a mudar.

## Carregamento / vazio
- Quadro: estado novo `carregandoQuadro` (useState(true) → false no `finally` do `fetchData` existente, ou no `fetchKanbans` quando não há kanban/erro). Mostra `<CarregandoBloco>` no lugar do quadro vazio só na 1ª carga.
- "Carregando anotações…" e "Carregando reuniões…" (Loader2 32px + texto) → `<CarregandoBloco />`.
- Vazios → `<EstadoVazio>`: "Nenhum modelo cadastrado", "Nenhum motivo cadastrado ainda." (era 📋).

## Cores / tema claro / botões
- `dark:border-[#1A1625]` ×6 e `dark:border-[#15121E]` ×2 → `dark:border-dark-card`; `bg-[#F8F9FA]` ×2 → `bg-slate-50`.
- Timeline: ~14 `style={{ color/background }}` inline → classes (`text-slate-400`, `text-slate-500 dark:text-slate-400`, `bg-violet-500/10`, `bg-emerald-500/10`/`bg-rose-500/10`, `bg-black/[0.03] dark:bg-white/[0.03]`).
- Configurações: `dark:border-[#2d2b3d]` ×4, `dark:text-[#6b7280|#4b5563|#9ca3af]` ×8 → tokens; 3 botões `style={{background:'#7c3aed'}}` → `bg-violet-600 hover:bg-violet-700`; borda inline do input de edição → `border-violet-600`; bolinha `#ef4444` → `bg-rose-500`.
- "Salvar URL" do webhook de formulário: azul → violeta (cartão, ícone, foco e hover também).
- Botões violeta-500 → violet-600/700 (Padrão de Tarefas, Novo Modelo, Criar/Salvar Modelo); hover azul do editar modelo → violeta.
- Divisor e borda do menu de perda `border-white/10` → `border-black/10 dark:border-white/10`; hover `hover:bg-white/5` → com variante clara.
- Anel de cor selecionada (Nova/Editar Coluna) `ring-white ring-offset-[#0A0A0A]` → `ring-violet-500 ring-offset-dark-card`.
- Cor de progresso de meta: vermelho `#ef4444` → `#f43f5e` (rose-500).
- Sombras coloridas removidas: Ganhar/Perda do card, "Adicionar" tarefa, botões de nota/reunião, Salvar Reunião, Concluir tarefa, ícones dos kanbans (`shadow-*-500/50`), pílulas da movimentação de ganho, hover das linhas de tarefa.
- Botões X dos popups: `p-2 rounded-lg text-slate-500 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5`.

## Emojis
- 💬 📝 📥 → `MessageCircle`, `FileText`, `Inbox`; 📋 (vazio) → `ClipboardList`; ✏️ 🗑 → `Pencil`, `Trash2`.
- "✨ Editar Integração/Roteamento" ×3 → ícone `Check` verde.
- "CONQUISTA! 🏆" → `Trophy` + texto; "Gatilho de WhatsApp acionado ✅" (texto de reserva na tela) sem emoji; "Configure em ⚙️" → texto; ✓/✕ da ligação → `Check`/`X`; "⏱ Duração" → "Duração"; 🔥 do nome do kanban comercial (Gerenciar Kanbans) removido; 🔥 da comemoração removido.

## Animação
- `framer-motion` → `motion/react`.
- Selo de ganho do card: `animate-pulse` removido.
- Contador do widget de meta: 2,5 s → 0,8 s.
- Cascata do quadro: `colIdx*0.07 + cardIdx*0.05` → `Math.min(i,8)*0.04` (colunas e cards).
- `animate-in … slide-in-from-top-2` ×3 (não funciona no CDN) removidos; os `animate-in zoom-in-95` dos popups saíram com a migração.
- Coluna do kanban `rounded-3xl` → `rounded-2xl`.

## O que NÃO fiz e por quê
- **"❌ Lead marcado como perdido"** (`handleLoseLead`): o texto é GRAVADO no histórico do lead (`/history`). O guia proíbe mudar o que é salvo — mantido.
- **Função de cor de meta copiada 3×** (aqui, CrmMetas, MetasPopup): extrair para `src/lib` exige arquivo novo fora da área — só troquei o vermelho por rose-500 aqui.
- Cores de etiqueta/origem/seletor de cor (`#3b82f6`, `#f97316`…): são dado/escolha do usuário, não tema.
- Sombras suaves do card ganho/perdido (`shadow-[0_4px_15px_rgba(...,0.1)]`): mantidas (tom 8–10%, não neon).
- `transition-all` restantes (48): nenhum em linha de tabela grande; não mexi.
- Não consegui conferir no navegador: o painel abre na tela de login (sem sessão). Só a compilação (curl 200).

## Pendências para o coordenador (base)
1. **Esc com popups empilhados**: `ui/Modal` registra o Esc no `window` e usa `stopPropagation`, que não impede outros listeners do mesmo `window`. O primeiro Modal aberto escuta primeiro, então Esc num popup por cima fecha o de baixo também. Contornei no card do lead (Esc desligado enquanto há popup interno), mas o mesmo acontece com o `confirmDialog` (`src/lib/confirm.tsx`, que também escuta Esc no window): Esc numa confirmação aberta sobre um Modal fecha o Modal junto. Correção certa é na base (pilha de modais ou `stopImmediatePropagation` + registro em captura pelo mais recente).
2. `NovaAtividadeModal` (Atividades.tsx, outra área) já está em `<Modal fecharAoClicarFora={false}>`; o card do lead considera ele no bloqueio de Esc.
