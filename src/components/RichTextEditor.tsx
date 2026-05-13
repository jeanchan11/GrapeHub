import React, { useState, useCallback, useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import TaskList from '@tiptap/extension-task-list';
import TaskItem from '@tiptap/extension-task-item';
import Details from '@tiptap/extension-details';
import { DetailsContent } from '@tiptap/extension-details';
import { DetailsSummary } from '@tiptap/extension-details';
import { Heading1, Heading2, Heading3, Type, List, ListOrdered, CheckSquare, ChevronRight } from 'lucide-react';

import { Node, mergeAttributes } from '@tiptap/core';

const MentionNode = Node.create({
  name: 'mention',
  group: 'inline',
  inline: true,
  selectable: false,
  atom: true,

  addAttributes() {
    return {
      name: { default: null },
      picture: { default: null },
      email: { default: null },
    }
  },

  parseHTML() {
    return [{ tag: 'span[data-type="mention"]' }]
  },

  renderHTML({ node, HTMLAttributes }) {
    return [
      'span',
      mergeAttributes({
        'data-type': 'mention',
        style: 'display:inline-flex;align-items:center;gap:6px;background:rgba(139,92,246,0.15);color:#8b5cf6;padding:2px 8px;border-radius:12px;font-size:0.85em;font-weight:700;vertical-align:middle;line-height:1;margin:0 2px;user-select:none;'
      }, HTMLAttributes),
      node.attrs.picture ? ['img', { src: node.attrs.picture, style: 'width:16px;height:16px;border-radius:50%;object-fit:cover;margin:0;display:inline-block;' }] : ['span', {style:'display:none'}],
      node.attrs.name
    ]
  }
})

interface RichTextEditorProps {
  content: string;
  onChange: (content: string) => void;
  systemUsers?: {name: string, email: string, picture?: string}[];
}

const SLASH_COMMANDS = [
  { label: 'Texto Normal',         icon: Type,         group: 'Básico', action: (e: any) => e.chain().focus().setParagraph().run() },
  { label: 'Cabeçalho 1',          icon: Heading1,     group: 'Básico', action: (e: any) => e.chain().focus().toggleHeading({ level: 1 }).run() },
  { label: 'Cabeçalho 2',          icon: Heading2,     group: 'Básico', action: (e: any) => e.chain().focus().toggleHeading({ level: 2 }).run() },
  { label: 'Cabeçalho 3',          icon: Heading3,     group: 'Básico', action: (e: any) => e.chain().focus().toggleHeading({ level: 3 }).run() },
  { label: 'Lista com marcadores', icon: List,          group: 'Listas', action: (e: any) => e.chain().focus().toggleBulletList().run() },
  { label: 'Lista numerada',       icon: ListOrdered,  group: 'Listas', action: (e: any) => e.chain().focus().toggleOrderedList().run() },
  { label: 'Checklist',            icon: CheckSquare,  group: 'Listas', action: (e: any) => e.chain().focus().toggleTaskList().run() },
  { label: 'Lista Alternada',      icon: ChevronRight, group: 'Listas', action: (e: any) => e.chain().focus().setDetails().run() },
];

function isMarkdown(t: string) {
  return !!t && (t.trim().startsWith('#') || t.includes('- [ ]')) && !t.trim().startsWith('<');
}

interface MenuPos { top: number; left: number; }

export default function RichTextEditor({ content, onChange, systemUsers = [] }: RichTextEditorProps) {
  const [slashOpen, setSlashOpen] = useState(false);
  const [slashFrom, setSlashFrom] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState(0);

  const [mentionOpen, setMentionOpen] = useState(false);
  const [mentionFrom, setMentionFrom] = useState(0);
  const [mentionQuery, setMentionQuery] = useState('');
  const [mentionSelectedIndex, setMentionSelectedIndex] = useState(0);

  const [menuPos, setMenuPos] = useState<MenuPos>({ top: 0, left: 0 });
  const initialized = useRef(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const initialHTML = isMarkdown(content) ? '<p></p>' : (content || '<p></p>');

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Details.configure({ persist: true, HTMLAttributes: { class: 'details' } }),
      DetailsSummary,
      DetailsContent,
      MentionNode,
    ],
    content: initialHTML,
    editorProps: {
      attributes: { class: 'tiptap-editor outline-none min-h-[380px]' },
    },
    onUpdate({ editor }) {
      onChange(editor.getHTML());
      const { from } = editor.state.selection;
      const textBefore = editor.state.doc.textBetween(Math.max(0, from - 60), from, '\n');
      const currentLine = textBefore.slice(textBefore.lastIndexOf('\n') + 1);
      
      const mentionMatch = /(?:^|\s)@([^\s]*)$/.exec(textBefore);

      if (mentionMatch) {
        setMentionQuery(mentionMatch[1]);
        setMentionFrom(from - mentionMatch[1].length - 1);
        try {
          const coords = editor.view.coordsAtPos(from);
          const left = Math.min(coords.left, window.innerWidth - 272);
          setMenuPos({ top: coords.bottom + 6, left: Math.max(8, left) });
        } catch {}
        setMentionOpen(true);
        setSlashOpen(false);
      } else if (currentLine === '/') {
        setSlashFrom(from - 1);
        try {
          const coords = editor.view.coordsAtPos(from);
          const left = Math.min(coords.left, window.innerWidth - 272);
          setMenuPos({ top: coords.bottom + 6, left: Math.max(8, left) });
        } catch {}
        setSlashOpen(true);
        setSelectedIndex(0);
        setMentionOpen(false);
      } else {
        if (!currentLine.startsWith('/')) setSlashOpen(false);
        setMentionOpen(false);
      }
    },
  });

  useEffect(() => {
    if (editor && !initialized.current) {
      if (content && !isMarkdown(content)) editor.commands.setContent(content);
      initialized.current = true;
    }
  }, [editor, content]);

  useEffect(() => {
    if (!slashOpen) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setSlashOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setSelectedIndex(i => (i + 1) % SLASH_COMMANDS.length); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setSelectedIndex(i => (i - 1 + SLASH_COMMANDS.length) % SLASH_COMMANDS.length); }
      if (e.key === 'Enter')     { e.preventDefault(); run(SLASH_COMMANDS[selectedIndex]); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [slashOpen, selectedIndex]);

  const filteredUsers = systemUsers.filter(u => (u.name || u.email).toLowerCase().includes(mentionQuery.toLowerCase())).slice(0, 5);

  useEffect(() => {
    if (!mentionOpen || filteredUsers.length === 0) return;
    const h = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { setMentionOpen(false); return; }
      if (e.key === 'ArrowDown') { e.preventDefault(); setMentionSelectedIndex(i => (i + 1) % filteredUsers.length); }
      if (e.key === 'ArrowUp')   { e.preventDefault(); setMentionSelectedIndex(i => (i - 1 + filteredUsers.length) % filteredUsers.length); }
      if (e.key === 'Enter')     { e.preventDefault(); runMention(filteredUsers[mentionSelectedIndex]); }
    };
    window.addEventListener('keydown', h, true);
    return () => window.removeEventListener('keydown', h, true);
  }, [mentionOpen, mentionSelectedIndex, filteredUsers]);

  const runMention = useCallback((user: {name: string, email: string, picture?: string}) => {
    if (!editor) return;
    const displayName = user.name && user.name.trim() !== '' ? user.name : user.email;
    editor.chain().focus()
      .deleteRange({ from: mentionFrom, to: editor.state.selection.from })
      .insertContent({ type: 'mention', attrs: { name: displayName, email: user.email, picture: user.picture } })
      .insertContent(' ')
      .run();
    setMentionOpen(false);
  }, [editor, mentionFrom]);

  const run = useCallback((cmd: typeof SLASH_COMMANDS[0]) => {
    if (!editor) return;
    editor.chain().focus().deleteRange({ from: slashFrom, to: slashFrom + 1 }).run();
    cmd.action(editor);
    setSlashOpen(false);
  }, [editor, slashFrom]);

  if (!editor) return null;

  const groups = SLASH_COMMANDS.reduce((acc, cmd, idx) => {
    if (!acc[cmd.group]) acc[cmd.group] = [];
    acc[cmd.group].push({ ...cmd, idx });
    return acc;
  }, {} as Record<string, Array<typeof SLASH_COMMANDS[0] & { idx: number }>>);

  return (
    <div ref={wrapperRef} className="relative w-full bg-dark-bg border border-white/10 rounded-xl px-5 py-4 tiptap-wrapper focus-within:border-violet-500/50 transition-colors">
      <EditorContent editor={editor} />
      {slashOpen && (
        <div
          className="fixed z-[9999] w-64 bg-dark-card border border-white/10 rounded-xl shadow-2xl overflow-y-auto flex flex-col py-2"
          style={{ top: menuPos.top, left: menuPos.left, maxHeight: '300px' }}
          onMouseDown={e => e.preventDefault()}
        >
          {Object.entries(groups).map(([group, cmds]) => (
            <div key={group}>
              <div className="px-3 pt-2 pb-1">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{group}</span>
              </div>
              {cmds.map(cmd => {
                const Icon = cmd.icon;
                const active = selectedIndex === cmd.idx;
                return (
                  <button key={cmd.label} onMouseDown={e => { e.preventDefault(); run(cmd); }}
                    className={`flex items-center gap-3 px-4 py-2 w-full text-left transition-colors ${active ? 'bg-violet-600/20' : 'hover:bg-white/5'}`}>
                    <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${active ? 'bg-violet-500/30' : 'bg-white/5'}`}>
                      <Icon size={13} className={active ? 'text-violet-400' : 'text-slate-400'} />
                    </div>
                    <span className={`text-xs font-medium ${active ? 'text-violet-400' : 'text-dark-text'}`}>{cmd.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      )}
      
      {mentionOpen && filteredUsers.length > 0 && (
        <div
          className="fixed z-[9999] w-64 bg-dark-card border border-white/10 rounded-xl shadow-2xl overflow-y-auto flex flex-col py-2"
          style={{ top: menuPos.top, left: menuPos.left, maxHeight: '300px' }}
          onMouseDown={e => e.preventDefault()}
        >
          <div className="px-3 pt-2 pb-1">
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Membros</span>
          </div>
          {filteredUsers.map((u, idx) => {
            const active = mentionSelectedIndex === idx;
            const displayName = u.name && u.name.trim() !== '' ? u.name : u.email;
            return (
              <button key={u.email} onMouseDown={e => { e.preventDefault(); runMention(u); }}
                className={`flex items-center gap-3 px-4 py-2 w-full text-left transition-colors ${active ? 'bg-violet-600/20' : 'hover:bg-white/5'}`}>
                {u.picture ? (
                  <img src={u.picture} className="w-6 h-6 rounded-full object-cover shrink-0" alt={displayName} />
                ) : (
                  <div className="w-6 h-6 rounded-full bg-violet-500/30 text-violet-400 flex items-center justify-center text-[10px] font-bold shrink-0">
                    {displayName.slice(0, 2).toUpperCase()}
                  </div>
                )}
                <span className={`text-xs font-medium ${active ? 'text-violet-400' : 'text-dark-text'}`}>{displayName}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
