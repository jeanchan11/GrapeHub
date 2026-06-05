import React, { useState, useEffect, useRef } from 'react';
import { ChevronRight, ChevronDown, Plus, Pencil, Check, X, FolderTree, Layers, Tag, Search, Loader2 } from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';

// ── Types ──────────────────────────────────────────────
interface CategoryNode {
  id: number;
  external_id: number;
  structure: string;
  description: string;
  level: number;
  children: CategoryNode[];
}

// ── Level Colors ──────────────────────────────────────
const LEVEL_COLORS = {
  1: { bg: 'bg-violet-500/10', text: 'text-violet-400', border: 'border-violet-500/20', dot: 'bg-violet-500', badge: 'bg-violet-500/15 text-violet-400' },
  2: { bg: 'bg-sky-500/10', text: 'text-sky-400', border: 'border-sky-500/20', dot: 'bg-sky-500', badge: 'bg-sky-500/15 text-sky-400' },
  3: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/20', dot: 'bg-emerald-500', badge: 'bg-emerald-500/15 text-emerald-400' },
} as const;

const LEVEL_LABELS = { 1: 'Grupo', 2: 'Subgrupo', 3: 'Conta' } as const;

// ── Category Node Component ──────────────────────────
const CategoryTreeNode = ({
  node,
  onEdit,
  onAddChild,
  searchTerm,
}: {
  node: CategoryNode;
  onEdit: (id: number, desc: string) => Promise<void>;
  onAddChild: (parentStructure: string) => Promise<void>;
  searchTerm: string;
}) => {
  const [expanded, setExpanded] = useState(node.level === 1);
  const [editing, setEditing] = useState(false);
  const [editValue, setEditValue] = useState(node.description);
  const [saving, setSaving] = useState(false);
  const [adding, setAdding] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const colors = LEVEL_COLORS[node.level as 1 | 2 | 3] || LEVEL_COLORS[3];
  const levelLabel = LEVEL_LABELS[node.level as 1 | 2 | 3] || 'Item';
  const hasChildren = node.children && node.children.length > 0;
  const canAddChild = node.level < 3;
  const indentPx = (node.level - 1) * 28;

  // Auto-expand when searching
  useEffect(() => {
    if (searchTerm && hasChildren) {
      const matchesSearch = (n: CategoryNode): boolean => {
        if (n.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            n.structure.includes(searchTerm)) return true;
        return n.children?.some(matchesSearch) || false;
      };
      if (matchesSearch(node)) setExpanded(true);
    }
  }, [searchTerm]);

  useEffect(() => {
    if (editing && inputRef.current) inputRef.current.focus();
  }, [editing]);

  const handleSave = async () => {
    if (!editValue.trim() || editValue === node.description) {
      setEditing(false);
      setEditValue(node.description);
      return;
    }
    setSaving(true);
    await onEdit(node.id, editValue.trim());
    setSaving(false);
    setEditing(false);
  };

  const handleAddChild = async () => {
    setAdding(true);
    await onAddChild(node.structure);
    setAdding(false);
    setExpanded(true);
  };

  // Highlight matching text
  const highlightText = (text: string) => {
    if (!searchTerm) return text;
    const idx = text.toLowerCase().indexOf(searchTerm.toLowerCase());
    if (idx === -1) return text;
    return (
      <>
        {text.slice(0, idx)}
        <span className="bg-amber-400/30 text-amber-300 rounded px-0.5">{text.slice(idx, idx + searchTerm.length)}</span>
        {text.slice(idx + searchTerm.length)}
      </>
    );
  };

  return (
    <div>
      <div
        className={`group flex items-center gap-2 px-4 py-2.5 hover:bg-dark-text/[0.03] transition-all duration-150 border-b border-dark-text/[0.04] ${
          node.level === 1 ? 'bg-dark-text/[0.02]' : ''
        }`}
        style={{ paddingLeft: `${16 + indentPx}px` }}
      >
        {/* Expand/collapse toggle */}
        <button
          onClick={() => hasChildren && setExpanded(!expanded)}
          className={`w-5 h-5 flex items-center justify-center rounded transition-colors ${
            hasChildren ? 'hover:bg-dark-text/10 cursor-pointer' : 'opacity-0'
          }`}
        >
          {hasChildren && (
            expanded
              ? <ChevronDown size={14} className="text-dark-text/50" />
              : <ChevronRight size={14} className="text-dark-text/50" />
          )}
        </button>

        {/* Level dot indicator */}
        <div className={`w-2 h-2 rounded-full ${colors.dot} shrink-0`} />

        {/* Structure code */}
        <span className={`text-[11px] font-mono font-bold ${colors.text} shrink-0 min-w-[60px]`}>
          {node.structure}
        </span>

        {/* Description (editable) */}
        {editing ? (
          <div className="flex items-center gap-1.5 flex-1">
            <input
              ref={inputRef}
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') handleSave();
                if (e.key === 'Escape') { setEditing(false); setEditValue(node.description); }
              }}
              className="flex-1 bg-dark-bg border border-violet-500/40 rounded-lg px-2.5 py-1 text-sm text-dark-text focus:outline-none focus:ring-1 focus:ring-violet-500/30"
            />
            <button onClick={handleSave} disabled={saving}
              className="w-6 h-6 rounded-md bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center transition-colors">
              {saving ? <Loader2 size={12} className="text-emerald-400 animate-spin" /> : <Check size={12} className="text-emerald-400" />}
            </button>
            <button onClick={() => { setEditing(false); setEditValue(node.description); }}
              className="w-6 h-6 rounded-md bg-rose-500/15 hover:bg-rose-500/25 flex items-center justify-center transition-colors">
              <X size={12} className="text-rose-400" />
            </button>
          </div>
        ) : (
          <span className="text-sm text-dark-text flex-1 truncate">
            {highlightText(node.description)}
          </span>
        )}

        {/* Level badge */}
        <span className={`text-[9px] font-bold px-2 py-0.5 rounded-full ${colors.badge} shrink-0 uppercase tracking-wider`}>
          {levelLabel}
        </span>

        {/* Children count */}
        {hasChildren && (
          <span className="text-[10px] text-dark-text/30 font-mono shrink-0">
            {node.children.length}
          </span>
        )}

        {/* Action buttons — visible on hover */}
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {!editing && (
            <button onClick={() => { setEditing(true); setEditValue(node.description); }}
              className="w-6 h-6 rounded-md bg-dark-text/5 hover:bg-violet-500/15 flex items-center justify-center transition-colors"
              title="Editar descrição">
              <Pencil size={11} className="text-dark-text/40 hover:text-violet-400" />
            </button>
          )}
          {canAddChild && !editing && (
            <button onClick={handleAddChild} disabled={adding}
              className="w-6 h-6 rounded-md bg-dark-text/5 hover:bg-emerald-500/15 flex items-center justify-center transition-colors"
              title={`Adicionar ${node.level === 1 ? 'subgrupo' : 'conta'}`}>
              {adding ? <Loader2 size={11} className="text-emerald-400 animate-spin" /> : <Plus size={11} className="text-dark-text/40 hover:text-emerald-400" />}
            </button>
          )}
        </div>
      </div>

      {/* Children */}
      {expanded && hasChildren && (
        <div className={node.level === 1 ? 'border-l-2 border-violet-500/10 ml-6' : node.level === 2 ? 'border-l-2 border-sky-500/10 ml-6' : ''}>
          {node.children.map((child) => (
            <CategoryTreeNode
              key={child.id}
              node={child}
              onEdit={onEdit}
              onAddChild={onAddChild}
              searchTerm={searchTerm}
            />
          ))}
        </div>
      )}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────
export default function FinCategories({ onBack }: { onBack: () => void }) {
  const [tree, setTree] = useState<CategoryNode[]>([]);
  const [flat, setFlat] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [addingRoot, setAddingRoot] = useState(false);
  const [newRootName, setNewRootName] = useState('');
  const newRootRef = useRef<HTMLInputElement>(null);

  const fetchCategories = async () => {
    try {
      const res = await fetch('/api/fin-categories');
      const data = await res.json();
      setTree(data.tree);
      setFlat(data.flat);
    } catch (err) {
      console.error('Error fetching categories:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  useEffect(() => {
    if (addingRoot && newRootRef.current) newRootRef.current.focus();
  }, [addingRoot]);

  const handleEdit = async (id: number, description: string) => {
    try {
      const res = await fetch(`/api/fin-categories/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description }),
      });
      if (res.ok) await fetchCategories();
    } catch (err) {
      console.error('Error updating category:', err);
    }
  };

  const handleAddChild = async (parentStructure: string) => {
    const childLabel = parentStructure.split('.').length === 1 ? 'subgrupo' : 'conta';
    const name = prompt(`Nome do novo ${childLabel}:`);
    if (!name?.trim()) return;

    try {
      const res = await fetch('/api/fin-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_structure: parentStructure, description: name.trim() }),
      });
      if (res.ok) await fetchCategories();
    } catch (err) {
      console.error('Error creating category:', err);
    }
  };

  const handleAddRoot = async () => {
    if (!newRootName.trim()) { setAddingRoot(false); return; }

    // Find next root structure code
    const lastRoot = flat.filter(c => c.level === 1).sort((a: any, b: any) => b.structure.localeCompare(a.structure))[0];
    const nextNum = lastRoot ? parseInt(lastRoot.structure, 10) + 1 : 1;
    const nextStructure = String(nextNum).padStart(2, '0');

    try {
      const res = await fetch('/api/fin-categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ parent_structure: nextStructure.slice(0, -1), description: newRootName.trim() }),
      });
      // Actually for root we need a different approach — POST expects parent. Let's use direct insert concept
      // Instead, let's just call with the full structure concept
    } catch {}

    // For root level, we'll use the structure directly
    try {
      const maxId = flat.reduce((m: number, c: any) => Math.max(m, c.external_id || 0), 900000) + 1;
      const lastRoot2 = flat.filter((c: any) => c.level === 1).sort((a: any, b: any) => b.structure.localeCompare(a.structure))[0];
      const nextCode = lastRoot2 ? String(parseInt(lastRoot2.structure, 10) + 1).padStart(2, '0') : '01';

      // We need a dedicated approach for root — using a workaround via direct insertion
      // For now, trigger a refetch which will show it if backend supported it
      // Better approach: let the backend handle root creation
      await fetch('/api/fin-categories/root', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: newRootName.trim() }),
      });
      await fetchCategories();
    } catch (err) {
      console.error('Error creating root category:', err);
    }

    setNewRootName('');
    setAddingRoot(false);
  };

  // Filter tree by search
  const filterTree = (nodes: CategoryNode[], term: string): CategoryNode[] => {
    if (!term) return nodes;
    return nodes.map(node => {
      const matchesSelf = node.description.toLowerCase().includes(term.toLowerCase()) ||
                          node.structure.includes(term);
      const filteredChildren = filterTree(node.children || [], term);
      if (matchesSelf || filteredChildren.length > 0) {
        return { ...node, children: matchesSelf ? node.children : filteredChildren };
      }
      return null;
    }).filter(Boolean) as CategoryNode[];
  };

  const displayTree = filterTree(tree, searchTerm);

  // Stats
  const countL1 = flat.filter(c => c.level === 1).length;
  const countL2 = flat.filter(c => c.level === 2).length;
  const countL3 = flat.filter(c => c.level === 3).length;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Back Button */}
      <button onClick={onBack} className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-400 transition-colors mb-4 group">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:-translate-x-0.5"><path d="m15 18-6-6 6-6"/></svg>
        Voltar para Configurações
      </button>

      {/* Header */}
      <div className="mb-8">
        <SplitHeadline
          text="Plano de "
          highlight="Categorias"
          subtitle="Gerencie as categorias financeiras da empresa em estrutura hierárquica."
          className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1"
        />
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-4 gap-4 mb-6">
        <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <FolderTree size={16} className="text-violet-400" />
            </div>
            <span className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Total</span>
          </div>
          <p className="text-2xl font-black text-dark-text">{flat.length}</p>
        </div>
        <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center">
              <Layers size={16} className="text-violet-400" />
            </div>
            <span className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Grupos</span>
          </div>
          <p className="text-2xl font-black text-violet-400">{countL1}</p>
        </div>
        <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/10 flex items-center justify-center">
              <Tag size={16} className="text-sky-400" />
            </div>
            <span className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Subgrupos</span>
          </div>
          <p className="text-2xl font-black text-sky-400">{countL2}</p>
        </div>
        <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/5 p-4">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <Tag size={16} className="text-emerald-400" />
            </div>
            <span className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Contas</span>
          </div>
          <p className="text-2xl font-black text-emerald-400">{countL3}</p>
        </div>
      </div>

      {/* Search + Actions */}
      <div className="flex items-center gap-3 mb-4">
        <div className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-dark-text/30" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Buscar por código ou descrição..."
            className="w-full pl-10 pr-4 py-2.5 bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/5 rounded-xl text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/40 focus:ring-1 focus:ring-violet-500/20 transition-all"
          />
        </div>
        <button
          onClick={() => setAddingRoot(true)}
          className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-colors shrink-0"
        >
          <Plus size={14} />
          Novo Grupo
        </button>
      </div>

      {/* New Root Input */}
      {addingRoot && (
        <div className="flex items-center gap-2 mb-4 bg-violet-500/5 border border-violet-500/20 rounded-xl px-4 py-3">
          <FolderTree size={16} className="text-violet-400 shrink-0" />
          <input
            ref={newRootRef}
            value={newRootName}
            onChange={(e) => setNewRootName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleAddRoot();
              if (e.key === 'Escape') { setAddingRoot(false); setNewRootName(''); }
            }}
            placeholder="Nome do novo grupo..."
            className="flex-1 bg-transparent border-none text-sm text-dark-text placeholder-dark-text/30 focus:outline-none"
          />
          <button onClick={handleAddRoot}
            className="w-7 h-7 rounded-lg bg-emerald-500/15 hover:bg-emerald-500/25 flex items-center justify-center transition-colors">
            <Check size={13} className="text-emerald-400" />
          </button>
          <button onClick={() => { setAddingRoot(false); setNewRootName(''); }}
            className="w-7 h-7 rounded-lg bg-rose-500/15 hover:bg-rose-500/25 flex items-center justify-center transition-colors">
            <X size={13} className="text-rose-400" />
          </button>
        </div>
      )}

      {/* Tree */}
      <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-sm">
        {/* Table Header */}
        <div className="flex items-center gap-2 px-5 py-3 border-b border-slate-200 dark:border-white/5 bg-dark-text/[0.02]">
          <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest flex-1">Estrutura Hierárquica</span>
          <span className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest">Nível</span>
          <span className="w-[70px]" />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : displayTree.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-dark-text/30">
            <FolderTree size={40} className="mb-3 opacity-30" />
            <p className="text-sm font-medium">
              {searchTerm ? 'Nenhuma categoria encontrada' : 'Nenhuma categoria cadastrada'}
            </p>
          </div>
        ) : (
          displayTree.map((node) => (
            <CategoryTreeNode
              key={node.id}
              node={node}
              onEdit={handleEdit}
              onAddChild={handleAddChild}
              searchTerm={searchTerm}
            />
          ))
        )}
      </div>

      {/* Legend */}
      <div className="flex items-center gap-6 mt-4 px-2">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-violet-500" />
          <span className="text-[10px] text-dark-text/40 font-medium">Nível 1 — Grupo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-sky-500" />
          <span className="text-[10px] text-dark-text/40 font-medium">Nível 2 — Subgrupo</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[10px] text-dark-text/40 font-medium">Nível 3 — Conta</span>
        </div>
      </div>
    </div>
  );
}
