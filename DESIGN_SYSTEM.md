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
