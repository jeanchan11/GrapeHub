import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  Plus, X, Pencil, Trash2, FolderOpen, Users, UserPlus,
  ChevronLeft, ChevronRight, Phone, Mail, Calendar, GripVertical, Link as LinkIcon,
  Search, Briefcase, ArrowRight, MoreHorizontal, Columns, FileText, Upload, Settings,
  Trophy, XCircle, CheckCircle2, Eye, EyeOff, MoreVertical, Download, File, ScrollText
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { CandidateDetailModal } from '../components/CandidateDetailModal';

// ── Types ─────────────────────────────────────────────────────────────────────

interface HiringFolder {
  id: number;
  nome: string;
  cargo: string | null;
  cols: string[];
  created_at: string;
}

interface HiringCandidate {
  id: number;
  folder_id: number;
  nome: string;
  contato: string | null;
  acao: string | null;
  data_acao: string | null;
  col: string;
  form_data?: any;
  created_at: string;
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayStr() { return new Date().toISOString().split('T')[0]; }

function getActionBadge(acao: string | null, dataAcao: string | null): { label: string; cls: string } | null {
  if (!acao) return { label: 'Sem ação definida', cls: 'bg-blue-500/10 text-blue-400' };
  if (!dataAcao) return { label: acao, cls: 'bg-blue-500/10 text-blue-400' };
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const d = new Date(dataAcao + 'T00:00:00'); d.setHours(0, 0, 0, 0);
  const diff = Math.ceil((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return { label: `${acao} · ${Math.abs(diff)}d atrás`, cls: 'bg-amber-500/10 text-amber-400' };
  if (diff === 0) return { label: `${acao} · Hoje`, cls: 'bg-amber-500/10 text-amber-400' };
  return { label: `${acao} · ${dataAcao}`, cls: 'bg-emerald-500/10 text-emerald-400' };
}

// ── Modal Overlay ─────────────────────────────────────────────────────────────

function ModalOverlay({ onClose, title, children }: { onClose: () => void; title: string; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-black text-light-text dark:text-dark-text">{title}</h2>
          <button onClick={onClose} className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors"><X size={15} /></button>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── Documents Editor (Notion-like with Sections) ─────────────────────────────

interface HiringDocument {
  id: number;
  title: string;
  content: string;
  section: string;
  created_by: string;
  updated_at: string;
  created_at: string;
}

function DocumentsEditor({ userName }: { userName: string }) {
  const [docs, setDocs] = useState<HiringDocument[]>([]);
  const [activeDoc, setActiveDoc] = useState<HiringDocument | null>(null);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState<string | null>(null);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const titleRef = useRef<HTMLInputElement>(null);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({});
  const [addingSectionName, setAddingSectionName] = useState(false);
  const [newSectionName, setNewSectionName] = useState('');
  const sectionInputRef = useRef<HTMLInputElement>(null);
  const [confirmAction, setConfirmAction] = useState<{ msg: string; onConfirm: () => void } | null>(null);

  const loadDocs = useCallback(async () => {
    try {
      const res = await fetch('/api/hiring/documents');
      if (res.ok) {
        const data = await res.json();
        setDocs(data);
        const secs = [...new Set(data.map((d: HiringDocument) => d.section).filter(Boolean))] as string[];
        const exp: Record<string, boolean> = {};
        secs.forEach(s => { exp[s] = true; });
        setExpandedSections(prev => ({ ...exp, ...prev }));
      }
    } catch (e) { console.error(e); }
  }, []);

  useEffect(() => { loadDocs(); }, [loadDocs]);

  const sections = useMemo(() => {
    const set = new Set(docs.map(d => d.section).filter(Boolean));
    return [...set].sort();
  }, [docs]);

  const toggleSection = (s: string) => setExpandedSections(prev => ({ ...prev, [s]: !prev[s] }));

  const handleCreateDoc = async (section: string = '') => {
    try {
      const res = await fetch('/api/hiring/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title: 'Sem título', content: '', created_by: userName, section })
      });
      if (res.ok) {
        const nd = await res.json();
        setDocs(prev => [nd, ...prev]);
        setActiveDoc(nd);
        if (section) setExpandedSections(prev => ({ ...prev, [section]: true }));
        setTimeout(() => titleRef.current?.focus(), 100);
      }
    } catch (e) { console.error(e); }
  };

  const handleCreateSection = () => {
    if (!newSectionName.trim()) return;
    setExpandedSections(prev => ({ ...prev, [newSectionName.trim()]: true }));
    handleCreateDoc(newSectionName.trim());
    setNewSectionName('');
    setAddingSectionName(false);
  };

  const handleDeleteDoc = (id: number) => {
    setConfirmAction({
      msg: 'Excluir este documento?',
      onConfirm: async () => {
        try {
          await fetch(`/api/hiring/documents/${id}`, { method: 'DELETE' });
          setDocs(prev => prev.filter(d => d.id !== id));
          if (activeDoc?.id === id) setActiveDoc(null);
        } catch (e) { console.error(e); }
        setConfirmAction(null);
      }
    });
  };

  const handleDeleteSection = (section: string) => {
    const secDocs = docs.filter(d => d.section === section);
    setConfirmAction({
      msg: `Excluir a sessão "${section}" e todos os ${secDocs.length} documento(s)?`,
      onConfirm: async () => {
        try {
          for (const doc of secDocs) {
            await fetch(`/api/hiring/documents/${doc.id}`, { method: 'DELETE' });
          }
          setDocs(prev => prev.filter(d => d.section !== section));
          if (activeDoc && activeDoc.section === section) setActiveDoc(null);
          setExpandedSections(prev => { const n = { ...prev }; delete n[section]; return n; });
        } catch (e) { console.error(e); }
        setConfirmAction(null);
      }
    });
  };

  const autoSave = useCallback((doc: HiringDocument) => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(async () => {
      setSaving(true);
      try {
        await fetch(`/api/hiring/documents/${doc.id}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ title: doc.title, content: doc.content, section: doc.section })
        });
        setLastSaved(new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }));
        setDocs(prev => prev.map(d => d.id === doc.id ? { ...d, ...doc, updated_at: new Date().toISOString() } : d));
      } catch (e) { console.error(e); }
      setSaving(false);
    }, 800);
  }, []);

  const updateField = (field: 'title' | 'content', value: string) => {
    if (!activeDoc) return;
    const u = { ...activeDoc, [field]: value };
    setActiveDoc(u);
    autoSave(u);
  };

  const unsectionedDocs = docs.filter(d => !d.section);

  return (
    <div className="flex flex-1 min-h-0">
      {/* Sidebar */}
      <div className="w-[280px] shrink-0 border-r border-slate-200 dark:border-white/10 flex flex-col bg-slate-50/50 dark:bg-white/[0.02]">
        <div className="px-4 pt-4 pb-2">
          <h3 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Páginas</h3>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1 pb-2">
          {sections.map(sec => {
            const secDocs = docs.filter(d => d.section === sec);
            const open = expandedSections[sec] !== false;
            return (
              <div key={sec}>
                <div className="group flex items-center gap-1.5 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-slate-200/50 dark:hover:bg-white/5 transition-colors" onClick={() => toggleSection(sec)}>
                  <ChevronRight size={14} className={`text-slate-400 shrink-0 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                  <FolderOpen size={14} className="text-amber-500 shrink-0" />
                  <span className="text-sm font-bold text-slate-600 dark:text-slate-300 truncate flex-1">{sec}</span>
                  <span className="text-[10px] text-slate-400 font-mono shrink-0 group-hover:hidden">{secDocs.length}</span>
                  <button
                    onClick={e => { e.stopPropagation(); handleDeleteSection(sec); }}
                    className="hidden group-hover:flex w-5 h-5 rounded hover:bg-rose-500/20 hover:text-rose-400 text-slate-500 items-center justify-center transition-all shrink-0"
                    title="Excluir sessão"
                  ><Trash2 size={11} /></button>
                </div>
                {open && (
                  <div className="ml-4 pl-2 border-l border-white/5 space-y-0.5 mt-0.5">
                    {secDocs.map(doc => (
                      <div key={doc.id} onClick={() => setActiveDoc(doc)}
                        className={`group flex items-center gap-2 px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${activeDoc?.id === doc.id ? 'bg-violet-500/15 text-violet-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                        <FileText size={13} className="shrink-0" />
                        <span className="truncate flex-1">{doc.title || 'Sem título'}</span>
                        <button onClick={e => { e.stopPropagation(); handleDeleteDoc(doc.id); }} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-all shrink-0"><Trash2 size={10} /></button>
                      </div>
                    ))}
                    <button onClick={() => handleCreateDoc(sec)} className="flex items-center gap-2 px-2.5 py-1 rounded-lg text-xs text-slate-500 hover:text-violet-400 hover:bg-violet-500/10 transition-colors w-full">
                      <Plus size={12} /> Adicionar página
                    </button>
                  </div>
                )}
              </div>
            );
          })}
          {unsectionedDocs.length > 0 && (
            <div className="mt-2 pt-2 border-t border-white/5">
              {unsectionedDocs.map(doc => (
                <div key={doc.id} onClick={() => setActiveDoc(doc)}
                  className={`group flex items-center gap-2 px-3 py-1.5 rounded-lg cursor-pointer transition-colors text-sm ${activeDoc?.id === doc.id ? 'bg-violet-500/15 text-violet-400 font-bold' : 'text-slate-500 dark:text-slate-400 hover:bg-slate-200/50 dark:hover:bg-white/5'}`}>
                  <FileText size={13} className="shrink-0" />
                  <span className="truncate flex-1">{doc.title || 'Sem título'}</span>
                  <button onClick={e => { e.stopPropagation(); handleDeleteDoc(doc.id); }} className="opacity-0 group-hover:opacity-100 w-5 h-5 rounded hover:bg-rose-500/20 hover:text-rose-400 flex items-center justify-center transition-all shrink-0"><Trash2 size={10} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="p-3 border-t border-slate-200 dark:border-white/10 space-y-1">
          {addingSectionName ? (
            <div className="flex gap-1.5">
              <input ref={sectionInputRef} autoFocus value={newSectionName} onChange={e => setNewSectionName(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') handleCreateSection(); if (e.key === 'Escape') { setAddingSectionName(false); setNewSectionName(''); } }}
                placeholder="Nome da sessão..." className="flex-1 bg-dark-bg border border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500" />
              <button onClick={handleCreateSection} className="px-2.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-lg text-xs font-bold transition-colors">OK</button>
            </div>
          ) : (
            <>
              <button onClick={() => { setAddingSectionName(true); }} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-amber-400 hover:bg-amber-500/10 transition-colors">
                <FolderOpen size={14} /> Nova sessão
              </button>
              <button onClick={() => handleCreateDoc('')} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 transition-colors">
                <Plus size={14} /> Página avulsa
              </button>
            </>
          )}
        </div>
      </div>
      {/* Editor */}
      <div className="flex-1 flex flex-col overflow-hidden">
        {activeDoc ? (
          <>
            <div className="flex items-center justify-between px-6 py-2 border-b border-slate-200 dark:border-white/10 bg-slate-50/50 dark:bg-white/[0.02] shrink-0">
              <div className="flex items-center gap-2 text-xs text-slate-400">
                <span className={`w-2 h-2 rounded-full ${saving ? 'bg-amber-400' : 'bg-emerald-400'}`}></span>
                {saving ? 'Salvando...' : lastSaved ? `Salvo às ${lastSaved}` : 'Pronto'}
              </div>
              <div className="text-xs text-slate-500">
                {activeDoc.section && <span className="text-amber-400 mr-1">{activeDoc.section} /</span>}
                {activeDoc.created_by} • {new Date(activeDoc.updated_at).toLocaleDateString('pt-BR')}
              </div>
            </div>
            <div className="flex-1 overflow-y-auto px-8 sm:px-16 py-10 max-w-4xl mx-auto w-full">
              <input ref={titleRef} value={activeDoc.title} onChange={e => updateField('title', e.target.value)} placeholder="Sem título"
                className="w-full text-3xl sm:text-4xl font-extrabold text-slate-800 dark:text-white bg-transparent border-none focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 mb-6" />
              <textarea value={activeDoc.content} onChange={e => updateField('content', e.target.value)} placeholder="Comece a escrever..."
                ref={el => { if (el) { el.style.height = 'auto'; el.style.height = el.scrollHeight + 'px'; } }}
                className="w-full min-h-[400px] text-base text-slate-600 dark:text-slate-300 leading-relaxed bg-transparent border-none focus:outline-none placeholder:text-slate-300 dark:placeholder:text-slate-600 resize-none overflow-hidden" />
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText size={48} className="text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-slate-400 text-sm font-medium">Selecione um documento ou crie uma sessão</p>
              <button onClick={() => setAddingSectionName(true)} className="mt-4 px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-colors inline-flex items-center gap-2">
                <FolderOpen size={15} /> Criar Sessão
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Custom Confirm Modal */}
      {confirmAction && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
          <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-rose-400" />
              </div>
              <h3 className="text-white font-bold text-base">Confirmar Exclusão</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">{confirmAction.msg}</p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">Cancelar</button>
              <button onClick={confirmAction.onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Contracts Manager ─────────────────────────────────────────────────────────

interface HiringContract {
  id: number;
  name: string;
  description: string;
  file_name: string;
  file_type: string;
  file_size: number;
  uploaded_by: string;
  updated_at: string;
  created_at: string;
}

function formatFileSize(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function getFileIcon(type: string) {
  if (type.includes('pdf')) return { color: 'text-rose-400 bg-rose-500/10', label: 'PDF' };
  if (type.includes('word') || type.includes('document')) return { color: 'text-blue-400 bg-blue-500/10', label: 'DOC' };
  if (type.includes('sheet') || type.includes('excel')) return { color: 'text-emerald-400 bg-emerald-500/10', label: 'XLS' };
  if (type.includes('image')) return { color: 'text-amber-400 bg-amber-500/10', label: 'IMG' };
  return { color: 'text-slate-400 bg-slate-500/10', label: 'ARQ' };
}

function ContratosManager({ userName }: { userName: string }) {
  const [contracts, setContracts] = useState<HiringContract[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [search, setSearch] = useState('');
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ name: '', description: '' });
  const [confirmDelete, setConfirmDelete] = useState<HiringContract | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const loadContracts = useCallback(async () => {
    try {
      const res = await fetch('/api/hiring/contracts');
      if (res.ok) setContracts(await res.json());
    } catch (e) { console.error(e); }
    setLoading(false);
  }, []);

  useEffect(() => { loadContracts(); }, [loadContracts]);

  const handleUpload = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    setUploading(true);
    for (const file of Array.from(files)) {
      try {
        const base64 = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => {
            const result = reader.result as string;
            resolve(result.split(',')[1]); // Remove data:...;base64, prefix
          };
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });
        const res = await fetch('/api/hiring/contracts', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            name: file.name.replace(/\.[^/.]+$/, ''),
            file_name: file.name,
            file_data: base64,
            file_type: file.type,
            file_size: file.size,
            uploaded_by: userName,
          }),
        });
        if (res.ok) {
          const newContract = await res.json();
          setContracts(prev => [newContract, ...prev]);
        }
      } catch (e) { console.error('Upload error:', e); }
    }
    setUploading(false);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleDownload = (contract: HiringContract) => {
    window.open(`/api/hiring/contracts/${contract.id}/download`, '_blank');
  };

  const handleDelete = async (contract: HiringContract) => {
    try {
      await fetch(`/api/hiring/contracts/${contract.id}`, { method: 'DELETE' });
      setContracts(prev => prev.filter(c => c.id !== contract.id));
    } catch (e) { console.error(e); }
    setConfirmDelete(null);
  };

  const handleSaveEdit = async () => {
    if (!editingId) return;
    try {
      const res = await fetch(`/api/hiring/contracts/${editingId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm),
      });
      if (res.ok) {
        const updated = await res.json();
        setContracts(prev => prev.map(c => c.id === editingId ? updated : c));
      }
    } catch (e) { console.error(e); }
    setEditingId(null);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleUpload(e.dataTransfer.files);
  };

  const filtered = contracts.filter(c => {
    if (!search) return true;
    const q = search.toLowerCase();
    return c.name.toLowerCase().includes(q) || c.file_name.toLowerCase().includes(q) || (c.description || '').toLowerCase().includes(q);
  });

  return (
    <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
      {/* Top bar */}
      <div className="px-6 md:px-8 py-4 flex items-center gap-4 shrink-0">
        <div className="relative flex-1 max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar contrato…"
            className="w-full bg-light-bg dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-light-text dark:text-dark-text placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors pl-9" />
        </div>
        <input ref={fileInputRef} type="file" multiple className="hidden" onChange={e => handleUpload(e.target.files)}
          accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt,.csv,.png,.jpg,.jpeg,.webp" />
        <button onClick={() => fileInputRef.current?.click()} disabled={uploading}
          className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-violet-500/20 disabled:opacity-50">
          {uploading ? (
            <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
          ) : (
            <><Upload size={15} /> Anexar Contrato</>
          )}
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-6 md:px-8 pb-8">
        {/* Drop Zone */}
        <div
          onDragOver={e => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          className={`border-2 border-dashed rounded-2xl p-8 mb-6 text-center transition-all duration-200 ${
            dragOver
              ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
              : 'border-slate-200 dark:border-white/10 hover:border-violet-500/30'
          }`}
        >
          <Upload size={32} className={`mx-auto mb-3 transition-colors ${dragOver ? 'text-violet-400' : 'text-slate-400 dark:text-slate-600'}`} />
          <p className={`text-sm font-medium transition-colors ${dragOver ? 'text-violet-400' : 'text-slate-400'}`}>
            {dragOver ? 'Solte o arquivo aqui' : 'Arraste e solte arquivos aqui ou clique no botão acima'}
          </p>
          <p className="text-xs text-slate-500 mt-1">PDF, Word, Excel, Imagens • Máx 50MB por arquivo</p>
        </div>

        {/* Loading */}
        {loading ? (
          <div className="flex justify-center items-center h-40">
            <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center">
            <ScrollText size={32} className="text-slate-500 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">
              {search ? 'Nenhum contrato encontrado' : 'Nenhum contrato anexado'}
            </p>
            <p className="text-slate-500 text-xs mt-1">
              {search ? 'Tente outro termo de busca' : 'Clique em "Anexar Contrato" para começar'}
            </p>
          </div>
        ) : (
          <div className="grid gap-3">
            {filtered.map(contract => {
              const icon = getFileIcon(contract.file_type);
              const isEditing = editingId === contract.id;
              return (
                <div key={contract.id}
                  className="group bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-4 hover:border-violet-500/20 transition-all duration-200">
                  <div className="flex items-center gap-4">
                    {/* File type badge */}
                    <div className={`w-12 h-12 rounded-xl flex items-center justify-center shrink-0 ${icon.color}`}>
                      <span className="text-xs font-black">{icon.label}</span>
                    </div>

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      {isEditing ? (
                        <div className="space-y-2">
                          <input value={editForm.name} onChange={e => setEditForm(p => ({ ...p, name: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                            autoFocus
                            className="w-full bg-light-bg dark:bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-sm text-light-text dark:text-white focus:outline-none focus:border-violet-500/50" />
                          <input value={editForm.description} onChange={e => setEditForm(p => ({ ...p, description: e.target.value }))}
                            onKeyDown={e => { if (e.key === 'Enter') handleSaveEdit(); if (e.key === 'Escape') setEditingId(null); }}
                            placeholder="Descrição (opcional)"
                            className="w-full bg-light-bg dark:bg-dark-bg border border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-400 placeholder:text-slate-600 focus:outline-none focus:border-violet-500/50" />
                          <div className="flex gap-2">
                            <button onClick={() => setEditingId(null)} className="text-xs text-slate-400 hover:text-white px-3 py-1 rounded-lg hover:bg-white/5 transition-colors">Cancelar</button>
                            <button onClick={handleSaveEdit} className="text-xs text-white font-bold px-3 py-1 rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors">Salvar</button>
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-bold text-light-text dark:text-dark-text truncate">{contract.name}</p>
                          {contract.description && <p className="text-xs text-slate-400 truncate mt-0.5">{contract.description}</p>}
                          <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                            <span className="flex items-center gap-1"><File size={10} /> {contract.file_name}</span>
                            <span>{formatFileSize(contract.file_size)}</span>
                            <span>{contract.uploaded_by} • {new Date(contract.created_at).toLocaleDateString('pt-BR')}</span>
                          </div>
                        </>
                      )}
                    </div>

                    {/* Actions */}
                    {!isEditing && (
                      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
                        <button onClick={() => handleDownload(contract)}
                          className="w-9 h-9 rounded-xl hover:bg-violet-500/10 flex items-center justify-center text-slate-400 hover:text-violet-400 transition-colors" title="Baixar">
                          <Download size={16} />
                        </button>
                        <button onClick={() => { setEditingId(contract.id); setEditForm({ name: contract.name, description: contract.description || '' }); }}
                          className="w-9 h-9 rounded-xl hover:bg-white/5 flex items-center justify-center text-slate-400 hover:text-white transition-colors" title="Editar">
                          <Pencil size={14} />
                        </button>
                        <button onClick={() => setConfirmDelete(contract)}
                          className="w-9 h-9 rounded-xl hover:bg-rose-500/10 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors" title="Excluir">
                          <Trash2 size={14} />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Delete Confirm Modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="bg-light-card dark:bg-[#1a1a2e] border border-slate-200 dark:border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                <Trash2 size={18} className="text-rose-400" />
              </div>
              <h3 className="text-light-text dark:text-white font-bold text-base">Excluir Contrato</h3>
            </div>
            <p className="text-slate-400 text-sm mb-6 leading-relaxed">
              Excluir <strong className="text-light-text dark:text-white">{confirmDelete.name}</strong>? Esta ação não pode ser desfeita.
            </p>
            <div className="flex gap-3 justify-end">
              <button onClick={() => setConfirmDelete(null)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-light-text dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-colors">Cancelar</button>
              <button onClick={() => handleDelete(confirmDelete)} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors">Excluir</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ── Input class ───────────────────────────────────────────────────────────────

const inputCls = "w-full bg-light-bg dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-light-text dark:text-dark-text placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 transition-colors";
const labelCls = "text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest block mb-1.5";

// ── Main Component ────────────────────────────────────────────────────────────

export default function ContratacaoPage() {
  const [folders, setFolders] = useState<HiringFolder[]>([]);
  const [candidates, setCandidates] = useState<HiringCandidate[]>([]);
  const [loading, setLoading] = useState(true);
  const [folderCounts, setFolderCounts] = useState<Record<number, number>>({});
  const [activeFolder, setActiveFolder] = useState<HiringFolder | null>(null);
  const [search, setSearch] = useState('');

  // Modal states
  const [folderModal, setFolderModal] = useState<'create' | 'edit' | null>(null);
  const [candidateModal, setCandidateModal] = useState(false);
  const [editingFolder, setEditingFolder] = useState<HiringFolder | null>(null);
  const [editingCandidate, setEditingCandidate] = useState<HiringCandidate | null>(null);
  const [selectedCandidateDetails, setSelectedCandidateDetails] = useState<HiringCandidate | null>(null);

  const { currentUser } = useAuth();

  // Folder form
  const [folderForm, setFolderForm] = useState({ nome: '', cargo: '', cols: ['Inscritos', 'Entrevista', 'Teste Técnico', 'Aprovados'] });
  const [newColInput, setNewColInput] = useState('');

  // Candidate form
  const [candidateForm, setCandidateForm] = useState({ nome: '', contato: '', acao: '', data_acao: '', col: '' });

  // Drag state
  const [draggedId, setDraggedId] = useState<number | null>(null);

  // Kanban: add column inline
  const [addingCol, setAddingCol] = useState(false);
  const [newColName, setNewColName] = useState('');

  // Kanban: show/hide approved & rejected
  const [showApproved, setShowApproved] = useState(false);
  const [showRejected, setShowRejected] = useState(false);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);

  // Folder card dropdown
  const [folderMenuOpen, setFolderMenuOpen] = useState<number | null>(null);

  // Main page tabs
  const [mainTab, setMainTab] = useState<'formularios' | 'documentos' | 'contratos'>('formularios');

  // Confirm modal (shared)
  const [confirmAction, setConfirmAction] = useState<{ msg: string; onConfirm: () => void } | null>(null);

  // ── Fetch folders ──────────────────────────────────────────────────────────

  const loadFolders = useCallback(async () => {
    try {
      const res = await fetch('/api/hiring/folders');
      if (res.ok) setFolders(await res.json());
    } catch (e) { console.error('[hiring] load folders:', e); }
  }, []);

  const loadCandidates = useCallback(async (folderId: number) => {
    try {
      const res = await fetch(`/api/hiring/candidates?folder_id=${folderId}`);
      if (res.ok) setCandidates(await res.json());
    } catch (e) { console.error('[hiring] load candidates:', e); }
  }, []);

  useEffect(() => {
    loadFolders().then(async () => {
      // Load candidate counts for each folder
      try {
        const res = await fetch('/api/hiring/folders');
        if (res.ok) {
          const foldersData = await res.json();
          const counts: Record<number, number> = {};
          await Promise.all(foldersData.map(async (f: any) => {
            try {
              const cRes = await fetch(`/api/hiring/candidates?folder_id=${f.id}`);
              if (cRes.ok) {
                const cands = await cRes.json();
                counts[f.id] = cands.length;
              }
            } catch (e) { counts[f.id] = 0; }
          }));
          setFolderCounts(counts);
        }
      } catch (e) { console.error(e); }
    }).finally(() => setLoading(false));
  }, [loadFolders]);

  useEffect(() => {
    if (activeFolder) loadCandidates(activeFolder.id);
    else setCandidates([]);
  }, [activeFolder, loadCandidates]);

  // ── CRUD: Folders ──────────────────────────────────────────────────────────

  async function handleCreateFolder() {
    try {
      const res = await fetch('/api/hiring/folders', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderForm),
      });
      if (res.ok) {
        await loadFolders();
        setFolderModal(null);
        setFolderForm({ nome: '', cargo: '', cols: ['Inscritos', 'Entrevista', 'Teste Técnico', 'Aprovados'] });
      }
    } catch (e) { console.error('[hiring] create folder:', e); }
  }

  async function handleUpdateFolder() {
    if (!editingFolder) return;
    try {
      const res = await fetch(`/api/hiring/folders/${editingFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(folderForm),
      });
      if (res.ok) {
        const updated = await res.json();
        await loadFolders();
        if (activeFolder?.id === editingFolder.id) setActiveFolder(updated);
        setFolderModal(null);
        setEditingFolder(null);
      }
    } catch (e) { console.error('[hiring] update folder:', e); }
  }

  async function handleDeleteFolder(id: number) {
    if (!confirm('Excluir esta seleção e todos os candidatos?')) return;
    try {
      await fetch(`/api/hiring/folders/${id}`, { method: 'DELETE' });
      setFolders(prev => prev.filter(f => f.id !== id));
      if (activeFolder?.id === id) setActiveFolder(null);
    } catch (e) { console.error('[hiring] delete folder:', e); }
  }

  // ── CRUD: Candidates ───────────────────────────────────────────────────────

  async function handleCreateCandidate() {
    if (!activeFolder) return;
    try {
      const res = await fetch('/api/hiring/candidates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...candidateForm, folder_id: activeFolder.id }),
      });
      if (res.ok) {
        const newCandidate = await res.json();
        // Log history: candidate added
        try {
          await fetch(`/api/hiring/candidates/${newCandidate.id}/history`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              action: 'Candidato adicionado',
              details: `Adicionado na coluna: ${candidateForm.col || activeFolder.cols[0]}`,
              user_name: currentUser?.name || 'Sistema'
            }),
          });
        } catch (e) { console.error('[hiring] log history:', e); }
        await loadCandidates(activeFolder.id);
        setCandidateModal(false);
        setCandidateForm({ nome: '', contato: '', acao: '', data_acao: '', col: '' });
        setEditingCandidate(null);
      }
    } catch (e) { console.error('[hiring] create candidate:', e); }
  }

  async function handleUpdateCandidate() {
    if (!editingCandidate || !activeFolder) return;
    try {
      const res = await fetch(`/api/hiring/candidates/${editingCandidate.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(candidateForm),
      });
      if (res.ok) {
        await loadCandidates(activeFolder.id);
        setCandidateModal(false);
        setEditingCandidate(null);
        setCandidateForm({ nome: '', contato: '', acao: '', data_acao: '', col: '' });
      }
    } catch (e) { console.error('[hiring] update candidate:', e); }
  }

  async function handleDeleteCandidate(id: number) {
    if (!activeFolder) return;
    try {
      await fetch(`/api/hiring/candidates/${id}`, { method: 'DELETE' });
      setCandidates(prev => prev.filter(c => c.id !== id));
    } catch (e) { console.error('[hiring] delete candidate:', e); }
  }

  // ── Drag & Drop ────────────────────────────────────────────────────────────

  async function handleDrop(targetCol: string) {
    if (!draggedId || !activeFolder) return;
    const candidate = candidates.find(c => c.id === draggedId);
    if (!candidate || candidate.col === targetCol) { setDraggedId(null); return; }
    const fromCol = candidate.col;
    // Optimistic update
    setCandidates(prev => prev.map(c => c.id === draggedId ? { ...c, col: targetCol } : c));
    setDraggedId(null);
    try {
      await fetch(`/api/hiring/candidates/${draggedId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ col: targetCol }),
      });
      // Log history: column move
      await fetch(`/api/hiring/candidates/${draggedId}/history`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'Alterou o status',
          details: `Movido de: ${fromCol} → ${targetCol}`,
          user_name: currentUser?.name || 'Sistema'
        }),
      });
    } catch (e) {
      console.error('[hiring] drop move:', e);
      loadCandidates(activeFolder.id); // revert
    }
  }

  // ── Add column to active folder ────────────────────────────────────────────

  async function addColumnToFolder(colName: string) {
    if (!activeFolder || !colName.trim()) return;
    const newCols = [...activeFolder.cols, colName.trim()];
    try {
      const res = await fetch(`/api/hiring/folders/${activeFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeFolder, cols: newCols }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveFolder(updated);
        setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
      }
    } catch (e) { console.error('[hiring] add col:', e); }
  }

  // ── Column settings (rename / delete) ─────────────────────────────────────

  const [colSettingsOpen, setColSettingsOpen] = useState<string | null>(null);
  const [colRenaming, setColRenaming] = useState<string | null>(null);
  const [colNewName, setColNewName] = useState('');

  async function updateFolderCols(newCols: string[]) {
    if (!activeFolder) return;
    try {
      const res = await fetch(`/api/hiring/folders/${activeFolder.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...activeFolder, cols: newCols }),
      });
      if (res.ok) {
        const updated = await res.json();
        setActiveFolder(updated);
        setFolders(prev => prev.map(f => f.id === updated.id ? updated : f));
      }
    } catch (e) { console.error('[hiring] update cols:', e); }
  }

  function handleRenameColumn(oldName: string) {
    if (!colNewName.trim() || !activeFolder) return;
    const newCols = activeFolder.cols.map((c: string) => c === oldName ? colNewName.trim() : c);
    // Also update candidates that are in this column
    candidates.forEach(async (cand) => {
      if (cand.col === oldName) {
        try {
          await fetch(`/api/hiring/candidates/${cand.id}`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ ...cand, col: colNewName.trim() }),
          });
        } catch (e) { console.error(e); }
      }
    });
    setCandidates(prev => prev.map(c => c.col === oldName ? { ...c, col: colNewName.trim() } : c));
    updateFolderCols(newCols);
    setColRenaming(null);
    setColSettingsOpen(null);
  }

  function handleDeleteColumn(colName: string) {
    if (!activeFolder) return;
    const colCands = candidates.filter(c => c.col === colName);
    if (colCands.length > 0) {
      setConfirmAction({
        msg: `Excluir a etapa "${colName}"? Os ${colCands.length} candidato(s) nela serão perdidos.`,
        onConfirm: async () => {
          for (const c of colCands) {
            try { await fetch(`/api/hiring/candidates/${c.id}`, { method: 'DELETE' }); } catch (e) { console.error(e); }
          }
          setCandidates(prev => prev.filter(c => c.col !== colName));
          const newCols = activeFolder.cols.filter((c: string) => c !== colName);
          await updateFolderCols(newCols);
          setConfirmAction(null);
        }
      });
    } else {
      const newCols = activeFolder.cols.filter((c: string) => c !== colName);
      updateFolderCols(newCols);
    }
    setColSettingsOpen(null);
  }

  // ── Stats ──────────────────────────────────────────────────────────────────

  const stats = useMemo(() => {
    // Need to count candidates per folder — for folders view we can approximate from loaded data
    return [
      { label: 'Total Seleções', value: folders.length, cls: 'text-violet-400 bg-violet-500/10' },
      { label: 'Com Candidatos', value: '—', cls: 'text-emerald-400 bg-emerald-500/10' },
      { label: 'Total Candidatos', value: '—', cls: 'text-blue-400 bg-blue-500/10' },
      { label: 'Em Andamento', value: folders.length, cls: 'text-amber-400 bg-amber-500/10' },
    ];
  }, [folders]);

  // ── Filtered folders ───────────────────────────────────────────────────────

  const filteredFolders = useMemo(() => {
    if (!search) return folders;
    const q = search.toLowerCase();
    return folders.filter(f => f.nome.toLowerCase().includes(q) || (f.cargo || '').toLowerCase().includes(q));
  }, [folders, search]);

  // ═══════════════════════════════════════════════════════════════════════════
  //  STATE 2 — KANBAN VIEW
  // ═══════════════════════════════════════════════════════════════════════════

  if (activeFolder) {
    const cols = Array.isArray(activeFolder.cols) ? activeFolder.cols : [];

    return (
      <div className="min-h-screen bg-light-bg dark:bg-dark-bg transition-colors duration-300">
        {/* Header */}
        <div className="px-6 md:px-8 pt-8 pb-4 flex flex-wrap items-center justify-between gap-4">
          <div>
            <button onClick={() => setActiveFolder(null)}
              className="flex items-center gap-1.5 text-xs font-bold text-violet-400 hover:text-violet-300 mb-2 transition-colors">
              <ChevronLeft size={14} /> Voltar para Seleções
            </button>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-black tracking-tight text-light-text dark:text-dark-text">
                Contratação / <span className="text-violet-500">{activeFolder.nome}</span>
              </h1>
              {activeFolder.cargo && (
                <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-widest bg-violet-500/10 text-violet-400">
                  {activeFolder.cargo}
                </span>
              )}
            </div>
            <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
              {candidates.length} candidato{candidates.length !== 1 ? 's' : ''} · {cols.length} coluna{cols.length !== 1 ? 's' : ''}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={() => {
              setCandidateForm({ nome: '', contato: '', acao: '', data_acao: '', col: cols[0] || '' });
              setEditingCandidate(null);
              setCandidateModal(true);
            }}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-violet-500/20">
              <UserPlus size={15} /> Candidato
            </button>
            <div className="relative">
              <button onClick={() => setMoreMenuOpen(!moreMenuOpen)}
                className="w-10 h-10 rounded-xl bg-white/5 border border-white/10 hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
                <MoreVertical size={16} />
              </button>
              {moreMenuOpen && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                  <button onClick={() => { setShowApproved(!showApproved); setMoreMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                    {showApproved ? <EyeOff size={14} className="text-emerald-400" /> : <Eye size={14} className="text-slate-500" />}
                    {showApproved ? 'Ocultar aprovados' : 'Mostrar aprovados'}
                  </button>
                  <button onClick={() => { setShowRejected(!showRejected); setMoreMenuOpen(false); }}
                    className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5">
                    {showRejected ? <EyeOff size={14} className="text-rose-400" /> : <Eye size={14} className="text-slate-500" />}
                    {showRejected ? 'Ocultar reprovados' : 'Mostrar reprovados'}
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Kanban Board */}
        <div className="px-6 md:px-8 pb-8 overflow-x-auto h-[calc(100vh-140px)]">
          <div className="flex gap-4 h-full" style={{ minWidth: (cols.length + (showApproved && !cols.includes('Aprovado') ? 1 : 0) + (showRejected && !cols.includes('Reprovado') ? 1 : 0)) * 280 + 200 }}>
            {[...cols, ...(showApproved && !cols.includes('Aprovado') ? ['Aprovado'] : []), ...(showRejected && !cols.includes('Reprovado') ? ['Reprovado'] : [])].map(col => {
              const colCandidates = candidates.filter(c => {
                if (c.col !== col) return false;
                // If col is not a status column, filter out approved/rejected candidates that were moved here
                if (col === 'Aprovado' && !showApproved) return false;
                if (col === 'Reprovado' && !showRejected) return false;
                return true;
              });
              return (
                <div
                  key={col}
                  className="flex-shrink-0 w-[280px] bg-transparent flex flex-col h-full"
                  onDragOver={e => e.preventDefault()}
                  onDrop={() => handleDrop(col)}
                >
                  {/* Column header */}
                  <div className="bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-xl p-3 flex items-center justify-between mb-4 flex-shrink-0 shadow-sm relative group/header">
                    <div className="flex items-center gap-3">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center shrink-0 ${
                        col === 'Aprovado' ? 'bg-emerald-600' : col === 'Reprovado' ? 'bg-rose-600' : 'bg-violet-500'
                      }`}>
                        {col === 'Aprovado' ? <Trophy size={20} className="text-white" /> : col === 'Reprovado' ? <XCircle size={20} className="text-white" /> : <FolderOpen size={20} className="text-white" />}
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900 dark:text-white text-base leading-tight">{col}</h3>
                        <p className="text-gray-500 dark:text-slate-400 text-xs mt-0.5">{colCandidates.length} tickets</p>
                      </div>
                    </div>
                    <div className="relative">
                      <button onClick={(e) => { e.stopPropagation(); setColSettingsOpen(colSettingsOpen === col ? null : col); setColRenaming(null); }}
                        className="p-1.5 text-gray-400 dark:text-slate-500 hover:text-violet-500 transition-colors">
                        <Settings size={16} />
                      </button>
                      {colSettingsOpen === col && (
                        <div className="absolute right-0 top-full mt-1 w-56 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden" onClick={e => e.stopPropagation()}>
                          {colRenaming === col ? (
                            <div className="p-3">
                              <label className="text-xs text-slate-400 font-bold mb-1.5 block">Novo nome</label>
                              <input
                                autoFocus
                                value={colNewName}
                                onChange={e => setColNewName(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleRenameColumn(col); if (e.key === 'Escape') { setColRenaming(null); setColSettingsOpen(null); } }}
                                className="w-full bg-white/5 border border-white/10 rounded-lg px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:border-violet-500/50 mb-2"
                                placeholder={col}
                              />
                              <div className="flex gap-2">
                                <button onClick={() => { setColRenaming(null); setColSettingsOpen(null); }} className="flex-1 text-xs text-slate-400 hover:text-white py-1.5 rounded-lg hover:bg-white/5 transition-colors">Cancelar</button>
                                <button onClick={() => handleRenameColumn(col)} className="flex-1 text-xs text-white font-bold py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 transition-colors">Salvar</button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <button
                                onClick={() => { setColRenaming(col); setColNewName(col); }}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors"
                              >
                                <Pencil size={14} className="text-slate-500" />
                                Renomear etapa
                              </button>
                              <button
                                onClick={() => handleDeleteColumn(col)}
                                className="w-full flex items-center gap-3 px-4 py-3 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-white/5"
                              >
                                <Trash2 size={14} />
                                Excluir etapa
                              </button>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Droppable Zone */}
                  <div className={`flex-1 flex flex-col transition-colors duration-200 rounded-2xl ${draggedId ? 'bg-gray-100 dark:bg-white/5 ring-2 ring-emerald-500/50' : ''}`}>
                    <div className="flex flex-col min-h-[100px] flex-1">
                      {colCandidates.length === 0 ? (
                        <div className="flex-1 border-2 border-dashed border-gray-200 dark:border-white/10 rounded-xl flex flex-col items-center justify-center text-gray-400 dark:text-slate-500 p-8 min-h-[150px] pointer-events-none">
                          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mb-2 opacity-40">
                            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
                            <polyline points="3.27 6.96 12 12.01 20.73 6.96"></polyline>
                            <line x1="12" y1="22.08" x2="12" y2="12"></line>
                          </svg>
                          <p className="font-medium text-sm">Arraste tickets para cá</p>
                          <p className="text-xs opacity-50 mt-1">Solte aqui para adicionar</p>
                        </div>
                      ) : (
                        <>
                          {colCandidates.map(c => {
                            const badge = getActionBadge(c.acao, c.data_acao);
                            return (
                              <div
                                key={c.id}
                                draggable
                                onDragStart={() => setDraggedId(c.id)}
                                onDragEnd={() => setDraggedId(null)}
                                onClick={() => setSelectedCandidateDetails(c)}
                                style={{ marginBottom: 12 }}
                                className={`group relative rounded-xl p-3 pl-6 cursor-pointer shadow-sm transition-all ${
                                  c.col === 'Aprovado'
                                    ? 'bg-emerald-950/40 border-2 border-emerald-500/40 hover:border-emerald-400/60'
                                    : c.col === 'Reprovado'
                                    ? 'bg-rose-950/30 border-2 border-rose-500/30 hover:border-rose-400/50'
                                    : 'bg-white dark:bg-dark-card border border-gray-200 dark:border-white/5 hover:border-violet-500/30'
                                } ${draggedId === c.id ? 'opacity-30 ring-2 ring-violet-500' : ''}`}
                              >
                                {/* Status badge icon */}
                                {c.col === 'Aprovado' && (
                                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-emerald-600 flex items-center justify-center shadow-lg z-10">
                                    <Trophy size={14} className="text-white" />
                                  </div>
                                )}
                                {c.col === 'Reprovado' && (
                                  <div className="absolute -top-2 -right-2 w-8 h-8 rounded-full bg-rose-600 flex items-center justify-center shadow-lg z-10">
                                    <XCircle size={14} className="text-white" />
                                  </div>
                                )}

                                {/* Drag handle */}
                                <div className="absolute left-1.5 top-1/2 -translate-y-1/2 z-10 p-1 rounded cursor-grab active:cursor-grabbing text-gray-300 dark:text-slate-600 opacity-0 group-hover:opacity-100 transition-opacity hover:text-violet-400">
                                  <GripVertical size={15} />
                                </div>

                                <div className="flex items-start justify-between mb-2">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs flex-shrink-0 ${
                                      c.col === 'Aprovado' ? 'bg-emerald-600 text-white' : c.col === 'Reprovado' ? 'bg-rose-600 text-white' : 'bg-violet-500 text-white'
                                    }`}>
                                      {c.nome.charAt(0).toUpperCase()}
                                    </div>
                                    <div>
                                      <h4 className="font-bold text-sm text-gray-900 dark:text-white line-clamp-1">{c.nome}</h4>
                                      <div className="flex flex-wrap items-center gap-1 mt-1">
                                        <span className={`flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                                          c.col === 'Aprovado'
                                            ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400'
                                            : c.col === 'Reprovado'
                                            ? 'border-rose-500/30 bg-rose-500/10 text-rose-400'
                                            : 'border-gray-200 dark:border-white/10 bg-gray-50 dark:bg-white/5 text-gray-600 dark:text-slate-300'
                                        }`}>
                                          <span className={`w-1.5 h-1.5 rounded-full ${
                                            c.col === 'Aprovado' ? 'bg-emerald-500' : c.col === 'Reprovado' ? 'bg-rose-500' : 'bg-violet-500'
                                          }`}></span>
                                          {c.col === 'Aprovado' ? 'Aprovado' : c.col === 'Reprovado' ? 'Reprovado' : 'Candidato'}
                                        </span>
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => {
                                      e.stopPropagation();
                                      setEditingCandidate(c);
                                      setCandidateForm({
                                        nome: c.nome,
                                        contato: c.contato || '',
                                        acao: c.acao || '',
                                        data_acao: c.data_acao || '',
                                        col: c.col,
                                      });
                                      setCandidateModal(true);
                                    }}
                                      className="w-6 h-6 rounded-md hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 transition-colors">
                                      <Pencil size={11} />
                                    </button>
                                    <button onClick={(e) => {
                                      e.stopPropagation();
                                      handleDeleteCandidate(c.id);
                                    }}
                                      className="w-6 h-6 rounded-md hover:bg-rose-500/10 flex items-center justify-center text-slate-400 hover:text-rose-400 transition-colors">
                                      <Trash2 size={11} />
                                    </button>
                                  </div>
                                </div>

                                {c.contato && (
                                  <div className="flex items-center gap-2 mb-3">
                                    <span className="text-xs text-gray-500 dark:text-slate-400 font-medium flex items-center gap-1">
                                      {c.contato.includes('@') ? <Mail size={12} /> : <Phone size={12} />}
                                      {c.contato}
                                    </span>
                                  </div>
                                )}


                              </div>
                            );
                          })}
                          <div className="border border-dashed border-gray-300 dark:border-white/10 rounded-xl p-4 text-center text-xs text-gray-500 dark:text-slate-500 mt-1">
                            Solte aqui para adicionar
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}

            {/* + New Column */}
            <div className="flex-shrink-0 w-[200px]">
              {addingCol ? (
                <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/10 p-4">
                  <input
                    autoFocus
                    value={newColName}
                    onChange={e => setNewColName(e.target.value)}
                    onKeyDown={e => {
                      if (e.key === 'Enter' && newColName.trim()) { addColumnToFolder(newColName); setNewColName(''); setAddingCol(false); }
                      if (e.key === 'Escape') { setAddingCol(false); setNewColName(''); }
                    }}
                    placeholder="Nome da coluna"
                    className={inputCls + ' mb-2'}
                  />
                  <div className="flex gap-2">
                    <button onClick={() => { if (newColName.trim()) { addColumnToFolder(newColName); setNewColName(''); setAddingCol(false); } }}
                      className="flex-1 py-2 rounded-xl text-xs font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
                      Criar
                    </button>
                    <button onClick={() => { setAddingCol(false); setNewColName(''); }}
                      className="py-2 px-3 rounded-xl text-xs font-bold text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">
                      <X size={12} />
                    </button>
                  </div>
                </div>
              ) : (
                <button onClick={() => setAddingCol(true)}
                  className="w-full h-16 rounded-2xl border-2 border-dashed border-slate-300 dark:border-white/10 text-slate-400 hover:border-violet-500/40 hover:text-violet-400 flex items-center justify-center gap-2 text-sm font-bold transition-all">
                  <Plus size={15} /> Nova coluna
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Candidate Modal */}
        {candidateModal && (
          <ModalOverlay onClose={() => { setCandidateModal(false); setEditingCandidate(null); }} title={editingCandidate ? 'Editar Candidato' : 'Novo Candidato'}>
            <div className="space-y-4">
              <div>
                <label className={labelCls}>Nome</label>
                <input className={inputCls} value={candidateForm.nome} onChange={e => setCandidateForm(p => ({ ...p, nome: e.target.value }))} placeholder="Nome do candidato" />
              </div>
              <div>
                <label className={labelCls}>Contato (WhatsApp / E-mail)</label>
                <input className={inputCls} value={candidateForm.contato} onChange={e => setCandidateForm(p => ({ ...p, contato: e.target.value }))} placeholder="11999999999 ou email@..." />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className={labelCls}>Próxima Ação</label>
                  <input className={inputCls} value={candidateForm.acao} onChange={e => setCandidateForm(p => ({ ...p, acao: e.target.value }))} placeholder="Ex: Entrevista, Teste" />
                </div>
                <div>
                  <label className={labelCls}>Data</label>
                  <input type="date" className={inputCls} value={candidateForm.data_acao} onChange={e => setCandidateForm(p => ({ ...p, data_acao: e.target.value }))} />
                </div>
              </div>
              <div>
                <label className={labelCls}>Coluna</label>
                <select className={inputCls} value={candidateForm.col} onChange={e => setCandidateForm(p => ({ ...p, col: e.target.value }))}>
                  {cols.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={() => { setCandidateModal(false); setEditingCandidate(null); }}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
              <button onClick={editingCandidate ? handleUpdateCandidate : handleCreateCandidate}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
                {editingCandidate ? 'Salvar' : 'Adicionar'}
              </button>
            </div>
          </ModalOverlay>
        )}

        {/* Candidate Detail Popup */}
        {selectedCandidateDetails && activeFolder && (
          <CandidateDetailModal
            candidate={selectedCandidateDetails}
            currentUser={currentUser}
            onClose={() => setSelectedCandidateDetails(null)}
            onMoveCandidate={async (candidateId, newCol) => {
              // Update local state immediately
              setCandidates(prev => prev.map(c => c.id === candidateId ? { ...c, col: newCol } : c));
              // Update server
              try {
                await fetch(`/api/hiring/candidates/${candidateId}`, {
                  method: 'PUT',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ col: newCol })
                });
              } catch(e) { }
            }}
            onUpdateCandidate={(c) => {
              setCandidates(prev => prev.map(cand => cand.id === c.id ? c : cand));
            }}
          />
        )}

        {/* Confirm Modal (Kanban) */}
        {confirmAction && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmAction(null)}>
            <div className="bg-[#1a1a2e] border border-white/10 rounded-2xl p-6 max-w-sm w-full mx-4 shadow-2xl" onClick={e => e.stopPropagation()}>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-rose-500/15 flex items-center justify-center shrink-0">
                  <Trash2 size={18} className="text-rose-400" />
                </div>
                <h3 className="text-white font-bold text-base">Confirmar Exclusão</h3>
              </div>
              <p className="text-slate-400 text-sm mb-6 leading-relaxed">{confirmAction.msg}</p>
              <div className="flex gap-3 justify-end">
                <button onClick={() => setConfirmAction(null)} className="px-4 py-2 text-sm font-medium text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-xl transition-colors">Cancelar</button>
                <button onClick={confirmAction.onConfirm} className="px-4 py-2 text-sm font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl transition-colors">Excluir</button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════════════════════════
  //  STATE 1 — FOLDER LIST
  // ═══════════════════════════════════════════════════════════════════════════

  return (
    <div className="h-screen flex flex-col bg-light-bg dark:bg-dark-bg transition-colors duration-300 overflow-hidden">
      {/* Header */}
      <div className="px-6 md:px-8 pt-8 pb-4 flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-light-text dark:text-dark-text">
            Processos de <span className="text-violet-500">Contratação</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
            Gerencie seleções e candidatos
          </p>
        </div>
        {mainTab === 'formularios' && (
          <button onClick={() => {
            setFolderForm({ nome: '', cargo: '', cols: ['Inscritos', 'Entrevista', 'Teste Técnico', 'Aprovados'] });
            setEditingFolder(null);
            setFolderModal('create');
          }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold px-4 py-2.5 rounded-xl transition-colors shadow-lg shadow-violet-500/20">
            <Plus size={15} /> Adicionar Seleção
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="px-6 md:px-8 pb-4 flex items-center gap-1">
        <button
          onClick={() => setMainTab('formularios')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mainTab === 'formularios' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <FolderOpen size={14} className="inline mr-2 -mt-0.5" />
          Formulários
        </button>
        <button
          onClick={() => setMainTab('documentos')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mainTab === 'documentos' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <FileText size={14} className="inline mr-2 -mt-0.5" />
          Documentos
        </button>
        <button
          onClick={() => setMainTab('contratos')}
          className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${mainTab === 'contratos' ? 'bg-violet-600 text-white' : 'text-slate-400 hover:text-white hover:bg-white/5'}`}
        >
          <ScrollText size={14} className="inline mr-2 -mt-0.5" />
          Contratos
        </button>
      </div>

      {/* Stats - only on formularios */}
      {mainTab === 'formularios' && (
      <div className="px-6 md:px-8 pb-6 grid grid-cols-2 sm:grid-cols-4 gap-4">
        {stats.map(s => (
          <div key={s.label} className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 transition-colors duration-200">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{s.label}</span>
              <div className={`w-8 h-8 rounded-xl flex items-center justify-center ${s.cls.split(' ')[1]}`}>
                {s.label === 'Total Seleções' && <FolderOpen size={15} className={s.cls.split(' ')[0]} />}
                {s.label === 'Com Candidatos' && <Users size={15} className={s.cls.split(' ')[0]} />}
                {s.label === 'Total Candidatos' && <UserPlus size={15} className={s.cls.split(' ')[0]} />}
                {s.label === 'Em Andamento' && <Briefcase size={15} className={s.cls.split(' ')[0]} />}
              </div>
            </div>
            <div className="text-2xl font-black text-light-text dark:text-dark-text">{s.value}</div>
          </div>
        ))}
      </div>
      )}

      {/* Tab: Formulários */}
      {mainTab === 'formularios' && (
        <div className="flex-1 overflow-y-auto">
      {/* Search */}
      <div className="px-6 md:px-8 py-4">
        <div className="relative max-w-md">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar seleção ou cargo…"
            className={inputCls + ' pl-9'} />
        </div>
      </div>

      {/* Loading */}
      {loading ? (
        <div className="flex justify-center items-center h-40">
          <div className="w-10 h-10 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : filteredFolders.length === 0 ? (
        <div className="px-6 md:px-8 pb-8">
          <div className="bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-12 text-center">
            <FolderOpen size={32} className="text-slate-500 dark:text-slate-600 mx-auto mb-3" />
            <p className="text-slate-400 text-sm font-medium">Nenhuma seleção encontrada</p>
            <p className="text-slate-500 text-xs mt-1">Clique em "Adicionar Seleção" para começar</p>
          </div>
        </div>
      ) : (
        /* Folder Grid */
        <div className="px-6 md:px-8 pb-8">
          <div className="grid gap-4" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(240px, 1fr))' }}>
            {filteredFolders.map(folder => {
              const cols = Array.isArray(folder.cols) ? folder.cols : [];
              const maxChips = 4;
              return (
                <div key={folder.id}
                  onClick={() => setActiveFolder(folder)}
                  className="group bg-light-card dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-5 cursor-pointer hover:border-violet-500/30 hover:shadow-lg hover:shadow-violet-500/5 transition-all duration-200">
                  {/* Icon + Title */}
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-xl bg-violet-500/15 flex items-center justify-center flex-shrink-0">
                        <FolderOpen size={18} className="text-violet-400" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-bold text-light-text dark:text-dark-text truncate">{folder.nome}</p>
                        {folder.cargo && <p className="text-[11px] text-slate-400 truncate">{folder.cargo}</p>}
                      </div>
                    </div>
                    <div className="relative" onClick={e => e.stopPropagation()}>
                      <button onClick={() => setFolderMenuOpen(folderMenuOpen === folder.id ? null : folder.id)}
                        className="w-8 h-8 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                        <MoreVertical size={14} />
                      </button>
                      {folderMenuOpen === folder.id && (
                        <div className="absolute right-0 top-full mt-1 w-48 bg-[#1a1a2e] border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                          <button onClick={() => {
                            const baseUrl = window.location.origin;
                            navigator.clipboard.writeText(`${baseUrl}/?apply=${folder.id}`);
                            setFolderMenuOpen(null);
                          }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors">
                            <LinkIcon size={13} className="text-violet-400" />
                            Copiar link
                          </button>
                          <button onClick={() => {
                            setEditingFolder(folder);
                            setFolderForm({ nome: folder.nome, cargo: folder.cargo || '', cols: cols });
                            setFolderModal('edit');
                            setFolderMenuOpen(null);
                          }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-slate-300 hover:bg-white/5 hover:text-white transition-colors border-t border-white/5">
                            <Pencil size={13} className="text-slate-500" />
                            Editar seleção
                          </button>
                          <button onClick={() => { handleDeleteFolder(folder.id); setFolderMenuOpen(null); }}
                            className="w-full flex items-center gap-3 px-4 py-2.5 text-sm text-rose-400 hover:bg-rose-500/10 transition-colors border-t border-white/5">
                            <Trash2 size={13} />
                            Excluir seleção
                          </button>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Footer stats */}
                  <div className="flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1"><Users size={11} /> {folderCounts[folder.id] ?? 0} inscrições</span>
                    <ArrowRight size={12} className="text-violet-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Folder Modal (Create / Edit) */}
      {folderModal && (
        <ModalOverlay
          onClose={() => { setFolderModal(null); setEditingFolder(null); }}
          title={folderModal === 'create' ? 'Nova Seleção' : 'Editar Seleção'}
        >
          <div className="space-y-4">
            <div>
              <label className={labelCls}>Nome da Seleção</label>
              <input className={inputCls} value={folderForm.nome} onChange={e => setFolderForm(p => ({ ...p, nome: e.target.value }))} placeholder="Ex: Dev Frontend Jr" />
            </div>
            <div>
              <label className={labelCls}>Cargo / Descrição</label>
              <input className={inputCls} value={folderForm.cargo} onChange={e => setFolderForm(p => ({ ...p, cargo: e.target.value }))} placeholder="Ex: Desenvolvedor React" />
            </div>
            <div>
              <label className={labelCls}>Colunas do Kanban</label>
              <div className="flex flex-wrap gap-2 mb-2">
                {folderForm.cols.map((c, i) => (
                  <span key={i} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-violet-500/10 text-xs font-bold text-violet-400">
                    {c}
                    <button onClick={() => setFolderForm(p => ({ ...p, cols: p.cols.filter((_, j) => j !== i) }))}
                      className="w-4 h-4 rounded-full hover:bg-white/10 flex items-center justify-center text-violet-300 hover:text-rose-400 transition-colors">
                      <X size={10} />
                    </button>
                  </span>
                ))}
              </div>
              <div className="flex gap-2">
                <input className={inputCls} value={newColInput} onChange={e => setNewColInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter' && newColInput.trim()) { setFolderForm(p => ({ ...p, cols: [...p.cols, newColInput.trim()] })); setNewColInput(''); } }}
                  placeholder="Adicionar coluna…" />
                <button onClick={() => { if (newColInput.trim()) { setFolderForm(p => ({ ...p, cols: [...p.cols, newColInput.trim()] })); setNewColInput(''); } }}
                  className="px-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white transition-colors">
                  <Plus size={14} />
                </button>
              </div>
            </div>
          </div>
          <div className="flex gap-3 mt-6">
            <button onClick={() => { setFolderModal(null); setEditingFolder(null); }}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-slate-400 border border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors">Cancelar</button>
            <button onClick={folderModal === 'create' ? handleCreateFolder : handleUpdateFolder}
              className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 transition-colors">
              {folderModal === 'create' ? 'Criar Seleção' : 'Salvar'}
            </button>
          </div>
        </ModalOverlay>
      )}

      {/* End of Formulários tab content */}
      </div>
      )}

      {/* Tab: Documentos */}
      {mainTab === 'documentos' && (
        <div className="flex-1 flex flex-col min-h-0">
          <DocumentsEditor userName={currentUser?.name || 'Usuário'} />
        </div>
      )}

      {/* Tab: Contratos */}
      {mainTab === 'contratos' && (
        <ContratosManager userName={currentUser?.name || 'Usuário'} />
      )}
    </div>
  );
}
