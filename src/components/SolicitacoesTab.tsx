// Aba "Solicitações" do modal do projeto — o time cria pedidos para o cliente
// (criativos, feedback, roteiros...). Aparecem no portal do cliente.
import React, { useState, useEffect } from 'react';
import { Loader2, Plus, Trash2, Check, Clock, Image as ImageIcon, MessageSquare, FileText, Sparkles, Send } from 'lucide-react';
import MediaLightbox, { LbFile } from './MediaLightbox';

interface Req { id: string; type: string; description: string; status: string; created_by?: string; created_at: string; files?: any[]; comments?: any[]; }

const TYPES = [
  { key: 'criativo', label: 'Criativo', icon: ImageIcon, cls: 'text-violet-500 bg-violet-500/10 border-violet-500/20' },
  { key: 'feedback', label: 'Feedback', icon: MessageSquare, cls: 'text-blue-500 bg-blue-500/10 border-blue-500/20' },
  { key: 'roteiro', label: 'Roteiro', icon: FileText, cls: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
  { key: 'outro', label: 'Outro', icon: Sparkles, cls: 'text-slate-500 bg-slate-500/10 border-slate-500/20' },
];
const typeMeta = (t: string) => TYPES.find(x => x.key === t) || TYPES[3];
const fmt = (d: string) => new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

const SolicitacoesTab: React.FC<{ projectId: string; authorName?: string }> = ({ projectId, authorName }) => {
  const [loading, setLoading] = useState(true);
  const [reqs, setReqs] = useState<Req[]>([]);
  const [type, setType] = useState('criativo');
  const [desc, setDesc] = useState('');
  const [saving, setSaving] = useState(false);
  const [commentText, setCommentText] = useState<Record<string, string>>({});
  const [lightbox, setLightbox] = useState<{ files: LbFile[]; index: number } | null>(null);

  const sendComment = async (req: Req) => {
    const text = (commentText[req.id] || '').trim();
    if (!text) return;
    setCommentText(p => ({ ...p, [req.id]: '' }));
    try {
      const res = await fetch(`/api/project-requests/${req.id}/comments`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ text, author: authorName }) });
      if (res.ok) { const c = await res.json(); setReqs(prev => prev.map(x => x.id === req.id ? { ...x, comments: [...(x.comments || []), c] } : x)); }
    } catch { /* ignore */ }
  };

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/project-requests/${projectId}`);
      setReqs(r.ok ? await r.json() : []);
    } catch { setReqs([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [projectId]);

  const create = async () => {
    if (!desc.trim() || saving) return;
    setSaving(true);
    try {
      const r = await fetch(`/api/project-requests/${projectId}`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, description: desc.trim(), created_by: authorName || null }),
      });
      if (r.ok) { const saved = await r.json(); setReqs(prev => [saved, ...prev]); setDesc(''); }
    } catch { /* ignore */ }
    setSaving(false);
  };
  const toggle = async (req: Req) => {
    const status = req.status === 'concluida' ? 'pendente' : 'concluida';
    setReqs(prev => prev.map(x => x.id === req.id ? { ...x, status } : x));
    try { await fetch(`/api/project-requests/${req.id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) }); } catch { /* ignore */ }
  };
  const remove = async (req: Req) => {
    if (!confirm('Remover esta solicitação?')) return;
    setReqs(prev => prev.filter(x => x.id !== req.id));
    try { await fetch(`/api/project-requests/${req.id}`, { method: 'DELETE' }); } catch { /* ignore */ }
  };

  const inputCls = 'w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white placeholder:text-slate-400 outline-none focus:border-violet-500 transition-all resize-none';

  return (
    <div className="space-y-5">
      {/* Nova solicitação */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5 p-4 space-y-3">
        <div className="flex flex-wrap gap-2">
          {TYPES.map(t => {
            const Icon = t.icon; const active = type === t.key;
            return (
              <button key={t.key} onClick={() => setType(t.key)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${active ? t.cls : 'text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-100 dark:hover:bg-white/5'}`}>
                <Icon size={13} /> {t.label}
              </button>
            );
          })}
        </div>
        <textarea
          value={desc}
          onChange={e => setDesc(e.target.value)}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); create(); } }}
          placeholder="O que você precisa do cliente? (ex: enviar 3 fotos da equipe para os criativos)"
          rows={2}
          className={inputCls}
        />
        <div className="flex justify-end">
          <button onClick={create} disabled={saving || !desc.trim()}
            className="flex items-center gap-2 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white text-sm font-bold transition-all">
            {saving ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />} Criar solicitação
          </button>
        </div>
      </div>

      {/* Lista */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-500" size={28} /></div>
      ) : reqs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
          <Plus size={26} className="opacity-40" />
          <p className="text-sm">Nenhuma solicitação ainda.</p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {reqs.map(req => {
            const meta = typeMeta(req.type); const Icon = meta.icon;
            const done = req.status === 'concluida';
            return (
              <div key={req.id} className={`group flex items-start gap-3 p-4 rounded-2xl border transition-all ${done ? 'bg-emerald-500/[0.04] border-emerald-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/10'}`}>
                <button onClick={() => toggle(req)} title={done ? 'Reabrir' : 'Marcar como concluída'}
                  className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border transition-all ${done ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-300 dark:border-white/20 text-transparent hover:border-violet-500'}`}>
                  <Check size={14} />
                </button>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md border ${meta.cls}`}><Icon size={11} /> {meta.label}</span>
                    <span className="inline-flex items-center gap-1 text-[10px] text-slate-400"><Clock size={11} /> {fmt(req.created_at)}</span>
                    {done && <span className="text-[10px] font-bold text-emerald-500">✓ Concluída</span>}
                  </div>
                  <p className={`text-sm ${done ? 'text-slate-400 line-through' : 'text-slate-700 dark:text-slate-200'}`}>{req.description}</p>
                  {Array.isArray(req.files) && req.files.length > 0 && (
                    <div className="mt-2.5">
                      <p className="text-[10px] font-bold uppercase tracking-wider text-emerald-500 mb-1.5">📎 Entregue pelo cliente</p>
                      <div className="flex flex-wrap gap-2">
                        {req.files.map((f: any, i: number) => {
                          const isImg = String(f.type || '').startsWith('image/');
                          const open = () => setLightbox({ files: req.files as LbFile[], index: i });
                          return isImg ? (
                            <button key={i} onClick={open} className="block"><img src={f.url} alt={f.name} className="w-16 h-16 object-cover rounded-lg border border-slate-200 dark:border-white/10 hover:opacity-90 transition-opacity" referrerPolicy="no-referrer" /></button>
                          ) : (
                            <button key={i} onClick={open} className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-white/10 hover:border-violet-500/40 text-xs text-slate-600 dark:text-slate-300 transition-colors"><FileText size={13} className="text-violet-500 shrink-0" /> <span className="truncate max-w-[150px]">{f.name || 'arquivo'}</span></button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Conversa */}
                  <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                    {(req.comments || []).length > 0 && (
                      <div className="space-y-2 mb-2.5">
                        {(req.comments || []).map((c: any, i: number) => (
                          <div key={i}>
                            <div className="flex items-baseline gap-2">
                              <span className="text-xs font-bold" style={{ color: c.authorType === 'client' ? '#0d9488' : '#7C3AED' }}>{c.author}</span>
                              <span className="text-[10px] text-slate-400">{fmt(c.createdAt)}</span>
                            </div>
                            <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap">{c.text}</p>
                          </div>
                        ))}
                      </div>
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        value={commentText[req.id] || ''}
                        onChange={e => setCommentText(p => ({ ...p, [req.id]: e.target.value }))}
                        onKeyDown={e => { if (e.key === 'Enter') sendComment(req); }}
                        placeholder="Responder ao cliente..."
                        className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm outline-none focus:border-violet-500 transition-colors text-slate-800 dark:text-white placeholder:text-slate-400"
                      />
                      <button onClick={() => sendComment(req)} disabled={!(commentText[req.id] || '').trim()} className="px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 disabled:opacity-40 text-white text-xs font-bold transition-all">Enviar</button>
                    </div>
                  </div>
                </div>
                <button onClick={() => remove(req)} className="shrink-0 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 mt-0.5">
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {lightbox && (
        <MediaLightbox files={lightbox.files} index={lightbox.index} onClose={() => setLightbox(null)} onIndex={i => setLightbox(l => l && { ...l, index: i })} />
      )}
    </div>
  );
};

export default SolicitacoesTab;
