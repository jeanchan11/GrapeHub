# Padrão de design do GrapeHub (referência para a auditoria, 18/11/2026)

Projeto: /Users/jeanchan/Desktop/backup-jean/Desktop/APLICAÇÕES/grapehub
Tailwind via CDN (config inline no index.html, darkMode: 'class'). Temas: html.light, html.dark, html.dark.darker.

## 1. Cores (tokens — o que É padrão)
- Fundo de página: `bg-dark-bg` (fica transparente dentro do app para mostrar o degradê roxo do fundo).
- Superfície de cartão/modal/menu: `bg-dark-card` (ou `.gf-cartao`). Hover: `bg-dark-card-hover`.
- Texto: `text-dark-text`; secundário `text-slate-500 dark:text-slate-400`.
- Bordas: `border-black/10 dark:border-white/10` (ou /5).
- Acento: violeta (`rgb(var(--accent-color))`, `violet-500/600`). Positivo emerald-500, negativo rose-500, alerta amber-500.
- **Fora do padrão**: cinza/azul fixos no escuro (`dark:bg-slate-800`, `bg-slate-900`, `bg-gray-900`, `bg-zinc-*`, `bg-neutral-*`), hex fixos de fundo (`bg-[#1a1a2e]`, `#1A1625`…), `text-white` fixo em superfície que também existe no tema claro, cores de marca de terceiros fora de contexto, gradientes chamativos em superfícies comuns.

## 2. Cartões e formatos
- Padrão novo: `Cartao` / `CartaoKpi` de `src/components/graficos.tsx` (classe `.gf-cartao` em `graficos.css`: cantos 22px, sem borda, sombra longa). Título do cartão em `text-[15px] font-semibold`, legenda `text-[12.5px]` cinza.
- Legado aceitável mas a migrar: `bg-dark-card border border-white/10 rounded-2xl p-6` com título `text-sm font-bold` e rótulos `text-[10px] font-bold uppercase tracking-widest`.
- Fora do padrão: cantos misturados na mesma tela (rounded-md / rounded-lg / rounded-3xl / rounded-[2.5rem] lado a lado), sombras pesadas coloridas, bordas grossas, cartões com fundo hex próprio.
- Números grandes: classe `.numero` (fonte Azeret Mono). Valores em R$ com `toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })`.

## 3. Cabeçalho de página e abas
- Título: `SplitHeadline` (text-2xl font-black, última palavra em violeta) + subtítulo `text-[10px] font-bold uppercase tracking-widest` OU frase curta cinza. Nome da página deve vir do menu (`pageLabel`) quando o template é reaproveitado.
- Abas: (a) sublinhado com ícone (`border-b-2 border-violet-500`, Dashboard Operacional / Métricas do Comercial) ou (b) barra segmentada `ABAS_CLS` (Contas a Receber / Financeiro). Fora do padrão: abas com fundo violeta cheio (`bg-violet-600 text-white shadow-lg`), terceiros estilos.

## 4. Popups / modais
- Objetivo: cobrir a tela inteira (inclusive o menu lateral, que é `z-50` fixo), overlay escurecido com desfoque, container `bg-dark-card` com borda sutil e cantos grandes, fechar com Esc e clique fora, animação curta de entrada (opacity + scale 0.95→1).
- Existe `src/components/ui/Modal.tsx` — verifique o que ele faz e se as telas o usam.
- Registre em cada modal: overlay (classes), z-index, container (fundo/raio/borda), animação (motion/react, framer-motion, `animate-in`, nenhuma), se usa portal (createPortal) e se fecha com Esc/clique fora. Fora do padrão: z-index abaixo de 50 em modal de tela cheia, overlay sem escurecer, fundo hex próprio, cantos diferentes do resto, sem animação ou animação longa/estranha, `alert()`/`confirm()`/`prompt()` nativos do navegador.

## 5. Animações e carregamento
- Biblioteca: `motion/react` é a do menu e do módulo de gráficos; `framer-motion` também existe. Registre qual cada arquivo importa.
- Carregamento de página: `LoadingSpinner` (uva) centralizado em `min-h-screen`. Fora do padrão: spinner próprio `border-4 border-violet-500/30 border-t-violet-500 animate-spin`, `Loader2` gigante solto, texto "Carregando..." cru.
- Fora do padrão: animações infinitas chamativas em UI comum, transições > 500ms, `transition-all` em listas grandes.

## 6. Outros
- Estado vazio: ícone lucide discreto + frase cinza. Fora do padrão: emoji como ícone (❌, 📭), textos em inglês na interface ("Loading", "No data", "Save").
- Botões: primário `bg-violet-600 hover:bg-violet-700 text-white rounded-xl`; secundário com borda sutil. Fora: botões com cores aleatórias (blue-600, indigo, cyan) como primário.
- Toast: `toast` de `src/lib/toast.tsx`; fora do padrão: `alert()`.
