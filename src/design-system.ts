/**
 * DESIGN SYSTEM — GrapeHub
 * Toda nova página deve usar:
 * - <PageHeader> para o cabeçalho
 * - <Modal> para popups e modais
 * - Os tokens deste arquivo para cores, espaçamentos e tipografia
 * Nunca criar estilos inline ou componentes de modal do zero.
 */

export const designSystem = {

  typography: {
    pageTitle: 'text-2xl font-black tracking-tight',
    sectionTitle: 'text-lg font-semibold text-gray-900 dark:text-white',
    cardTitle: 'text-base font-semibold text-gray-900 dark:text-white',
    label: 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
    body: 'text-sm text-gray-700 dark:text-gray-300',
    secondary: 'text-xs text-gray-500 dark:text-gray-400',
    value: 'text-sm font-medium text-gray-900 dark:text-white',
  },

  pageTitle: {
    wrapper: 'mb-6',
    // Mesmo tamanho do SplitHeadline padrão (18/11/2026): todas as páginas com o título em 2xl
    title: 'text-2xl font-black tracking-tight text-dark-text',
    titleAccent: 'text-violet-500',
    subtitle: 'text-sm text-slate-500 dark:text-slate-400 mt-1',
  },

  modal: {
    overlay: 'fixed inset-0 z-50 modal-overlay',
    container: 'modal-container w-full mx-auto my-8 overflow-hidden flex flex-col',
    header: 'p-6 border-b modal-divider flex items-center justify-between shrink-0',
    title: 'text-lg font-bold modal-title',
    body: 'p-6 overflow-y-auto flex-1 scrollbar-hide',
    footer: 'p-6 border-t modal-divider flex justify-end gap-3 shrink-0',
  },

  input: {
    label: 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 mb-1',
    field: 'w-full px-4 py-3 rounded-xl modal-input focus:outline-none focus:ring-2 focus:ring-purple-500/50 transition-all',
  },

  button: {
    primary: 'modal-btn-primary',
    secondary: 'modal-btn-cancel',
    danger: 'bg-rose-500 hover:bg-rose-600 text-white px-4 h-10 rounded-xl text-sm font-semibold transition-colors',
    /** Botão principal fora de modal (18/11/2026): violeta, cantos xl, altura 40. */
    principal: 'inline-flex items-center justify-center gap-2 h-10 px-4 whitespace-nowrap shrink-0 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold transition-colors disabled:opacity-50',
    /** Botão secundário: borda sutil, fundo do tema. */
    secundario: 'inline-flex items-center justify-center gap-2 h-10 px-4 whitespace-nowrap shrink-0 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 text-sm font-semibold text-slate-600 dark:text-slate-300 hover:text-dark-text hover:border-violet-500/40 transition-colors disabled:opacity-50',
  },

  card: {
    base: 'bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl shadow-sm',
    header: 'p-4 border-b border-black/5 dark:border-white/5',
    body: 'p-4',
  },

  badge: {
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full text-xs font-medium',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-medium',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-medium',
    gray: 'bg-slate-100 dark:bg-white/10 text-slate-700 dark:text-slate-300 px-2 py-0.5 rounded-full text-xs font-medium',
  },

  table: {
    wrapper: 'w-full border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden',
    header: 'bg-slate-50 dark:bg-white/[0.03] text-[11px] font-medium text-slate-500 dark:text-slate-400 px-4 py-3',
    row: 'border-t border-black/5 dark:border-white/5 hover:bg-violet-500/5 transition-colors',
    cell: 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300',
  },
}
