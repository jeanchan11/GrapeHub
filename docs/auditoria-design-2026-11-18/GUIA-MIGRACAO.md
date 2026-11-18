# Guia da migração de design (18/11/2026)

Base pronta (NÃO edite estes arquivos — são do coordenador):
`src/components/ui/Modal.tsx`, `src/components/ui/Abas.tsx`, `src/components/ui/EstadoVazio.tsx`,
`src/components/LoadingSpinner.tsx`, `src/design-system.ts`, `src/components/SplitHeadline.tsx`,
`src/components/graficos.tsx|.css`, `src/components/Sidebar.tsx`, `src/components/sidebar-vidro.css`,
`App.tsx`, `index.html`, qualquer arquivo de servidor (`server.ts`, `src/routes/*`).

Regra de ouro: **só aparência**. Não mude regra de negócio, chamadas de API, nomes de estado,
o que é salvo nem quando. Se uma correção exigir mudar comportamento, NÃO faça — anote no relatório.
Backup completo do front em `../grapehub-backup-design-20261118/`.

## 1. Popups (prioridade)
Popup de tela cheia feito à mão (`fixed inset-0 … bg-black/60 …` + caixa) → `<Modal>` de
`src/components/ui/Modal.tsx` (export nomeado `Modal`; portal, z-[1000], centralizado, Esc, clique fora,
fundo do tema, desfoque e animação já incluídos).

```tsx
import { Modal } from '../components/ui/Modal';   // ajuste o caminho
<Modal isOpen={aberto} onClose={fechar} title="Novo cliente" maxWidth="max-w-lg"
       footer={<>…botões…</>}>
  …conteúdo…
</Modal>
```
Migração sem refazer o miolo (o conteúdo já tem cabeçalho/X próprio):
`<Modal isOpen={x} onClose={f} semCabecalho semPadding maxWidth="max-w-xl">{miolo antigo}</Modal>`
— tire do miolo o overlay, o `fixed inset-0`, o fundo/borda/raio/sombra da caixa externa (o Modal já dá)
e o `onClick={e => e.stopPropagation()}` que só servia ao overlay antigo.
- `isOpen`: se o popup era renderizado com `{cond && (...)}`, passe `isOpen={!!cond}` e mantenha o miolo.
  Se o miolo depende de dado que só existe quando aberto (ex.: `item.nome` com `item` possivelmente null),
  mantenha `{cond && <Modal isOpen …>…</Modal>}` para não quebrar.
- **Clique fora**: preserve o comportamento atual. Se hoje NÃO fecha clicando fora, ou se é formulário
  em que fechar perderia o que foi digitado, use `fecharAoClicarFora={false}`. Esc continua fechando
  (se o formulário for longo e o original não tinha como fechar sem botão, use também `fecharComEsc={false}`).
- Popup em cima de outro popup: o Modal já usa portal; a ordem de abertura define quem fica por cima.
- Menus suspensos, dropdowns, tooltips e painéis `absolute` NÃO são popups — não converta; só acerte cores.
- Confirmação feita à mão → `confirmDialog({...})` de `src/lib/confirm.tsx`; `alert()` → `toast` de
  `src/lib/toast.tsx`; `window.prompt()` → `promptDialog(...)`. Leia as assinaturas no arquivo.

## 2. Título da página e abas
- Título: `<SplitHeadline text="Parte " highlight="destaque" subtitle="…" />` **sem** className de tamanho
  (o padrão agora é 2xl). Tire `text-4xl`/`text-3xl` de títulos de página.
- Template reaproveitado: o `App.tsx` já passa `pageLabel` para ProjectsModule, TodoPage, TodoStaff,
  IdeaisCriativos, SenhasPage (e já passava para ChamadosGrapehub, MeetingNotes, ListaPage…). Acrescente
  `pageLabel?: string` nas props do componente e use-o no título (última palavra em destaque:
  `const i = nome.lastIndexOf(' ')` → `text={nome.slice(0,i+1)} highlight={nome.slice(i+1)}`), com o
  título atual como reserva. IdeaisCriativos/ChamadosGrapehub só repassam para TodoStaff — repasse o prop.
- Abas de página → `<Abas abas={[{id,rotulo,Icone,contador}]} ativa={x} onChange={setX} />`
  (`src/components/ui/Abas.tsx`). Filtro/visão dentro da página → `variante="segmentado"`.
  Nunca aba com fundo violeta (ou verde/âmbar) cheio.

## 3. Carregamento e vazio
- Página carregando → `<CarregandoPagina />`; dentro de cartão/lista/popup → `<CarregandoBloco />`
  (ambos exportados de `src/components/LoadingSpinner.tsx`). Troque spinners próprios
  (`border-4 … animate-spin`, `Loader2` solto grande, "Carregando..." em texto). Loader2 pequeno DENTRO de
  botão (salvando…) pode ficar.
- Lista que mostra "Nenhum item" enquanto ainda carrega: mostre o carregamento até a resposta chegar
  (use o estado de loading que já existe; se não existir, um `useState(true)` que vira false no finally
  do fetch que já existe — isso é aparência, pode).
- Vazio → `<EstadoVazio Icone={…} titulo="…" descricao="…" />` (`src/components/ui/EstadoVazio.tsx`).

## 4. Cores, formatos, emojis, botões
- Fundo de superfície: `bg-dark-card` (cartão/popup/menu). Texto `text-dark-text`; secundário
  `text-slate-500 dark:text-slate-400`. Borda `border-black/10 dark:border-white/10`.
- Tema claro: `text-white` em texto sobre superfície → `text-dark-text` (mantenha text-white só sobre
  fundo violeta/colorido sólido). `border-white/x` sozinho → `border-black/10 dark:border-white/10`.
  `hover:text-white` → `hover:text-dark-text`. `bg-white/5` sozinho em superfície → `bg-black/[0.03] dark:bg-white/5`.
- Hex fixos de superfície/borda/texto (`#151221`, `#2d2b3d`, `#6b7280`, `#0f0f1a`…) → tokens acima.
  Cores de status: positivo emerald-500 (#10b981), negativo rose-500 (#f43f5e), alerta amber-500, acento violeta.
- Botão principal: `designSystem.button.principal` (de `src/design-system.ts`) ou
  `bg-violet-600 hover:bg-violet-700 text-white rounded-xl`. Nada de azul, fúcsia, degradê.
  Secundário: `designSystem.button.secundario`.
- Cantos: cartão `rounded-2xl` (ou `Cartao`/`CartaoKpi` de graficos.tsx), controles `rounded-xl`/`rounded-lg`.
  Tire `rounded-3xl`/`rounded-[2.5rem]` de caixas comuns.
- Cartão de indicador (número grande + rótulo) no estilo antigo → `CartaoKpi` de `src/components/graficos.tsx`
  quando for trivial; número grande com classe `numero`.
- Emoji usado como ÍCONE de interface (status, tipo, grupo, botão, vazio) → ícone `lucide-react`.
  Emoji que é CONTEÚDO do usuário (título digitado, comentário, seletor de emoji) fica.
- Texto da interface em inglês → português.

## 5. Animação
- `import { motion, AnimatePresence } from 'framer-motion'` → `from 'motion/react'` (mesma API).
- Cascata de entrada em lista longa: limite o atraso (`delay: Math.min(i, 8) * 0.04`).
- `animate-in fade-in …` não funciona (Tailwind CDN sem plugin): troque por motion ou tire.
- Nada de `transition-all` em linhas de tabela grande (use `transition-colors`).

## 6. Como trabalhar e verificar
- Use o relatório de auditoria da sua área (mesma pasta) como lista de tarefas; ele tem arquivo:linha.
  As linhas podem ter mudado — procure pelo trecho.
- Depois de cada arquivo: `curl -s -o /dev/null -w "%{http_code}" "http://localhost:3000/<caminho>"`
  tem de dar 200 (o servidor de dev compila o arquivo). 500 = erro de sintaxe: corrija.
- No fim, uma vez: `npx tsc --noEmit -p . > <scratchpad>/tsc-<area>.txt 2>&1` (leva ~3 min; NÃO use o
  comando `timeout`, não existe no macOS) e filtre pelos SEUS arquivos. O projeto tem ~36 linhas de erro
  pré-existentes — só os novos importam.
- Só mexa nos arquivos da sua lista. Se precisar de algo num arquivo de outra área ou da base, anote.
