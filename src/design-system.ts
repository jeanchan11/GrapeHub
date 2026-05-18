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
    pageTitle: 'text-3xl font-bold tracking-tight',
    sectionTitle: 'text-lg font-semibold text-gray-900 dark:text-white',
    cardTitle: 'text-base font-semibold text-gray-900 dark:text-white',
    label: 'text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400',
    body: 'text-sm text-gray-700 dark:text-gray-300',
    secondary: 'text-xs text-gray-500 dark:text-gray-400',
    value: 'text-sm font-medium text-gray-900 dark:text-white',
  },

  pageTitle: {
    wrapper: 'mb-6',
    title: 'text-3xl font-bold tracking-tight text-gray-900 dark:text-white',
    titleAccent: 'text-purple-500',
    subtitle: 'text-sm text-gray-500 dark:text-gray-400 mt-1',
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
    danger: 'bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg font-medium transition-colors',
  },

  card: {
    base: 'bg-white dark:bg-[#1a1a1a] darker:bg-[#0d0d0d] border border-gray-100 dark:border-neutral-800 darker:border-neutral-900 rounded-xl shadow-sm',
    header: 'p-4 border-b border-gray-100 dark:border-neutral-800 darker:border-neutral-900',
    body: 'p-4',
  },

  badge: {
    purple: 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-400 px-2 py-0.5 rounded-full text-xs font-medium',
    green: 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-400 px-2 py-0.5 rounded-full text-xs font-medium',
    red: 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-400 px-2 py-0.5 rounded-full text-xs font-medium',
    gray: 'bg-gray-100 dark:bg-neutral-800 text-gray-700 dark:text-gray-300 px-2 py-0.5 rounded-full text-xs font-medium',
  },

  table: {
    wrapper: 'w-full border border-gray-100 dark:border-neutral-800 darker:border-neutral-900 rounded-xl overflow-hidden',
    header: 'bg-gray-50 dark:bg-neutral-900 darker:bg-black text-xs font-semibold uppercase tracking-wide text-gray-500 dark:text-gray-400 px-4 py-3',
    row: 'border-t border-gray-100 dark:border-neutral-800 darker:border-neutral-900 hover:bg-gray-50 dark:hover:bg-neutral-900 darker:hover:bg-black transition-colors',
    cell: 'px-4 py-3 text-sm text-gray-700 dark:text-gray-300',
  },
}
