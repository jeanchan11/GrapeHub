import React, { useState, useEffect, useRef } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, Check, GripVertical, X, Settings, Save, ChevronDown, MessageSquare, FileText } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import OptionPicker from './ui/OptionPicker';
import { Modal } from './ui/Modal';
import { CarregandoBloco } from './LoadingSpinner';

interface ChecklistItem {
  id: number;
  client_id: string;
  item: string;
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
  block: 'diretoria' | 'gerente';
  notes?: string;
}

interface TemplateItem {
  id: number;
  item: string;
  order_index: number;
  active: boolean;
  block: 'diretoria' | 'gerente';
  notes?: string;
}

interface CrmChecklistProps {
  clientId: string;
  onCompleteExit: () => void;
  /** Botão extra no cabeçalho (ex.: Arquivar cliente). */
  acaoExtra?: React.ReactNode;
}

const BLOCKS = [
  { id: 'diretoria' as const, label: 'Diretoria', hex: '#8b5cf6', color: 'violet', bg: 'bg-violet-500/10', border: 'border-violet-500/30', text: 'text-violet-500', dot: 'bg-violet-500' },
  { id: 'gerente' as const, label: 'Gerente Operacional', hex: '#38bdf8', color: 'blue', bg: 'bg-blue-500/10', border: 'border-blue-500/30', text: 'text-blue-400', dot: 'bg-blue-400' },
];

// ── Template Editor Modal ─────────────────────────────
const TemplateModal: React.FC<{ onClose: () => void }> = ({ onClose }) => {
  const [items, setItems] = useState<TemplateItem[]>([]);
  const [newText, setNewText] = useState('');
  const [newBlock, setNewBlock] = useState<'diretoria' | 'gerente'>('diretoria');
  const [saving, setSaving] = useState(false);
  const [draggingId, setDraggingId] = useState<number | null>(null);
  const [dragOverId, setDragOverId] = useState<number | null>(null);
  const [editingNotes, setEditingNotes] = useState<TemplateItem | null>(null);
  const [editingNotesText, setEditingNotesText] = useState('');
  const [savingNotesTmpl, setSavingNotesTmpl] = useState(false);

  useEffect(() => {
    fetch('/api/crm-checklist-template')
      .then(r => r.json())
      .then(data => setItems(data.map((i: any) => ({ ...i, block: i.block || 'diretoria' }))))
      .catch(console.error);
  }, []);

  const handleAdd = async () => {
    if (!newText.trim()) return;
    setSaving(true);
    try {
      const res = await fetch('/api/crm-checklist-template', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ item: newText.trim(), order_index: items.length, block: newBlock })
      });
      if (res.ok) {
        const created = await res.json();
        setItems(prev => [...prev, { ...created, block: created.block || 'diretoria' }]);
        setNewText('');
      }
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number) => {
    await fetch(`/api/crm-checklist-template/${id}`, { method: 'DELETE' });
    setItems(prev => prev.filter(i => i.id !== id));
  };

  const handleChangeBlock = async (item: TemplateItem, block: 'diretoria' | 'gerente') => {
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, block } : i));
    await fetch(`/api/crm-checklist-template/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ block })
    });
  };

  const handleDragStart = (id: number) => setDraggingId(id);
  const handleDragOver = (e: React.DragEvent, id: number) => { e.preventDefault(); setDragOverId(id); };
  const handleDrop = (e: React.DragEvent, targetId: number) => {
    e.preventDefault();
    if (draggingId === null || draggingId === targetId) return;
    const fromIdx = items.findIndex(i => i.id === draggingId);
    const toIdx = items.findIndex(i => i.id === targetId);
    const updated = [...items];
    const [moved] = updated.splice(fromIdx, 1);
    updated.splice(toIdx, 0, moved);
    setItems(updated);
    setDraggingId(null);
    setDragOverId(null);
  };

  const [saveSuccess, setSaveSuccess] = useState(false);

  const handleSaveOrder = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const results = await Promise.all(
        items.map((item, index) =>
          fetch(`/api/crm-checklist-template/${item.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ order_index: index, block: item.block })
          }).then(async r => {
            if (!r.ok) {
              const text = await r.text();
              console.error(`PATCH failed for item ${item.id}:`, text);
            }
            return r;
          })
        )
      );

      const allOk = results.every(r => r.ok);
      if (allOk) {
        setSaveSuccess(true);
        setTimeout(() => onClose(), 600);
      }
    } catch (err) {
      console.error('Failed to save order:', err);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
    <Modal isOpen onClose={onClose} semCabecalho semPadding maxWidth="max-w-lg" className="max-h-[85vh]" fecharAoClicarFora={false} fecharComEsc={false}>
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-white/10">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Settings size={16} className="text-violet-500" />
            </div>
            <div>
              <h2 className="text-base font-bold text-gray-900 dark:text-white">Modelo Padrão</h2>
              <p className="text-[11px] text-slate-500">Edite o template para novos processos de saída</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-gray-900 dark:hover:text-white transition-colors"><X size={18} /></button>
        </div>

        {/* List */}
        <div className="flex-1 min-h-0 overflow-y-auto p-4 space-y-1">
          {BLOCKS.map(block => {
            const blockItems = items.filter(i => i.block === block.id);
            return (
              <div key={block.id} className="mb-4">
                <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${block.bg} border ${block.border} mb-2`}>
                  <div className={`w-2 h-2 rounded-full ${block.dot}`} />
                  <span className={`text-[10px] font-bold uppercase tracking-widest ${block.text}`}>{block.label}</span>
                  <span className="text-[10px] text-slate-500 ml-auto">{blockItems.length} itens</span>
                </div>
                {blockItems.map(item => (
                  <div
                    key={item.id}
                    draggable
                    onDragStart={() => handleDragStart(item.id)}
                    onDragOver={(e) => handleDragOver(e, item.id)}
                    onDrop={(e) => handleDrop(e, item.id)}
                    className={`flex items-center gap-2 p-3 rounded-xl border transition-all cursor-grab active:cursor-grabbing mb-1 ${
                      dragOverId === item.id
                        ? 'border-violet-500/50 bg-violet-500/5'
                        : 'border-gray-100 dark:border-white/5 hover:border-gray-200 dark:hover:border-white/10 bg-white dark:bg-white/[0.03]'
                    }`}
                  >
                    <GripVertical size={14} className="text-slate-400 shrink-0" />
                    <div className="flex-1 min-w-0">
                      <span className="text-sm text-gray-700 dark:text-slate-300 leading-snug block">{item.item}</span>
                      {item.notes && (
                        <p className="text-[10px] text-slate-500 mt-0.5 truncate">{item.notes}</p>
                      )}
                    </div>
                    <button
                      title="Editar observação"
                      onClick={e => {
                        e.stopPropagation();
                        setEditingNotes(item);
                        setEditingNotesText(item.notes || '');
                      }}
                      className={`shrink-0 transition-colors ${
                        item.notes ? 'text-violet-500 hover:text-violet-400' : 'text-slate-300 hover:text-violet-500'
                      }`}
                    >
                      <MessageSquare size={13} />
                    </button>
                    <OptionPicker
                      value={item.block === 'diretoria' ? 'Diretoria' : 'Gerente'}
                      onChange={(val) => handleChangeBlock(item, (val === 'Gerente' ? 'gerente' : 'diretoria') as any)}
                      options={[
                        { label: 'Diretoria', color: '#8b5cf6' },
                        { label: 'Gerente', color: '#3b82f6' },
                      ]}
                      placeholder="Bloco"
                      compact
                    />
                    <button onClick={() => handleDelete(item.id)} className="text-slate-400 hover:text-rose-500 transition-colors shrink-0">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {blockItems.length === 0 && (
                  <p className="text-xs text-slate-500 text-center py-2 italic">Nenhum item neste bloco</p>
                )}
              </div>
            );
          })}
        </div>

        {/* Add new */}
        <div className="px-4 pb-4 pt-2 border-t border-gray-100 dark:border-white/10">
          <div className="flex gap-2">
            <OptionPicker
              value={newBlock === 'diretoria' ? 'Diretoria' : 'Gerente'}
              onChange={(val) => setNewBlock((val === 'Gerente' ? 'gerente' : 'diretoria') as any)}
              options={[
                { label: 'Diretoria', color: '#8b5cf6' },
                { label: 'Gerente', color: '#3b82f6' },
              ]}
              placeholder="Bloco"
              compact
            />
            <input
              type="text"
              value={newText}
              onChange={e => setNewText(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleAdd()}
              placeholder="Novo item do template..."
              className="flex-1 text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-gray-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500/50"
            />
            <button
              onClick={handleAdd}
              disabled={!newText.trim() || saving}
              className="px-3 py-2 bg-violet-500 hover:bg-violet-600 text-white rounded-xl text-xs font-bold transition-colors disabled:opacity-50 flex items-center gap-1"
            >
              <Plus size={14} />
            </button>
          </div>
        </div>

        {/* Footer - Save button */}
        <div className="px-4 pb-4 pt-0 flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-white/10 text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSaveOrder}
            disabled={saving || saveSuccess}
            className={`flex-1 py-2.5 rounded-xl text-sm font-bold transition-colors flex items-center justify-center gap-2 ${
              saveSuccess
                ? 'bg-emerald-500 text-white'
                : 'bg-violet-500 hover:bg-violet-600 text-white disabled:opacity-50'
            }`}
          >
            {saveSuccess ? (
              <><Check size={14} /> Salvo!</>
            ) : saving ? (
              <><div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
            ) : (
              <><Save size={14} /> Salvar</>
            )}
          </button>
        </div>
    </Modal>

    {/* Notes Edit Modal (Template) */}
    {editingNotes && (
      <Modal isOpen onClose={() => setEditingNotes(null)} semCabecalho semPadding maxWidth="max-w-sm" fecharAoClicarFora={false} fecharComEsc={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-violet-500" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Observação do Template</span>
            </div>
            <button onClick={() => setEditingNotes(null)} className="text-slate-400 hover:text-gray-900 dark:hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-slate-500 mb-2 font-medium">{editingNotes.item}</p>
            <textarea
              autoFocus
              value={editingNotesText}
              onChange={e => setEditingNotesText(e.target.value)}
              placeholder="Adicione uma observação para este item do template..."
              rows={4}
              className="w-full text-sm bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-gray-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500/50 resize-none transition-all"
            />
          </div>
          <div className="px-5 pb-4 flex gap-2">
            <button
              onClick={() => setEditingNotes(null)}
              className="flex-1 py-2 rounded-xl text-sm font-bold border border-gray-200 dark:border-white/10 text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
            >
              Cancelar
            </button>
            <button
              onClick={async () => {
                setSavingNotesTmpl(true);
                setItems(prev => prev.map(i => i.id === editingNotes.id ? { ...i, notes: editingNotesText } : i));
                await fetch(`/api/crm-checklist-template/${editingNotes.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ notes: editingNotesText })
                });
                setSavingNotesTmpl(false);
                setEditingNotes(null);
              }}
              disabled={savingNotesTmpl}
              className="flex-1 py-2 rounded-xl text-sm font-bold bg-violet-500 hover:bg-violet-600 text-white transition-colors disabled:opacity-50 flex items-center justify-center gap-1.5"
            >
              {savingNotesTmpl ? (
                <><div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Salvando...</>
              ) : (
                <><Check size={13} /> Salvar</>
              )}
            </button>
          </div>
      </Modal>
    )}
    </>
  );
};

// ── ChecklistBlock ────────────────────────────────────
const ChecklistBlock: React.FC<{
  block: typeof BLOCKS[0];
  items: ChecklistItem[];
  onToggle: (item: ChecklistItem) => void;
  onDrop: (itemId: number, targetBlock: 'diretoria' | 'gerente') => void;
  onAddItem: (text: string, block: 'diretoria' | 'gerente') => void;
  onSaveNotes: (item: ChecklistItem, notes: string) => void;
}> = ({ block, items, onToggle, onDrop, onAddItem, onSaveNotes }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const [newText, setNewText] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [notesItem, setNotesItem] = useState<ChecklistItem | null>(null);
  const [notesText, setNotesText] = useState('');
  const [savingNotes, setSavingNotes] = useState(false);

  const completedCount = items.filter(i => i.completed).length;

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    const itemId = parseInt(e.dataTransfer.getData('itemId'));
    if (!isNaN(itemId)) onDrop(itemId, block.id);
  };

  return (
    <>
    <div
      onDragOver={e => { e.preventDefault(); setIsDragOver(true); }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`rounded-xl transition-colors ${isDragOver ? 'bg-violet-500/5 ring-1 ring-violet-500/30' : ''}`}
    >
      {/* Cabeçalho do bloco: nome, contagem e barrinha */}
      <div className="flex items-center gap-3 px-1 pb-2">
        <span className="w-2 h-2 rounded-full" style={{ background: block.hex }} />
        <span className="text-[13px] font-semibold text-gray-900 dark:text-white">{block.label}</span>
        <span className="text-[12px] text-slate-400">{completedCount}/{items.length}</span>
        <span className="ml-auto h-1 w-24 rounded-full bg-gray-100 dark:bg-white/5 overflow-hidden">
          <span className="block h-full rounded-full transition-all duration-500" style={{ width: `${items.length ? (completedCount / items.length) * 100 : 0}%`, background: block.hex }} />
        </span>
      </div>

      <div className="rounded-xl border border-gray-200 dark:border-white/5 overflow-hidden">
        {items.length === 0 && (
          <div className="p-5 text-center text-[12.5px] text-slate-400">
            {isDragOver ? 'Solte aqui' : 'Nenhum item neste bloco'}
          </div>
        )}
        {items.map(item => (
          <div
            key={item.id}
            draggable
            onDragStart={e => e.dataTransfer.setData('itemId', String(item.id))}
            className="group flex items-center gap-3 px-3 py-2.5 border-b border-gray-100 dark:border-white/5 last:border-b-0 hover:bg-gray-50 dark:hover:bg-white/[0.02] transition-colors"
          >
            <GripVertical size={13} className="-ml-1 text-slate-300 dark:text-slate-600 shrink-0 opacity-0 group-hover:opacity-100 cursor-grab active:cursor-grabbing transition-opacity" />
            <button onClick={() => onToggle(item)} className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-violet-500 transition-colors focus:outline-none">
              {item.completed ? <CheckCircle2 size={17} className="text-emerald-500" /> : <Circle size={17} />}
            </button>
            <div className="flex-1 min-w-0 cursor-pointer" onClick={() => { setNotesItem(item); setNotesText(item.notes || ''); }}>
              <p className={`text-[13px] leading-snug truncate ${item.completed ? 'text-slate-400 line-through' : 'text-gray-800 dark:text-slate-200'}`} title={item.item}>
                {item.item}
              </p>
              {item.completed && item.completed_by ? (
                <p className="text-[11px] text-slate-400 truncate">por {item.completed_by}</p>
              ) : item.notes ? (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">{item.notes}</p>
              ) : null}
            </div>
            {item.notes && (
              <button
                onClick={() => { setNotesItem(item); setNotesText(item.notes || ''); }}
                title="Ver observação"
                className="shrink-0 text-slate-300 dark:text-slate-600 hover:text-violet-500 transition-colors"
              >
                <MessageSquare size={13} />
              </button>
            )}
          </div>
        ))}

        {/* Adicionar item */}
        <div className="px-3 py-2 border-t border-gray-100 dark:border-white/5">
          {isAdding ? (
            <div className="flex items-center gap-2">
              <input
                type="text"
                value={newText}
                onChange={e => setNewText(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter' && newText.trim()) { onAddItem(newText.trim(), block.id); setNewText(''); setIsAdding(false); }
                  if (e.key === 'Escape') { setIsAdding(false); setNewText(''); }
                }}
                placeholder="Novo item..."
                className="flex-1 text-[13px] bg-transparent outline-none text-gray-800 dark:text-white placeholder:text-slate-400"
                autoFocus
              />
              <button onClick={() => { if (newText.trim()) { onAddItem(newText.trim(), block.id); setNewText(''); } setIsAdding(false); }} className="text-violet-500 hover:text-violet-400"><Check size={14} /></button>
              <button onClick={() => { setIsAdding(false); setNewText(''); }} className="text-slate-400 hover:text-slate-600"><X size={14} /></button>
            </div>
          ) : (
            <button onClick={() => setIsAdding(true)} className="flex items-center gap-1.5 text-[12px] text-slate-400 hover:text-violet-500 transition-colors">
              <Plus size={13} /> Adicionar item
            </button>
          )}
        </div>
      </div>
    </div>

    {/* Notes Popup */}
    {notesItem && (
      <Modal isOpen onClose={() => setNotesItem(null)} semCabecalho semPadding maxWidth="max-w-sm" fecharAoClicarFora={false}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 dark:border-white/10">
            <div className="flex items-center gap-2">
              <MessageSquare size={16} className="text-violet-500" />
              <span className="text-sm font-bold text-gray-900 dark:text-white">Observação</span>
            </div>
            <button onClick={() => setNotesItem(null)} className="text-slate-400 hover:text-gray-900 dark:hover:text-white">
              <X size={16} />
            </button>
          </div>
          <div className="px-5 py-3">
            <p className="text-xs text-slate-500 mb-3 font-medium">{notesItem.item}</p>
            {notesText ? (
              <p className="text-sm text-gray-900 dark:text-white whitespace-pre-wrap leading-relaxed">
                {notesText}
              </p>
            ) : (
              <p className="text-sm text-slate-400 italic">Sem observação para esta tarefa</p>
            )}
          </div>
      </Modal>
    )}
    </>
  );
};

// ── Main Component ────────────────────────────────────
const CrmChecklist: React.FC<CrmChecklistProps> = ({ clientId, onCompleteExit, acaoExtra }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [showTemplateModal, setShowTemplateModal] = useState(false);
  const [isApplying, setIsApplying] = useState(false);
  const [showApplyConfirm, setShowApplyConfirm] = useState(false);

  // Trava contra criar o checklist duas vezes: o efeito roda em dobro no modo de
  // desenvolvimento (StrictMode) e ao reabrir o popup rápido — foi assim que o JP ANTUNES
  // ganhou 26 itens (13 em dobro) em 13/11/2026.
  const criandoPara = useRef<string | null>(null);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/crm-checklist?client_id=${clientId}`);
      if (res.ok) {
        const data: ChecklistItem[] = await res.json();
        if (data.length === 0) {
          if (criandoPara.current === clientId) return;
          criandoPara.current = clientId;
          await createFromTemplate();
        } else {
          setItems(data.map(i => ({ ...i, block: (i.block as any) || 'diretoria' })));
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error('Error fetching checklist:', err);
      setIsLoading(false);
    }
  };

  const createFromTemplate = async () => {
    try {
      const tmplRes = await fetch('/api/crm-checklist-template');
      const tmpl: TemplateItem[] = tmplRes.ok ? await tmplRes.json() : [];
      const created: ChecklistItem[] = [];
      for (const t of tmpl.filter(t => t.active !== false)) {
        const res = await fetch('/api/crm-checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, item: t.item, block: t.block || 'diretoria', notes: t.notes || null })
        });
        if (res.ok) created.push(await res.json());
      }
      setItems(created.map(i => ({ ...i, block: (i.block as any) || 'diretoria' })));
    } catch (err) {
      console.error('Error creating from template:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => { if (clientId) fetchItems(); }, [clientId]);

  const handleToggle = async (item: ChecklistItem) => {
    if (!user) return;
    const newCompleted = !item.completed;
    const by = newCompleted ? (user.displayName || user.email) : null;
    const at = newCompleted ? new Date().toISOString() : null;
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, completed: newCompleted, completed_by: by || undefined, completed_at: at || undefined } : i));
    try {
      await fetch(`/api/crm-checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ completed: newCompleted, completed_by: by, completed_at: at })
      });
      // Histórico do cliente: registra o que foi feito na saída (desmarcar também, para não sumir)
      fetch(`/api/clientes/${encodeURIComponent(clientId)}/historico`, {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ type: 'Saída', content: newCompleted ? `Checklist de saída: concluiu "${item.item}"` : `Checklist de saída: desmarcou "${item.item}"`, meta: { evento: 'checklist', item_id: item.id, concluido: newCompleted } }),
              }).catch(() => {});
    } catch { fetchItems(); }
  };

  const handleDrop = async (itemId: number, targetBlock: 'diretoria' | 'gerente') => {
    const item = items.find(i => i.id === itemId);
    if (!item || item.block === targetBlock) return;
    setItems(prev => prev.map(i => i.id === itemId ? { ...i, block: targetBlock } : i));
    try {
      await fetch(`/api/crm-checklist/${itemId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ block: targetBlock })
      });
    } catch { fetchItems(); }
  };

  const handleAddItem = async (text: string, block: 'diretoria' | 'gerente') => {
    try {
      const res = await fetch('/api/crm-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, item: text, block })
      });
      if (res.ok) {
        const newItem = await res.json();
        setItems(prev => [...prev, { ...newItem, block: newItem.block || 'diretoria' }]);
      }
    } catch (err) { console.error(err); }
  };

  const handleSaveNotes = async (item: ChecklistItem, notes: string) => {
    // Update local state
    setItems(prev => prev.map(i => i.id === item.id ? { ...i, notes } : i));
    // Persist to DB
    await fetch(`/api/crm-checklist/${item.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ notes })
    });
  };

  const handleApplyTemplate = async () => {
    setIsApplying(true);
    setShowApplyConfirm(false);
    try {
      const res = await fetch(`/api/crm-checklist/apply-template/${clientId}`, {
        method: 'POST'
      });
      if (res.ok) {
        const newItems: ChecklistItem[] = await res.json();
        setItems(newItems.map(i => ({ ...i, block: (i.block as any) || 'diretoria' })));
      }
    } catch (err) {
      console.error('Error applying template:', err);
    } finally {
      setIsApplying(false);
    }
  };

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progress = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const isAllDone = totalCount > 0 && completedCount === totalCount;

  if (isLoading) return (
    <CarregandoBloco className="py-12" />
  );

  return (
    <div className="space-y-4">
      {/* Cabeçalho: progresso à esquerda; modelo e arquivar à direita, discretos */}
      <div className="flex items-end justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="text-[13px] text-slate-500 dark:text-slate-400">
            <span className="numero text-[22px] text-gray-900 dark:text-white mr-1">{completedCount}</span>
            de {totalCount} itens concluídos
          </p>
          <div className="mt-2 w-full h-1.5 bg-gray-100 dark:bg-white/5 rounded-full overflow-hidden">
            <div className={`h-full rounded-full transition-all duration-500 ease-out ${isAllDone ? 'bg-emerald-500' : 'bg-violet-500'}`} style={{ width: `${progress}%` }} />
          </div>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <button
            onClick={() => setShowApplyConfirm(true)}
            disabled={isApplying}
            title="Apagar o checklist e recriar pelo modelo padrão"
            className="h-8 px-2.5 flex items-center gap-1.5 rounded-lg text-[12.5px] text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors disabled:opacity-50"
          >
            {isApplying ? <div className="w-3 h-3 border-2 border-slate-300 border-t-violet-500 rounded-full animate-spin" /> : <FileText size={13} />}
            Recriar pelo modelo
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            title="Editar o modelo padrão"
            className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/5 transition-colors"
          >
            <Settings size={14} />
          </button>
          {acaoExtra}
        </div>
      </div>

      {/* Two blocks */}
      <div className="space-y-5">
        {BLOCKS.map(block => (
          <ChecklistBlock
            key={block.id}
            block={block}
            items={items.filter(i => i.block === block.id)}
            onToggle={handleToggle}
            onDrop={handleDrop}
            onAddItem={handleAddItem}
            onSaveNotes={handleSaveNotes}
          />
        ))}
      </div>

      {/* Complete Exit */}
      {isAllDone && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={onCompleteExit}
            className="w-full py-3 bg-emerald-500 hover:bg-emerald-600 text-white rounded-xl font-semibold text-sm transition-colors flex items-center justify-center gap-2"
          >
            <Check size={17} /> Concluir saída
          </button>
        </div>
      )}

      {/* Template Modal */}
      {showTemplateModal && <TemplateModal onClose={() => setShowTemplateModal(false)} />}

      {/* Apply Template Confirm Modal */}
      {showApplyConfirm && (
        <Modal isOpen onClose={() => setShowApplyConfirm(false)} semCabecalho semPadding maxWidth="max-w-sm" fecharAoClicarFora={false}>
            <div className="px-6 py-5">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center shrink-0">
                  <FileText size={18} className="text-amber-500" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-gray-900 dark:text-white">Aplicar Modelo Padrão</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Esta ação não pode ser desfeita</p>
                </div>
              </div>
              <p className="text-sm text-slate-500 leading-relaxed">
                O checklist atual será <span className="text-rose-500 font-semibold">apagado</span> e substituído pelo Modelo Padrão. Itens já concluídos serão perdidos.
              </p>
            </div>
            <div className="px-6 pb-5 flex gap-2">
              <button
                onClick={() => setShowApplyConfirm(false)}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold border border-gray-200 dark:border-white/10 text-slate-500 hover:text-gray-900 dark:hover:text-white transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleApplyTemplate}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors"
              >
                Confirmar
              </button>
            </div>
        </Modal>
      )}
    </div>
  );
};

export default CrmChecklist;
