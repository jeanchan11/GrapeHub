import React, { useState, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import { ChevronDown, Check, Plus, Search, Trash2, FolderInput, Pencil, X, ChevronLeft } from 'lucide-react';

export interface CatalogFolder {
  id: number;
  name: string;
  color?: string;
  order_index?: number;
}

export interface CatalogAction {
  id: number;
  name: string;
  icon?: string;
  folder_id?: number | null;
}

interface ActionPickerProps {
  value: string;
  options: CatalogAction[];
  folders: CatalogFolder[];
  placeholder?: string;
  /** Chamado ao escolher uma ação do catálogo (ou ao criar uma nova). */
  onChange: (name: string, icon?: string) => void;
  /** Cadastra uma nova ação no catálogo e devolve o item criado. */
  onCreate: (name: string, folderId: number | null) => Promise<CatalogAction | null>;
  onDelete?: (action: CatalogAction) => void;
  onMove?: (action: CatalogAction, folderId: number | null) => void;
  onCreateFolder?: (name: string) => Promise<CatalogFolder | null>;
  onRenameFolder?: (folder: CatalogFolder, name: string) => void;
  onDeleteFolder?: (folder: CatalogFolder) => void;
  renderIcon?: (iconName?: string) => React.ReactNode;
}

/** Ícone de pasta no estilo macOS, colorido conforme a pasta. */
const FolderGlyph: React.FC<{ color?: string; size?: number }> = ({ color = '#3b9df7', size = 46 }) => {
  const uid = React.useId();
  return (
    <svg width={size} height={size * (52 / 64)} viewBox="0 0 64 52" fill="none">
      <defs>
        <linearGradient id={`fb-${uid}`} x1="32" y1="4" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} stopOpacity="0.75" />
          <stop offset="1" stopColor={color} stopOpacity="0.55" />
        </linearGradient>
        <linearGradient id={`ff-${uid}`} x1="32" y1="14" x2="32" y2="52" gradientUnits="userSpaceOnUse">
          <stop stopColor={color} />
          <stop offset="1" stopColor={color} stopOpacity="0.78" />
        </linearGradient>
      </defs>
      {/* aba de trás */}
      <path d="M2 10a6 6 0 016-6h15.2a4 4 0 012.83 1.17L30 10h26a6 6 0 016 6v6H2V10z" fill={`url(#fb-${uid})`} />
      {/* corpo da frente */}
      <path d="M2 18a4 4 0 014-4h52a4 4 0 014 4v28a6 6 0 01-6 6H8a6 6 0 01-6-6V18z" fill={`url(#ff-${uid})`} />
    </svg>
  );
};

/**
 * Seletor das ações que já rodamos (ex: "Salário Maternidade", "BPC Loas", "Autista").
 * Navega em pastas como o Finder: a raiz mostra as pastas e as ações soltas; clicar
 * numa pasta entra nela. A busca sempre varre o catálogo inteiro.
 */
const ActionPicker: React.FC<ActionPickerProps> = ({
  value,
  options,
  folders,
  placeholder = 'Selecione a ação...',
  onChange,
  onCreate,
  onDelete,
  onMove,
  onCreateFolder,
  onRenameFolder,
  onDeleteFolder,
  renderIcon,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [currentFolder, setCurrentFolder] = useState<number | null>(null);
  const [creating, setCreating] = useState(false);
  const [newFolderName, setNewFolderName] = useState<string | null>(null);
  const [renaming, setRenaming] = useState(false);
  const [renameValue, setRenameValue] = useState('');
  const [confirmDeleteFolder, setConfirmDeleteFolder] = useState(false);
  const [movingId, setMovingId] = useState<number | null>(null);

  const anchorRef = useRef<HTMLDivElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  /**
   * O menu é posicionado com `position: absolute` dentro do próprio campo, e não
   * num portal com `position: fixed`.
   *
   * Portal + fixed dependia de nenhum ancestral criar containing block
   * (transform/filter/will-change de animações). Quando criava, o menu era
   * desenhado deslocado e, ao compensar isso com um `top` grande, ele passava a
   * esticar a área rolável do documento — daí a segunda barra de rolagem e a
   * faixa que o overlay do modal não cobria.
   *
   * Ancorado no campo, a posição é sempre correta por construção: acompanha
   * scroll e animações sem cálculo nenhum e nunca gera scroll extra.
   * Só resta decidir se abre para baixo ou para cima, e a altura máxima.
   */
  const [placement, setPlacement] = useState<{ up: boolean; maxHeight: number }>({ up: false, maxHeight: 440 });

  useLayoutEffect(() => {
    if (!open) return;
    const measure = () => {
      const el = anchorRef.current;
      if (!el) return;
      const r = el.getBoundingClientRect();
      const GAP = 4;
      const MARGIN = 8;
      const DESIRED_H = 440;
      const MIN_H = 200;
      const vh = window.innerHeight || document.documentElement.clientHeight || 800;

      const spaceBelow = vh - r.bottom - MARGIN - GAP;
      const spaceAbove = r.top - MARGIN - GAP;
      const up = spaceBelow < MIN_H && spaceAbove > spaceBelow;
      const maxHeight = Math.max(MIN_H, Math.min(DESIRED_H, up ? spaceAbove : spaceBelow));

      setPlacement(prev =>
        prev.up === up && Math.abs(prev.maxHeight - maxHeight) < 1 ? prev : { up, maxHeight }
      );
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, true);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      const t = e.target as Node;
      if (anchorRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  useEffect(() => {
    if (open) {
      // preventScroll: sem isso o navegador rola a página (e o modal) para trazer
      // o input à vista, o que desloca o menu e joga o fundo para uma área vazia.
      setTimeout(() => inputRef.current?.focus({ preventScroll: true }), 0);
    } else {
      setQuery('');
      setCurrentFolder(null);
      setNewFolderName(null);
      setRenaming(false);
      setConfirmDeleteFolder(false);
      setMovingId(null);
    }
  }, [open]);

  // Sair do modo edição ao trocar de pasta
  useEffect(() => {
    setRenaming(false);
    setConfirmDeleteFolder(false);
    setMovingId(null);
  }, [currentFolder]);

  const trimmedQuery = query.trim();
  const searching = trimmedQuery.length > 0;
  const folder = folders.find(f => f.id === currentFolder) || null;

  const countIn = (folderId: number | null) =>
    folderId === null
      ? options.filter(o => !o.folder_id).length
      : options.filter(o => o.folder_id === folderId).length;

  const searchResults = useMemo(() => {
    if (!searching) return [];
    const q = trimmedQuery.toLowerCase();
    return options.filter(o => o.name.toLowerCase().includes(q));
  }, [options, trimmedQuery, searching]);

  const listed = useMemo(
    () => options.filter(o => (currentFolder === null ? !o.folder_id : o.folder_id === currentFolder)),
    [options, currentFolder]
  );

  const exactExists = options.some(o => o.name.toLowerCase() === trimmedQuery.toLowerCase());
  const canCreate = trimmedQuery.length > 0 && !exactExists;

  const handleCreate = async () => {
    if (!canCreate || creating) return;
    setCreating(true);
    const created = await onCreate(trimmedQuery, currentFolder);
    setCreating(false);
    if (created) {
      onChange(created.name, created.icon);
      setOpen(false);
    }
  };

  const handleCreateFolder = async () => {
    const name = (newFolderName || '').trim();
    if (!name || !onCreateFolder) return;
    const created = await onCreateFolder(name);
    setNewFolderName(null);
    if (created) setCurrentFolder(created.id);
  };

  const folderNameOf = (id?: number | null) => folders.find(f => f.id === id)?.name;

  const renderActionRow = (opt: CatalogAction, showFolderTag = false) => (
    <div key={opt.id}>
      <div className="group flex items-center gap-2 px-3 py-2 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
        <button
          type="button"
          onClick={() => { onChange(opt.name, opt.icon); setOpen(false); }}
          className="flex-1 flex items-center gap-2.5 text-left min-w-0"
        >
          {renderIcon && <span className="text-violet-500 shrink-0">{renderIcon(opt.icon)}</span>}
          <span className="flex-1 text-sm text-slate-700 dark:text-dark-text truncate">{opt.name}</span>
          {showFolderTag && folderNameOf(opt.folder_id) && (
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 shrink-0">
              {folderNameOf(opt.folder_id)}
            </span>
          )}
          {value === opt.name && <Check size={14} className="text-violet-500 shrink-0" />}
        </button>
        {onMove && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); setMovingId(movingId === opt.id ? null : opt.id); }}
            className={`p-1 rounded-md transition-all shrink-0 hover:text-violet-500 hover:bg-violet-500/10 ${
              movingId === opt.id
                ? 'text-violet-500 bg-violet-500/10'
                : 'text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100'
            }`}
            title="Mover para pasta"
          >
            <FolderInput size={13} />
          </button>
        )}
        {onDelete && (
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onDelete(opt); }}
            className="p-1 rounded-md text-slate-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 hover:text-rose-500 hover:bg-rose-500/10 transition-all shrink-0"
            title="Remover do catálogo"
          >
            <Trash2 size={13} />
          </button>
        )}
      </div>

      {movingId === opt.id && onMove && (
        <div className="px-3 pb-2 pt-1 bg-slate-50 dark:bg-white/[0.03] border-y border-slate-100 dark:border-white/5">
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400 mb-1.5">Mover para</p>
          <div className="flex flex-wrap gap-1.5">
            {folders.map(f => (
              <button
                key={f.id}
                type="button"
                onClick={() => { onMove(opt, f.id); setMovingId(null); }}
                disabled={opt.folder_id === f.id}
                className="px-2 py-1 rounded-lg text-[11px] font-medium border border-slate-200 dark:border-white/10 text-slate-600 dark:text-slate-300 hover:border-violet-400 hover:text-violet-500 disabled:opacity-40 disabled:cursor-default transition-all"
              >
                {f.name}
              </button>
            ))}
            <button
              type="button"
              onClick={() => { onMove(opt, null); setMovingId(null); }}
              disabled={!opt.folder_id}
              className="px-2 py-1 rounded-lg text-[11px] font-medium border border-dashed border-slate-200 dark:border-white/10 text-slate-400 hover:border-rose-300 hover:text-rose-500 disabled:opacity-40 disabled:cursor-default transition-all"
            >
              Sem pasta
            </button>
            {folders.length === 0 && (
              <span className="text-[11px] text-slate-400">Crie uma pasta primeiro</span>
            )}
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex gap-2">
      <div ref={anchorRef} className="relative flex-1">
        <button
          type="button"
          onClick={() => setOpen(v => !v)}
          className="w-full flex items-center justify-between gap-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-left focus:border-violet-500 hover:border-violet-400 outline-none transition-all"
        >
          <span className={value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
            {value || placeholder}
          </span>
          <ChevronDown size={16} className="text-slate-400 shrink-0" />
        </button>

        {open && (
          <div
            ref={menuRef}
            className={`absolute left-0 right-0 z-[1300] bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden overscroll-contain flex flex-col ${
              placement.up ? 'bottom-full mb-1' : 'top-full mt-1'
            }`}
            /* position inline: o index.html tem uma regra global
               `html.dark .dark\:bg-dark-card { position: relative }` que anula o
               `absolute` da classe. Era ela que quebrava o posicionamento do menu. */
            style={{ position: 'absolute', maxHeight: placement.maxHeight }}
          >
            {/* Barra superior: voltar + busca */}
            <div className="p-2 border-b border-slate-100 dark:border-white/5 shrink-0 flex items-center gap-2">
              {folder && !searching && (
                <button
                  type="button"
                  onClick={() => setCurrentFolder(null)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 transition-all shrink-0"
                  title="Voltar às pastas"
                >
                  <ChevronLeft size={16} />
                </button>
              )}
              <div className="flex-1 flex items-center gap-2 bg-slate-100 dark:bg-white/5 rounded-lg px-2.5 py-2">
                <Search size={14} className="text-slate-400 shrink-0" />
                <input
                  ref={inputRef}
                  type="text"
                  value={query}
                  onChange={e => setQuery(e.target.value)}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      const pool = searching ? searchResults : listed;
                      if (pool.length === 1) {
                        onChange(pool[0].name, pool[0].icon);
                        setOpen(false);
                      } else if (canCreate) {
                        handleCreate();
                      }
                    }
                    if (e.key === 'Escape') setOpen(false);
                  }}
                  placeholder={folder && !searching ? `Buscar em todas as ações...` : 'Buscar ação...'}
                  className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none"
                />
                {query && (
                  <button
                    type="button"
                    onClick={() => { setQuery(''); inputRef.current?.focus(); }}
                    className="text-slate-400 hover:text-slate-600 dark:hover:text-white shrink-0"
                  >
                    <X size={13} />
                  </button>
                )}
              </div>
            </div>

            {/* Cabeçalho da pasta aberta */}
            {folder && !searching && (
              <div className="px-3 py-2 border-b border-slate-100 dark:border-white/5 shrink-0">
                {renaming ? (
                  <div className="flex items-center gap-1.5">
                    <Pencil size={13} className="text-violet-500 shrink-0" />
                    <input
                      autoFocus
                      type="text"
                      value={renameValue}
                      onChange={e => setRenameValue(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          if (renameValue.trim()) onRenameFolder?.(folder, renameValue.trim());
                          setRenaming(false);
                        }
                        if (e.key === 'Escape') setRenaming(false);
                      }}
                      className="flex-1 bg-slate-100 dark:bg-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white outline-none border border-slate-200 dark:border-white/10 focus:border-violet-500"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        if (renameValue.trim()) onRenameFolder?.(folder, renameValue.trim());
                        setRenaming(false);
                      }}
                      className="px-2 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500"
                    >
                      Salvar
                    </button>
                  </div>
                ) : confirmDeleteFolder ? (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500 dark:text-slate-400 flex-1">
                      Excluir "{folder.name}"? As {countIn(folder.id)} ações voltam para a raiz.
                    </span>
                    <button
                      type="button"
                      onClick={() => { onDeleteFolder?.(folder); setCurrentFolder(null); }}
                      className="px-2 py-1 rounded-lg bg-rose-500 text-white font-bold hover:bg-rose-600"
                    >
                      Excluir
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmDeleteFolder(false)}
                      className="px-2 py-1 rounded-lg border border-slate-200 dark:border-white/10 text-slate-500"
                    >
                      Cancelar
                    </button>
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <FolderGlyph color={folder.color} size={18} />
                    <span className="text-sm font-bold text-slate-800 dark:text-white flex-1 truncate">
                      {folder.name}
                    </span>
                    <span className="text-[10px] text-slate-400 shrink-0">{countIn(folder.id)} ações</span>
                    {onRenameFolder && (
                      <button
                        type="button"
                        onClick={() => { setRenameValue(folder.name); setRenaming(true); }}
                        className="p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-violet-500 hover:bg-violet-500/10 transition-all"
                        title="Renomear pasta"
                      >
                        <Pencil size={12} />
                      </button>
                    )}
                    {onDeleteFolder && (
                      <button
                        type="button"
                        onClick={() => setConfirmDeleteFolder(true)}
                        className="p-1 rounded-md text-slate-300 dark:text-slate-600 hover:text-rose-500 hover:bg-rose-500/10 transition-all"
                        title="Excluir pasta"
                      >
                        <Trash2 size={12} />
                      </button>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* Conteúdo */}
            {/* overscroll-contain: impede que o scroll "vaze" para a página atrás
                ao chegar no fim da lista (deixava o fundo do modal deslizar) */}
            <div className="flex-1 overflow-y-auto overscroll-contain min-h-0">
              {searching ? (
                <div className="py-1">
                  {searchResults.map(opt => renderActionRow(opt, true))}
                  {searchResults.length === 0 && !canCreate && (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">Nenhuma ação encontrada</div>
                  )}
                </div>
              ) : folder ? (
                <div className="py-1">
                  {listed.map(opt => renderActionRow(opt))}
                  {listed.length === 0 && (
                    <div className="px-3 py-8 text-center text-xs text-slate-400">
                      Pasta vazia — digite acima para adicionar uma ação aqui
                    </div>
                  )}
                </div>
              ) : (
                <>
                  {/* Raiz: grade de pastas */}
                  <div className="grid grid-cols-4 gap-1 p-3">
                    {folders.map(f => (
                      <button
                        key={f.id}
                        type="button"
                        onClick={() => setCurrentFolder(f.id)}
                        onDoubleClick={() => setCurrentFolder(f.id)}
                        className="flex flex-col items-center gap-1.5 p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-white/5 transition-all group"
                      >
                        <span className="transition-transform group-hover:scale-105 drop-shadow-sm">
                          <FolderGlyph color={f.color} size={46} />
                        </span>
                        <span className="text-[11px] font-medium text-slate-700 dark:text-dark-text text-center leading-tight line-clamp-2 w-full">
                          {f.name}
                        </span>
                        <span className="text-[10px] text-slate-400 leading-none">{countIn(f.id)}</span>
                      </button>
                    ))}

                    {onCreateFolder && newFolderName === null && (
                      <button
                        type="button"
                        onClick={() => setNewFolderName('')}
                        className="flex flex-col items-center justify-center gap-1.5 p-2 rounded-xl border border-dashed border-slate-200 dark:border-white/10 text-slate-400 hover:border-violet-400 hover:text-violet-500 transition-all min-h-[86px]"
                      >
                        <Plus size={20} />
                        <span className="text-[11px] font-medium leading-tight">Nova pasta</span>
                      </button>
                    )}
                  </div>

                  {/* Criar pasta */}
                  {newFolderName !== null && (
                    <div className="flex items-center gap-1.5 px-3 pb-3 -mt-1">
                      <FolderGlyph size={18} />
                      <input
                        autoFocus
                        type="text"
                        value={newFolderName}
                        onChange={e => setNewFolderName(e.target.value)}
                        onKeyDown={e => {
                          if (e.key === 'Enter') { e.preventDefault(); handleCreateFolder(); }
                          if (e.key === 'Escape') setNewFolderName(null);
                        }}
                        placeholder="Nome da pasta..."
                        className="flex-1 bg-slate-100 dark:bg-white/5 rounded-lg px-2 py-1.5 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 outline-none border border-slate-200 dark:border-white/10 focus:border-violet-500"
                      />
                      <button
                        type="button"
                        onClick={handleCreateFolder}
                        className="px-2 py-1.5 rounded-lg bg-violet-600 text-white text-[11px] font-bold hover:bg-violet-500 transition-all"
                      >
                        Criar
                      </button>
                      <button
                        type="button"
                        onClick={() => setNewFolderName(null)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-white"
                      >
                        <X size={13} />
                      </button>
                    </div>
                  )}

                  {/* Raiz: ações fora de qualquer pasta */}
                  {listed.length > 0 && (
                    <div className="border-t border-slate-100 dark:border-white/5 py-1">
                      <p className="px-3 pt-2 pb-1 text-[10px] font-bold uppercase tracking-widest text-slate-400">
                        Fora de pastas · {listed.length}
                      </p>
                      {listed.map(opt => renderActionRow(opt))}
                    </div>
                  )}

                  {folders.length === 0 && listed.length === 0 && (
                    <div className="px-3 py-6 text-center text-xs text-slate-400">Catálogo vazio</div>
                  )}
                </>
              )}
            </div>

            {canCreate && (
              <button
                type="button"
                onClick={handleCreate}
                disabled={creating}
                className="shrink-0 w-full flex items-center gap-2.5 px-3 py-3 border-t border-slate-100 dark:border-white/5 text-violet-600 dark:text-violet-400 hover:bg-violet-500/10 transition-colors disabled:opacity-50"
              >
                <Plus size={14} className="shrink-0" />
                <span className="text-sm font-medium truncate">
                  {creating
                    ? 'Adicionando...'
                    : `Adicionar "${trimmedQuery}"${folder ? ` em ${folder.name}` : ''}`}
                </span>
              </button>
            )}
          </div>
        )}
      </div>

      <button
        type="button"
        onClick={() => setOpen(true)}
        title="Adicionar nova ação"
        className="shrink-0 w-[50px] flex items-center justify-center bg-violet-600/10 dark:bg-violet-500/10 border border-violet-500/30 rounded-xl text-violet-600 dark:text-violet-400 hover:bg-violet-600/20 transition-all"
      >
        <Plus size={18} />
      </button>
    </div>
  );
};

export default ActionPicker;
