# Migração de design — Comercial, parte B (18/11/2026)

Arquivos: CrmMetas.tsx, MetasPopup.tsx, AIChat/AIChat.tsx, Atividades.tsx, Automacoes.tsx.
Todos devolvem 200 no `curl http://localhost:3000/<arquivo>`. tsc completo NÃO rodado (fica com o coordenador).

## src/pages/CrmMetas.tsx
- **Popup**: o wizard de meta (`fixed inset-0 z-50 bg-black/50`) virou `<Modal isOpen={showModal} semCabecalho semPadding maxWidth="max-w-lg" fecharAoClicarFora={false}>`.
  `false` porque o original NÃO fechava clicando fora e é formulário de 2 passos. Ganhou Esc, portal, desfoque e animação.
- **Título**: `SplitHeadline` sem `className`/`subtitleClassName` (padrão 2xl, `text-dark-text`).
- **Carregamento**: `LoadingSpinner` em div própria → `<CarregandoPagina />`.
- **Vazio**: bloco próprio → `<EstadoVazio Icone={Target} … acao={Criar primeira meta}>`.
- **Botões**: "Nova Meta" e "Criar primeira meta" → `designSystem.button.principal`; atualizar com borda `border-black/10 dark:border-white/10`.
- **Cartões**: `bg-white dark:bg-dark-card border-slate-200 dark:border-white/5` → `bg-dark-card border-black/10 dark:border-white/10`.
- **Números**: valor atual (`text-3xl`/`text-4xl font-black`) com classe `numero`.
- **Cor**: `getProgressColor` vermelho `#ef4444` → rose-500 `#f43f5e` (os outros três já eram emerald/amber/violet-500).

## src/components/MetasPopup.tsx
- **Popup 1 (Metas)**: overlay inline `rgba(0,0,0,.55)` + painel → `<Modal isOpen={isOpen} semCabecalho semPadding maxWidth="max-w-4xl" className="max-h-[85vh]" fecharComEsc={!showModal}>`.
  Clique fora: **true** (já fechava). Esc é desligado enquanto o wizard está aberto, para o Esc fechar só o de cima
  (sem isso os dois `keydown` no window fechariam os dois). Saída agora anima (antes sumia de golpe).
- **Popup 2 (wizard sobre o popup)**: → `<Modal isOpen={isOpen && showModal} semCabecalho semPadding maxWidth="max-w-lg" fecharAoClicarFora={false}>`.
  **Mudança de comportamento consciente**: o original fechava no clique fora; usei `false` pela regra do guia
  ("formulário em que fechar perderia o que foi digitado") e para igualar ao wizard idêntico de CrmMetas. Se o
  coordenador preferir preservar à risca, é trocar para `true`.
- **Abas**: Ativas | Arquivadas (pílulas à mão) → `<Abas variante="segmentado">`.
- **Carregamento**: spinner `border-4` + "Carregando metas..." → `<CarregandoBloco />`.
- **Vazio**: → `<EstadoVazio Icone={Archive|Target}>` com ação "Criar primeira meta" só nas ativas.
- **Botões/cores**: Nova Meta → `designSystem.button.principal`; X com `hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5`;
  `text-slate-900 dark:text-white` → `text-dark-text`; cartão `bg-black/[0.02] dark:bg-white/[0.03] border-black/10`,
  `transition-all` → `transition-colors`, `hover:shadow-lg` → `hover:shadow-md`.
- **Números**: `numero` no anel, na taxa de conversão e no valor atual.
- **Animação**: `framer-motion` → `motion/react`; contador do anel/taxa 2,5 s → 0,8 s; cascata dos cartões com
  `delay: Math.min(i, 8) * 0.04`.
- **Cor**: `#ef4444` → `#f43f5e` (mesma função de CrmMetas).

## src/pages/Atividades.tsx
- **Popup**: `NovaAtividadeModal` (overlay `rgba(0,0,0,.45)`, caixa `dark:bg-dark-bg/80` translúcida, `rounded-3xl`,
  `animate-in` que não funciona) → `<Modal isOpen semCabecalho semPadding maxWidth="max-w-lg" fecharAoClicarFora={false}>`.
  O componente continua sendo montado/desmontado pelo pai (`{showModal && …}`, inclusive em CrmComercial.tsx:2009),
  então passa `isOpen` fixo. **Mudança consciente**: o original fechava no clique fora; usei `false` por ser
  formulário (título, lead, observações). Esc e X fecham. Botão "Salvar" sem degradê (`bg-violet-600 hover:bg-violet-700`).
  Título do popup `text-xl` → `text-lg text-dark-text`.
- **Barra de vidro mantida** (`gh-barra-vidro`), como pedido.
- **Título**: `SplitHeadline` sem className (2xl).
- **Abas**: Lista | Calendário e Pendentes | Concluídas | Todas (esta com fundo em degradê violeta inline) →
  dois `<Abas variante="segmentado">`.
- **Botões**: "Nova Atividade" e "Criar atividade" (degradê inline + sombra violeta + `active:scale-95`) → `designSystem.button.principal`.
- **Carregamento**: spinner próprio + "Carregando atividades..." → `<CarregandoBloco className="py-24" />` (fica abaixo da barra, por isso bloco e não página).
- **Vazio**: → `<EstadoVazio Icone={CheckCircle2} …>` com o botão de criar.
- **Animação**: `@keyframes sectionExpand` (morto) removido; o recolher/expandir por `max-height` calculado virou
  `motion` com `height: 'auto'` (AnimatePresence, 0,25 s); cascata das linhas limitada a `Math.min(idx, 8)`.
- **Cartão**: `bg-white dark:bg-dark-card` → `bg-dark-card`; `transition-all` → `transition-colors`; sombra violeta do hover removida.
  Dia de hoje no calendário sem `shadow-violet-500/30`.

## src/pages/Automacoes.tsx
- **Vazio eterno**: o seletor de sequência mostrava "Carregando sequências..." para sempre quando não havia sequência.
  Novo `carregandoSeq` (`useState(true)`, vira false no `.finally` do fetch que já existia); vazio mostra
  "Nenhuma sequência criada. Crie uma em Sequências."
- **Título**: `SplitHeadline` sem className (era `text-3xl`).
- **Abas**: abas sublinhadas feitas à mão → `<Abas<TabMode>>` (sublinhado) com ícones LayoutGrid/Zap/History.
- **Resumo**: números com `numero`; faixa `bg-dark-card border-black/10 dark:border-white/10`. Não virou `CartaoKpi`
  (mudaria o layout da faixa de 3 números em linha para 3 cartões — fica para decisão).
- **Botões**: "Nova Automação" (topo e vazio) → `designSystem.button.principal`; Salvar do construtor sem `shadow-violet-500/20`.
- **Carregamento/vazio**: `LoadingSpinner md` → `<CarregandoBloco />` (2×); vazios de automações e de histórico → `<EstadoVazio>`.
- **Emojis**: "✓" (3×) → `<Check>`; "✓ sucesso"/"✗ erro" → `<Check>`/`<X>`.
- `framer-motion` → `motion/react`. Linhas do histórico `bg-dark-card border-black/10`.
- Não mexido: "Pipeline" (jargão aceito pela auditoria) e as cores `text-gray-900 dark:text-white` do construtor (funcionam nos dois temas).

## src/components/AIChat/AIChat.tsx
- **Popups (3)** → `<Modal semCabecalho semPadding>`:
  - Chat: `isOpen={open}`, `maxWidth="max-w-[1100px]"`, clique fora **true** (já fechava), `fecharComEsc={!showConfig && !showHistory}`.
  - Histórico: `isOpen={showHistory}`, `max-w-[600px]`, clique fora **true** (já fechava).
  - Configurar: `isOpen={showConfig}`, `max-w-[680px]`, clique fora **false** — formulário com 3 textos longos;
    o original fechava. Esc e Cancelar fecham. **Mudança consciente**, reverter = trocar para `true`.
  - O `keydown` próprio de "Esc em cascata" saiu: a cascata é feita pelo `fecharComEsc` do painel (desligado
    enquanto há popup por cima). Saiu também o `@keyframes ai-modal-in` e o `ReactDOM.createPortal` (o Modal já faz portal).
  - Altura do painel `92vh` → `calc(100vh - 120px)` (máx. 920) para caber com o respiro do Modal sem rolar.
- **Cores**: a paleta `c` passou a usar os tokens do tema para superfície e texto (`rgb(var(--dark-card))`,
  `rgb(var(--dark-text))`) — acompanha `dark` e `dark.darker`; borda do claro `rgba(0,0,0,.1)`.
  Histórico/Config: borda violeta .4 e cabeçalho violeta translúcido → borda `c.border`, sem faixa;
  textos e botões em `rgba(255,255,255,.3/.5)` fixos (sumiam no claro) → `c.subText`/`c.iconBtnColor`/`c.labelText`;
  linhas do histórico `c.border`/`c.configBg`; sugestões da tela inicial idem; violeta claro `#A78BFA`/`#c4b5fd`
  (pouco contraste no claro) → `#8b5cf6`; erro `#FCA5A5` → rose-500. Botão "Salvar configuração" e botão
  flutuante sem degradê nem sombra violeta (`#7c3aed`).
- **Emojis → lucide**: barra 🕐 ✏️ 🗑 ⚙ ✕ → History, SquarePen, Trash2, Settings, X; títulos "🕐 Histórico" e
  "⚙ Configurar" → ícone; 🗑 da sessão → Trash2; ✓ (financeiro e salvar) → Check; ⚠ → AlertTriangle; ➤ → SendHorizontal;
  ✕ do botão flutuante → X; ícone da área (💰 🤝🔥 📈 ⚙️ 🍇) → DollarSign, Handshake, TrendingUp, Settings, Grape.
- **O que ficou**: o componente continua em estilo inline decidido por `isDark` (converter tudo para classes seria
  reescrever ~600 linhas). A cor de cada especialista (`sectionMeta.color`: azul/vermelho/laranja/amarelo) ficou —
  é identidade da área, não superfície. O bloco de código do markdown (`pre` com fundo preto .35 e texto claro)
  ficou como estava.

## Não feito / para o coordenador decidir
1. **Wizard de meta duplicado** (CrmMetas × MetasPopup): não extraí componente — é refatoração. Os dois receberam
   as mesmas mudanças visuais.
2. **`getProgressColor` duplicada** (CrmMetas, MetasPopup e CrmComercial): só troquei o vermelho para rose-500 dentro
   de cada arquivo; não criei `src/lib` (fora da minha lista).
3. **Clique fora → `false` em 3 formulários que antes fechavam** (wizard do MetasPopup, NovaAtividadeModal,
   Configurar do AIChat), pela regra de formulário do guia. Se a regra for "preservar à risca", são 3 trocas para `true`.
4. **Esc em popups empilhados de outros arquivos**: `NovaAtividadeModal` é aberto de dentro do card do lead
   (CrmComercial.tsx:2009). Se o card do lead também virar `<Modal>`, o Esc fecha os dois (os dois escutam o window).
   Quem migrar o card deve passar `fecharComEsc={!<estado do popup de atividade>}` no card — o estado está em CrmComercial.
5. Resumo de Automações em `CartaoKpi` não feito (mudança de layout).
