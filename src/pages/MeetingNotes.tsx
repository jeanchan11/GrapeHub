import React, { useState, useEffect } from 'react';
import { Plus, ChevronDown, ChevronUp, Trash2, Save, X, Edit2, Calendar, Clock, CheckSquare, FileText, Users, Loader2 } from 'lucide-react';
import RichTextEditor from '../components/RichTextEditor';
import { useAuth } from '../contexts/AuthContext';

interface Session {
  id: string;
  page_id: string;
  title: string;
  meeting_date: string;
  attendees: string[];
  entries: any[];   // legacy, kept for compat
  notes_html: string;
  created_by?: string;
  created_at: string;
}

interface Comment {
  id: number;
  session_id: string;
  text: string;
  author_name: string;
  created_at: string;
}

function fmtDate(d: string) {
  if (!d) return '';
  const [y, m, day] = d.split('T')[0].split('-');
  return `${day}/${m}/${y}`;
}

function Avatar({ name, size = 28 }: { name: string; size?: number }) {
  const initials = name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase();
  const colors = ['#6366f1','#8b5cf6','#ec4899','#f59e0b','#10b981','#3b82f6','#f43f5e'];
  const color = colors[name.charCodeAt(0) % colors.length];
  return (
    <div style={{ width: size, height: size, background: color, borderRadius: '50%', display:'flex', alignItems:'center', justifyContent:'center', fontSize: size*0.38, fontWeight: 700, color:'#fff', flexShrink:0, border:'2px solid rgba(255,255,255,0.08)' }}>
      {initials}
    </div>
  );
}

export default function MeetingNotes({ activePage, pageLabel }: { activePage: string; pageLabel?: string }) {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newDate, setNewDate] = useState(new Date().toISOString().slice(0,10));
  const [newAttendee, setNewAttendee] = useState('');
  const [newAttendees, setNewAttendees] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/meeting-notes/${activePage}`);
      const data = await r.json();
      setSessions(Array.isArray(data) ? data : []);
    } catch { setSessions([]); } finally { setLoading(false); }
  };

  useEffect(() => { load(); }, [activePage]);

  const createSession = async () => {
    if (!newTitle.trim()) return;
    setSaving(true);
    try {
      const r = await fetch('/api/meeting-notes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          page_id: activePage, title: newTitle, meeting_date: newDate,
          attendees: newAttendees, entries: [], notes_html: '',
          created_by: user?.displayName || user?.email
        })
      });
      const session = await r.json();
      setSessions(prev => [session, ...prev]);
      setExpandedId(session.id);
      setShowNew(false);
      setNewTitle(''); setNewDate(new Date().toISOString().slice(0,10)); setNewAttendees([]);
    } finally { setSaving(false); }
  };

  const deleteSession = async (id: string) => {
    if (!confirm('Excluir esta reunião?')) return;
    await fetch(`/api/meeting-notes/${id}`, { method: 'DELETE' });
    setSessions(prev => prev.filter(s => s.id !== id));
    if (expandedId === id) setExpandedId(null);
  };

  const updateSession = (updated: Session) => {
    setSessions(prev => prev.map(s => s.id === updated.id ? updated : s));
  };

  // Stats
  const thisMonth = sessions.filter(s => s.meeting_date?.slice(0,7) === new Date().toISOString().slice(0,7)).length;
  const totalAttendees = new Set(sessions.flatMap(s => s.attendees || [])).size;

  return (
    <div className="p-8 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-gray-900 dark:text-white tracking-tight mb-1">
            Notas de <span className="text-violet-500">{pageLabel || 'Reunião'}</span>
          </h1>
          <p className="text-slate-500 text-sm">Atas, registros e acompanhamento de reuniões</p>
        </div>
        <button onClick={() => setShowNew(true)} className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white rounded-xl font-bold text-sm transition-colors shadow-lg shadow-violet-500/20">
          <Plus size={16} /> Nova Reunião
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: 'Total',        value: sessions.length, icon: FileText,  color: '#6366f1' },
          { label: 'Este Mês',     value: thisMonth,        icon: Clock,     color: '#8b5cf6' },
          { label: 'Participantes',value: totalAttendees,   icon: Users,     color: '#10b981' },
          { label: 'Com Notas',    value: sessions.filter(s => s.notes_html && s.notes_html !== '<p></p>').length, icon: CheckSquare, color: '#f59e0b' },
        ].map(({ label, value, icon: Icon, color }) => (
          <div key={label} className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-2xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: `${color}22` }}>
                <Icon size={14} style={{ color }} />
              </div>
              <span className="text-[10px] font-bold uppercase tracking-widest text-gray-400 dark:text-slate-500">{label}</span>
            </div>
            <p className="text-3xl font-black" style={{ color }}>{value}</p>
          </div>
        ))}
      </div>

      {/* New Session Form */}
      {showNew && (
        <div className="bg-white dark:bg-dark-card border border-violet-500/30 rounded-2xl p-6 mb-6 shadow-lg">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-bold text-gray-900 dark:text-white">Nova Reunião</h3>
            <button onClick={() => setShowNew(false)} className="text-gray-400 hover:text-gray-600"><X size={18} /></button>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Título *</label>
              <input value={newTitle} onChange={e => setNewTitle(e.target.value)} placeholder="Ex: Weekly Operacional — 11/05"
                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-violet-500/50" />
            </div>
            <div>
              <label className="text-xs text-gray-500 font-medium mb-1 block">Data</label>
              <input type="date" value={newDate} onChange={e => setNewDate(e.target.value)}
                className="w-full bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-violet-500/50" />
            </div>
          </div>
          <div className="mb-4">
            <label className="text-xs text-gray-500 font-medium mb-1 block">Participantes</label>
            <div className="flex gap-2">
              <input value={newAttendee} onChange={e => setNewAttendee(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && newAttendee.trim()) { setNewAttendees(p => [...p, newAttendee.trim()]); setNewAttendee(''); }}}
                placeholder="Nome + Enter"
                className="flex-1 bg-gray-50 dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-gray-900 dark:text-white outline-none focus:border-violet-500/50" />
              <button onClick={() => { if (newAttendee.trim()) { setNewAttendees(p => [...p, newAttendee.trim()]); setNewAttendee(''); }}}
                className="px-3 py-2 bg-violet-600 text-white rounded-xl"><Plus size={14} /></button>
            </div>
            {newAttendees.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {newAttendees.map((a, i) => (
                  <span key={i} className="flex items-center gap-1.5 px-2.5 py-1 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full text-xs font-medium">
                    <Avatar name={a} size={16} />{a}
                    <button onClick={() => setNewAttendees(p => p.filter((_, j) => j !== i))}><X size={10} /></button>
                  </span>
                ))}
              </div>
            )}
          </div>
          <div className="flex justify-end gap-2">
            <button onClick={() => setShowNew(false)} className="px-4 py-2 text-sm text-gray-500 hover:text-gray-900 dark:hover:text-white">Cancelar</button>
            <button onClick={createSession} disabled={saving || !newTitle.trim()}
              className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-sm font-bold transition-colors">
              {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={14} />} Criar
            </button>
          </div>
        </div>
      )}

      {/* Sessions List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      ) : sessions.length === 0 ? (
        <div className="text-center py-20">
          <div className="w-16 h-16 bg-violet-500/10 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <FileText size={28} className="text-violet-400" />
          </div>
          <p className="text-gray-500 dark:text-slate-400 text-sm">Nenhuma reunião registrada ainda.</p>
          <button onClick={() => setShowNew(true)} className="mt-3 text-violet-500 hover:text-violet-400 text-sm font-medium">+ Criar primeira reunião</button>
        </div>
      ) : (
        <div className="space-y-3">
          {sessions.map(session => (
            <SessionCard key={session.id} session={session}
              expanded={expandedId === session.id}
              onToggle={() => setExpandedId(expandedId === session.id ? null : session.id)}
              onDelete={() => deleteSession(session.id)}
              onUpdate={updateSession}
              currentUser={user?.displayName || user?.email || 'Equipe'}
            />
          ))}
        </div>
      )}
    </div>
  );
}

/* ── Session Card ── */
function SessionCard({ session, expanded, onToggle, onDelete, onUpdate, currentUser }: {
  session: Session; expanded: boolean;
  onToggle: () => void; onDelete: () => void;
  onUpdate: (s: Session) => void; currentUser: string;
}) {
  const [notesHtml, setNotesHtml] = useState(session.notes_html || '');
  const [notesDirty, setNotesDirty] = useState(false);
  const [notesSaving, setNotesSaving] = useState(false);

  const [comments, setComments] = useState<Comment[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [newComment, setNewComment] = useState('');
  const [commenting, setCommenting] = useState(false);

  const [editingMeta, setEditingMeta] = useState(false);
  const [metaTitle, setMetaTitle] = useState(session.title);
  const [metaDate, setMetaDate] = useState(session.meeting_date?.split('T')[0] || '');
  const [metaAttendee, setMetaAttendee] = useState('');
  const [metaAttendees, setMetaAttendees] = useState<string[]>(session.attendees || []);

  // Load comments when expanded
  useEffect(() => {
    if (!expanded) return;
    setCommentsLoading(true);
    fetch(`/api/meeting-notes/${session.id}/comments`)
      .then(r => r.json())
      .then(d => setComments(Array.isArray(d) ? d : []))
      .catch(() => setComments([]))
      .finally(() => setCommentsLoading(false));
  }, [expanded, session.id]);

  const saveNotes = async () => {
    setNotesSaving(true);
    try {
      const r = await fetch(`/api/meeting-notes/${session.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...session, notes_html: notesHtml, attendees: metaAttendees })
      });
      const updated = await r.json();
      onUpdate(updated);
      setNotesDirty(false);
    } finally { setNotesSaving(false); }
  };

  const saveMeta = async () => {
    const r = await fetch(`/api/meeting-notes/${session.id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...session, title: metaTitle, meeting_date: metaDate, attendees: metaAttendees, notes_html: notesHtml })
    });
    const updated = await r.json();
    onUpdate(updated);
    setEditingMeta(false);
  };

  const addComment = async () => {
    if (!newComment.trim()) return;
    setCommenting(true);
    try {
      const r = await fetch(`/api/meeting-notes/${session.id}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: newComment, author_name: currentUser })
      });
      if (r.ok) {
        const c = await r.json();
        setComments(prev => [...prev, c]);
        setNewComment('');
      }
    } finally { setCommenting(false); }
  };

  const hasNotes = notesHtml && notesHtml !== '<p></p>' && notesHtml !== '';

  return (
    <div className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-2xl shadow-sm overflow-hidden hover:border-violet-500/20 transition-all">
      {/* Header Row */}
      <div className="flex items-center gap-4 px-6 py-4 cursor-pointer" onClick={onToggle}>
        <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center shrink-0">
          <Calendar size={18} className="text-violet-500" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-bold text-gray-900 dark:text-white text-sm">{session.title}</h3>
            <span className="text-[10px] font-medium text-gray-400 dark:text-slate-500 shrink-0">{fmtDate(session.meeting_date)}</span>
            {hasNotes && <span className="text-[10px] font-bold text-emerald-500 bg-emerald-500/10 px-2 py-0.5 rounded-full">Com notas</span>}
          </div>
          {(session.attendees || []).length > 0 && (
            <div className="flex items-center gap-2 mt-1">
              <div className="flex -space-x-1.5">
                {(session.attendees || []).slice(0,5).map((a, i) => <Avatar key={i} name={a} size={20} />)}
                {(session.attendees || []).length > 5 && (
                  <div className="w-5 h-5 rounded-full bg-gray-200 dark:bg-white/10 flex items-center justify-center text-[9px] font-bold text-gray-500 dark:text-slate-400" style={{border:'2px solid'}}>
                    +{(session.attendees||[]).length-5}
                  </div>
                )}
              </div>
              <span className="text-[10px] text-gray-400 dark:text-slate-500">{(session.attendees||[]).join(', ')}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-1 shrink-0">
          <button onClick={e => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-400 hover:text-rose-500 rounded-lg hover:bg-rose-500/10 transition-colors"><Trash2 size={14} /></button>
          {expanded ? <ChevronUp size={16} className="text-gray-400" /> : <ChevronDown size={16} className="text-gray-400" />}
        </div>
      </div>

      {/* Expanded Body — Two Columns */}
      {expanded && (
        <div className="border-t border-gray-100 dark:border-white/5 flex h-[600px] overflow-hidden">
          {/* LEFT: Editor */}
          <div className="flex-1 flex flex-col border-r border-gray-100 dark:border-white/5 overflow-y-auto">
            {/* Meta edit bar */}
            <div className="px-6 pt-5 pb-3 flex items-center justify-between shrink-0">
              <h4 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest flex items-center gap-2">
                <FileText size={12} className="text-violet-500" /> Documento Interno
              </h4>
              <div className="flex items-center gap-2">
                <button onClick={() => setEditingMeta(!editingMeta)} className="flex items-center gap-1 text-[10px] font-bold text-violet-500 hover:text-violet-400">
                  <Edit2 size={11} /> {editingMeta ? 'Fechar' : 'Editar info'}
                </button>
                {notesDirty && (
                  <button onClick={saveNotes} disabled={notesSaving} className="flex items-center gap-1 text-[10px] font-bold text-emerald-500 hover:text-emerald-400">
                    {notesSaving ? <Loader2 size={11} className="animate-spin" /> : <Save size={11} />} Salvar
                  </button>
                )}
              </div>
            </div>

            {/* Meta edit panel */}
            {editingMeta && (
              <div className="mx-6 mb-4 p-4 bg-gray-50 dark:bg-dark-bg rounded-xl border border-gray-200 dark:border-white/10 shrink-0">
                <div className="grid grid-cols-2 gap-3 mb-3">
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Título</label>
                    <input value={metaTitle} onChange={e => setMetaTitle(e.target.value)} className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-violet-500/50" />
                  </div>
                  <div>
                    <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Data</label>
                    <input type="date" value={metaDate} onChange={e => setMetaDate(e.target.value)} className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-violet-500/50" />
                  </div>
                </div>
                <div className="mb-3">
                  <label className="text-[10px] text-gray-500 font-bold uppercase tracking-wider mb-1 block">Participantes</label>
                  <div className="flex flex-wrap gap-1.5 mb-1.5">
                    {metaAttendees.map((a, i) => (
                      <span key={i} className="flex items-center gap-1 px-2 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full text-[10px] font-medium">
                        <Avatar name={a} size={14} />{a}
                        <button onClick={() => setMetaAttendees(p => p.filter((_, j) => j !== i))}><X size={9} /></button>
                      </span>
                    ))}
                  </div>
                  <input value={metaAttendee} onChange={e => setMetaAttendee(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter' && metaAttendee.trim()) { setMetaAttendees(p => [...p, metaAttendee.trim()]); setMetaAttendee(''); }}}
                    placeholder="Nome + Enter"
                    className="w-full bg-white dark:bg-dark-card border border-gray-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-gray-900 dark:text-white outline-none focus:border-violet-500/50" />
                </div>
                <button onClick={saveMeta} className="px-3 py-1.5 bg-violet-600 hover:bg-violet-500 text-white rounded-lg text-xs font-bold">Salvar informações</button>
              </div>
            )}

            {/* Rich Text Editor */}
            <div className="flex-1 px-6 pb-6">
              <RichTextEditor
                content={notesHtml}
                onChange={html => { setNotesHtml(html); setNotesDirty(html !== (session.notes_html || '')); }}
              />
              {notesDirty && (
                <div className="mt-3 flex justify-end">
                  <button onClick={saveNotes} disabled={notesSaving} className="flex items-center gap-2 px-4 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition-colors">
                    {notesSaving ? <Loader2 size={12} className="animate-spin" /> : <Save size={12} />} Salvar Documento
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* RIGHT: Comments / Activity */}
          <div className="w-72 flex flex-col bg-gray-50/50 dark:bg-white/[0.01]">
            <div className="px-4 py-4 border-b border-gray-100 dark:border-white/5 shrink-0">
              <h4 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-2">
                Atividade <span className="bg-gray-100 dark:bg-white/10 px-2 py-0.5 rounded-full text-slate-400">{comments.length}</span>
              </h4>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-3">
              {commentsLoading ? (
                <div className="flex justify-center py-8"><Loader2 size={18} className="animate-spin text-slate-400" /></div>
              ) : comments.length === 0 ? (
                <p className="text-center text-slate-500 text-xs py-8">Nenhum comentário ainda.</p>
              ) : (
                comments.map(c => (
                  <div key={c.id} className="bg-white dark:bg-dark-card border border-gray-100 dark:border-white/5 rounded-xl px-4 py-3">
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-[10px] font-bold text-violet-500">{c.author_name || 'Usuário'}</span>
                      <span className="text-[10px] text-gray-400 dark:text-slate-500">
                        {new Date(c.created_at).toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
                      </span>
                    </div>
                    <p className="text-xs text-gray-700 dark:text-slate-300 whitespace-pre-wrap leading-relaxed">{c.text}</p>
                  </div>
                ))
              )}
            </div>

            <div className="p-4 border-t border-gray-100 dark:border-white/5 shrink-0">
              <textarea value={newComment} onChange={e => setNewComment(e.target.value)}
                placeholder="Escreva um comentário..."
                className="w-full bg-white dark:bg-dark-bg border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-slate-500 outline-none focus:border-violet-500/50 resize-none h-20 mb-2 transition-colors" />
              <div className="flex justify-end">
                <button onClick={addComment} disabled={!newComment.trim() || commenting}
                  className="px-4 py-1.5 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-colors flex items-center gap-1.5">
                  {commenting ? <Loader2 size={12} className="animate-spin" /> : null} Responder
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
