# Sistema de Design - GrapeHub

Este documento define os padrões de design para garantir consistência em todo o sistema. Sempre que solicitar alterações em cards, popups, cores ou outros elementos, estas diretrizes devem ser seguidas.

## 1. Cores e Temas

O sistema utiliza variáveis CSS para facilitar a alternância de temas.

### Tema Escuro (Padrão)
- **Background:** `#0a0118` (rgb: 10 1 24)
- **Card:** `#11111b` (rgb: 17 17 27)
- **Sidebar:** `#05000c` (rgb: 5 0 12)
- **Texto:** `#ffffff` (rgb: 255 255 255)
- **Acento:** `#7c3aed` (rgb: 124 58 237)

### Tema Claro
- **Background:** `#ffffff` (rgb: 255 255 255)
- **Card:** `#f8fafc` (rgb: 248 250 252)
- **Sidebar:** `#f1f5f9` (rgb: 241 245 249)
- **Texto:** `#1e293b` (rgb: 30 41 59)
- **Acento:** `#7c3aed` (rgb: 124 58 237)

## 2. Componentes (Padrão de Modais)

Todos os modais devem seguir o padrão de transparência de 80% em ambos os modos:

- **Background (Escuro):** `bg-white dark:bg-dark-bg/80`
- **Background (Claro):** `bg-white/80`
- **Blur:** Nenhum (remover `backdrop-blur`)
- **Bordas:** `border border-slate-200 dark:border-white/10`
- **Sombras:** `shadow-2xl`
- **Arredondamento:** `rounded-3xl`

Exemplo de classe para modais:
`className="relative w-full max-w-4xl bg-white/80 dark:bg-dark-bg/80 rounded-3xl border border-slate-200 dark:border-white/10 shadow-2xl"`

## 3. Tipografia
- **Fonte Principal:** 'Inter', sans-serif
- **Fonte de Títulos:** 'Playfair Display', serif (quando necessário)

---

## 4. Padrão de Dashboards

Todo novo dashboard deve seguir exatamente este padrão visual, garantindo consistência com os dashboards de Comercial, Financeiro e Ligações.

### 4.1 Fundo da Página

```tsx
<div className="min-h-screen bg-dark-bg transition-colors duration-300">
```

> Nunca use `bg-white`, `bg-slate-50`, `bg-[#0B0E14]` ou similares hardcoded. Use sempre o token `bg-dark-bg`.

---

### 4.2 Headline (Obrigatório — padrão fixo)

A headline de qualquer dashboard deve seguir **exatamente** este padrão:
- Título em branco/bold com a **última palavra em violet** (cor de acento da marca)
- Subtítulo em uppercase com tracking widest e tamanho 10px

```tsx
{/* ── Header ─────────────────────── */}
<div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
  <div>
    <h1 className="text-2xl font-black tracking-tight text-dark-text">
      Título <span className="text-violet-500">Acento</span>
    </h1>
    <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
      Subtítulo descritivo da página
    </p>
  </div>
  <div className="flex items-center gap-2">
    {/* Filtros / MonthPicker / Refresh */}
  </div>
</div>
```

**Exemplos corretos:**
- `Comercial <span>Métricas</span>`
- `CRM <span>Comercial</span>`
- `Finan<span>ceiro</span>`

---

### 4.3 Cards de KPI

```tsx
function KpiCard({ icon, iconBg, label, value, sub, extra }) {
  return (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
        <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
      </div>
      <div className="text-2xl font-black text-dark-text leading-tight">{value}</div>
      {sub && <div className="text-xs text-slate-400 dark:text-slate-500">{sub}</div>}
      {extra}
    </div>
  );
}
```

**Grid de KPIs:**
```tsx
<div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
  <KpiCard ... />
</div>
```

**Delta Badge (comparativo mês anterior):**
```tsx
// Passar via prop `extra` de cada KpiCard
extra={
  <div className="text-[10px] text-slate-500 mt-0.5">
    vs. anterior: <DeltaBadge curr={valor} prev={valorAnterior} />
  </div>
}

// Componente DeltaBadge:
function DeltaBadge({ curr, prev }) {
  const d = prev > 0 ? ((curr - prev) / prev) * 100 : null;
  if (d === null) return <span className="text-[10px] text-slate-500">—</span>;
  const color = d > 0 ? 'text-emerald-500' : d < 0 ? 'text-red-400' : 'text-slate-400';
  const arrow = d > 0 ? '↑' : d < 0 ? '↓' : '→';
  return (
    <span className={`text-[11px] font-bold ${color}`}>
      {arrow} {Math.abs(d).toFixed(1)}%
    </span>
  );
}
```

---

### 4.4 Cards de Gráfico

```tsx
<div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
  <h2 className="text-sm font-bold text-dark-text">Título do Gráfico ({ano})</h2>
  <p className="text-xs text-slate-500 dark:text-slate-400 mb-5 mt-0.5">Descrição do gráfico</p>
  <ResponsiveContainer width="100%" height={210}>
    {/* Recharts Bar / Line / Area */}
  </ResponsiveContainer>
</div>
```

**Grid de gráficos (2 colunas):**
```tsx
<div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
```

---

### 4.5 Section Labels (separadores de seção)

```tsx
<p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-3">
  Nome da Seção
</p>
```

> Nunca use `<h2>` com fundo de card como separador de seção. Use o label acima como título flutuante sobre o grid.

---

### 4.6 Cards de Métricas (tipo SessaoCard)

```tsx
function SessaoCard({ icon, iconBg, label, value, sub }) {
  return (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col gap-1.5 transition-colors duration-200">
      <div className="flex items-center gap-2 mb-1">
        <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${iconBg}`}>{icon}</div>
        <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{label}</span>
      </div>
      <div className="text-3xl font-black text-dark-text">{value}</div>
      {sub && <p className="text-[10px] text-slate-500">{sub}</p>}
    </div>
  );
}
```

---

### 4.7 Loading State

```tsx
<div className="flex items-center justify-center min-h-screen bg-dark-bg">
  <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
</div>
```

---

### 4.8 Filtro de Período (MonthPicker)

Para dashboards com filtro de data por mês/ano, use o componente `MonthPicker` já implementado em `CrmMetricas.tsx` como referência. Ele oferece:
- Seleção de ano (atualiza gráficos imediatamente)
- Seleção de mês (atualiza todos os KPIs)
- Mês atual pré-selecionado por padrão
- Suporte a todos os temas

---

### 4.9 Tokens de Tema (obrigatório)

| Elemento | Classe Correta | ❌ Nunca usar |
|---|---|---|
| Fundo da página | `bg-dark-bg` | `bg-[#0B0E14]`, `bg-slate-50` |
| Card/Container | `bg-dark-card` | `bg-white dark:bg-[#1C1F26]`, `bg-white/80` |
| Hover de card | `bg-dark-card-hover` | `hover:bg-white/5`, `hover:bg-slate-50` |
| Texto principal | `text-dark-text` | `text-slate-900 dark:text-white` |
| Borda padrão | `border border-white/10` | `border-slate-200 dark:border-white/5` |
| Arredondamento card | `rounded-2xl` | `rounded-3xl` (reservado para modais) |
| Transição | `transition-colors duration-200` | (sem transição) |

---

## 5. Drag and Drop (Listas Ordenáveis)

Sempre que precisar de uma lista ordenável (arrastar e soltar), utilize a biblioteca **`@dnd-kit`** para garantir transições suaves e um comportamento nativo consistente (nada de HTML5 nativo "seco").

### 5.1 Bibliotecas Base
Importe sempre do pacote `@dnd-kit`:
```tsx
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors, DragOverlay } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
```

### 5.2 Wrapper do Item (SortableItem)
Crie um wrapper padronizado que injeta o comportamento e a animação correta no card:
```tsx
const SortableItemWrapper: React.FC<{
  id: string;
  children: (dragHandleProps: { attributes: any; listeners: any }) => React.ReactNode;
}> = ({ id, children }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1, // Opacidade reduzida enquanto arrasta
    zIndex: isDragging ? 50 : undefined,
    position: 'relative',
  };
  return (
    <div ref={setNodeRef} style={style}>
      {children({ attributes, listeners })}
    </div>
  );
};
```

### 5.3 O Grip (Ícone de Arrasto)
O ícone de arrasto (GripVertical) deve sempre seguir este padrão visual, preferencialmente usando `lucide-react`:
```tsx
<button
  {...dragHandleProps.attributes}
  {...dragHandleProps.listeners}
  className="cursor-grab active:cursor-grabbing text-slate-400 dark:text-dark-text/20 hover:text-violet-500 dark:hover:text-violet-400 transition-colors touch-none flex-shrink-0"
  title="Arrastar para reordenar"
>
  <GripVertical size={12} />
</button>
```

### 5.4 Drag Overlay (O Fantasma)
Sempre implemente um `DragOverlay` para renderizar o card que fica grudado no cursor enquanto o usuário arrasta. Ele deve ter sombra e efeito blur:
```tsx
<DragOverlay dropAnimation={null}>
  {activeDragItem && (
    <div className="bg-white dark:bg-dark-card/95 backdrop-blur-sm border border-violet-500/30 rounded-xl px-4 py-2 shadow-2xl shadow-violet-500/10 cursor-grabbing flex items-center gap-2 max-w-md">
      {/* O mesmo grip, mas sem listeners/atributos */}
      <GripVertical size={12} className="text-violet-500 dark:text-violet-400 flex-shrink-0" />
      <span className="text-sm font-medium text-slate-700 dark:text-white truncate">
        {activeDragItem.title}
      </span>
    </div>
  )}
</DragOverlay>
```

### 5.5 Estrutura Principal
Englobe a lista no `DndContext` e `SortableContext`:
```tsx
const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 5 } }));

<DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
  <SortableContext items={items.map(i => i.id)} strategy={verticalListSortingStrategy}>
    {items.map(item => (
      <SortableItemWrapper key={item.id} id={item.id}>
        {(dragHandleProps) => (
           <SeuComponenteCard item={item} dragHandleProps={dragHandleProps} />
        )}
      </SortableItemWrapper>
    ))}
  </SortableContext>
  <DragOverlay>... (veja acima)</DragOverlay>
</DndContext>
```
