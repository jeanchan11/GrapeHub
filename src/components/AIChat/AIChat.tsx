import React, { useState, useRef, useEffect, useCallback } from 'react';
import Lottie from 'lottie-react';
import grapeLoader from '../../assets/grape-loader.json';
import fredImg from '../../assets/fred.png';
import { usePersonalityConfig } from '../../hooks/usePersonalityConfig';
import { Modal } from '../ui/Modal';
import {
  History, SquarePen, Trash2, Settings, X, AlertTriangle, SendHorizontal, Check,
  DollarSign, Handshake, TrendingUp, Grape, type LucideIcon,
} from 'lucide-react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

interface AIChatProps {
  activePage: string;
  userName?: string;
  floatingButton?: boolean;       // default true — se false, não renderiza o botão fixo
  externalOpen?: boolean;          // modo controlado: o pai gerencia o open
  onExternalToggle?: () => void;   // callback para o pai alternar
}

const PAGE_SECTION_MAP: Record<string, string> = {
  'financeiro-dashboard': 'financial',
  'fin-extrato':          'financial',
  'crm-comercial':        'crm',
  'active-clients':       'crm',
  'crm-metricas':         'crm',
  'crm-metas':            'crm',
  'crm-atividades':       'atividades',
  'crm-pessoas':          'atividades',
  'crm-empresas':         'atividades',
  'marketing-dashboard':  'marketing',
  'marketing-acoes':      'marketing',
  'gestor-dashboard':     'operacional',
  'gestor':               'operacional',
  'projects':             'operacional',
  'todo':                 'operacional',
};

// Ícone da área: lucide (antes emoji 💰 🤝🔥 📈 ⚙️ 🍇)
const SECTION_META: Record<string, { label: string; color: string; icon: LucideIcon; fredMode: string }> = {
  financial:   { label: 'Especialista Financeiro',  color: '#3B82F6', icon: DollarSign, fredMode: 'financeiro'   },
  crm:         { label: 'Especialista Comercial',   color: '#EF4444', icon: Handshake,  fredMode: 'comercial'   },
  atividades:  { label: 'Especialista Comercial',   color: '#EF4444', icon: Handshake,  fredMode: 'comercial'   },
  marketing:   { label: 'Especialista em Marketing',color: '#F97316', icon: TrendingUp, fredMode: 'marketing'   },
  operacional: { label: 'Especialista Operacional', color: '#FBBF24', icon: Settings,   fredMode: 'operacional' },
  general:     { label: 'Sócio Grape',              color: '#A78BFA', icon: Grape,      fredMode: 'grape'       },
};
const HISTORY_KEY_PREFIX = 'fred_conversation_history';
const MAX_SESSIONS = 30;

interface Session {
  id: string;
  title: string;
  createdAt: string;
  messages: Message[];
}

function useChatHistory(section: string) {
  const key = `${HISTORY_KEY_PREFIX}_${section}`;
  function load(): Session[] {
    try { return JSON.parse(localStorage.getItem(key) || '[]'); } catch { return []; }
  }
  function save(sessions: Session[]) {
    localStorage.setItem(key, JSON.stringify(sessions.slice(0, MAX_SESSIONS)));
  }
  function createSession(messages: Message[]): string {
    if (messages.length < 2) return '';
    const firstUser = messages.find(m => m.role === 'user')?.content || 'Conversa';
    const title = firstUser.slice(0, 60) + (firstUser.length > 60 ? '...' : '');
    const id = Date.now().toString();
    save([{ id, title, createdAt: new Date().toISOString(), messages }, ...load()]);
    return id;
  }
  function updateSession(id: string, messages: Message[]) {
    if (!id) return;
    const sessions = load();
    const idx = sessions.findIndex(s => s.id === id);
    if (idx === -1) return;
    sessions[idx] = { ...sessions[idx], messages };
    save(sessions);
  }
  function deleteSession(id: string) {
    save(load().filter(s => s.id !== id));
  }
  return { load, createSession, updateSession, deleteSession };
}

// ── Rich Markdown Renderer ────────────────────────────────────────────────────
function RichMarkdown({ text }: { text: string }) {
  const lines = text.split('\n');
  const nodes: React.ReactNode[] = [];
  let i = 0;

  function parseInline(str: string): React.ReactNode[] {
    const parts: React.ReactNode[] = [];
    let remaining = str;
    let key = 0;

    while (remaining.length > 0) {
      // Bold + italic ***
      const m3 = remaining.match(/^(.*?)\*\*\*(.*?)\*\*\*/s);
      // Bold **
      const m2 = remaining.match(/^(.*?)\*\*(.*?)\*\*/s);
      // Italic *
      const m1 = remaining.match(/^(.*?)\*(.*?)\*/s);
      // Inline code `
      const mc = remaining.match(/^(.*?)`([^`]+)`/s);
      // Link [text](url)
      const ml = remaining.match(/^(.*?)\[([^\]]+)\]\(([^)]+)\)/s);

      const candidates = [
        mc ? { idx: mc[1].length, len: mc[0].length, type: 'code', content: mc[2], before: mc[1] } : null,
        ml ? { idx: ml[1].length, len: ml[0].length, type: 'link', content: ml[2], href: ml[3], before: ml[1] } : null,
        m3 ? { idx: m3[1].length, len: m3[0].length, type: 'bi', content: m3[2], before: m3[1] } : null,
        m2 ? { idx: m2[1].length, len: m2[0].length, type: 'b', content: m2[2], before: m2[1] } : null,
        m1 ? { idx: m1[1].length, len: m1[0].length, type: 'i', content: m1[2], before: m1[1] } : null,
      ].filter(Boolean) as any[];

      if (candidates.length === 0) {
        parts.push(<span key={key++}>{remaining}</span>);
        break;
      }

      const best = candidates.reduce((a, b) => (a.idx <= b.idx ? a : b));

      if (best.before) parts.push(<span key={key++}>{best.before}</span>);

      if (best.type === 'code')
        parts.push(<code key={key++} style={{ background: 'rgba(124,58,237,0.15)', color: '#8b5cf6', padding: '1px 5px', borderRadius: 4, fontSize: '0.9em', fontFamily: 'monospace' }}>{best.content}</code>);
      else if (best.type === 'link')
        parts.push(<a key={key++} href={best.href} target="_blank" rel="noopener noreferrer" style={{ color: '#a78bfa', textDecoration: 'underline' }}>{best.content}</a>);
      else if (best.type === 'bi')
        parts.push(<strong key={key++}><em>{best.content}</em></strong>);
      else if (best.type === 'b')
        parts.push(<strong key={key++}>{best.content}</strong>);
      else if (best.type === 'i')
        parts.push(<em key={key++}>{best.content}</em>);

      remaining = remaining.slice(best.len);
    }
    return parts;
  }

  while (i < lines.length) {
    const line = lines[i];

    // Code block
    if (line.startsWith('```')) {
      const lang = line.slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].startsWith('```')) {
        codeLines.push(lines[i]);
        i++;
      }
      nodes.push(
        <div key={i} style={{ margin: '10px 0', borderRadius: 8, overflow: 'hidden', border: '1px solid rgba(124,58,237,0.3)' }}>
          {lang && (
            <div style={{ background: 'rgba(124,58,237,0.3)', padding: '3px 10px', fontSize: 10, fontWeight: 700, color: '#8b5cf6', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
              {lang}
            </div>
          )}
          <pre style={{ background: 'rgba(0,0,0,0.35)', margin: 0, padding: '10px 14px', overflowX: 'auto', color: '#e2e8f0', fontSize: 12, lineHeight: 1.6, fontFamily: 'monospace', whiteSpace: 'pre' }}>
            {codeLines.join('\n')}
          </pre>
        </div>
      );
      i++;
      continue;
    }

    // Table
    if (line.startsWith('|') && i + 1 < lines.length && lines[i + 1].match(/^\|[-| :]+\|$/)) {
      const headers = line.split('|').filter((_, j, a) => j > 0 && j < a.length - 1).map(h => h.trim());
      i += 2; // skip header + separator
      const rows: string[][] = [];
      while (i < lines.length && lines[i].startsWith('|')) {
        rows.push(lines[i].split('|').filter((_, j, a) => j > 0 && j < a.length - 1).map(c => c.trim()));
        i++;
      }
      nodes.push(
        <div key={i} style={{ overflowX: 'auto', margin: '8px 0' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
            <thead>
              <tr style={{ background: 'rgba(124,58,237,0.2)' }}>
                {headers.map((h, hi) => (
                  <th key={hi} style={{ padding: '6px 10px', textAlign: 'left', color: '#8b5cf6', fontWeight: 700, borderBottom: '1px solid rgba(124,58,237,0.3)', whiteSpace: 'nowrap' }}>
                    {parseInline(h)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, ri) => (
                <tr key={ri} style={{ background: ri % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} style={{ padding: '5px 10px', color: 'inherit', borderBottom: '1px solid rgba(128,128,128,0.15)' }}>
                      {parseInline(cell)}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      continue;
    }

    // Heading
    const hMatch = line.match(/^(#{1,3})\s+(.+)/);
    if (hMatch) {
      const level = hMatch[1].length;
      const sizes = ['1.15em', '1.05em', '1em'];
      const margins = ['14px 0 6px', '10px 0 4px', '8px 0 3px'];
      nodes.push(
        <div key={i} style={{ fontWeight: 800, fontSize: sizes[level - 1], color: 'inherit', margin: margins[level - 1], lineHeight: 1.35 }}>
          {parseInline(hMatch[2])}
        </div>
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (line.match(/^---+$/) || line.match(/^\*\*\*+$/)) {
      nodes.push(<hr key={i} style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.1)', margin: '8px 0' }} />);
      i++;
      continue;
    }

    // Unordered list
    if (line.match(/^[-*+]\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^[-*+]\s+/)) {
        items.push(lines[i].replace(/^[-*+]\s+/, ''));
        i++;
      }
      nodes.push(
        <ul key={i} style={{ margin: '6px 0', paddingLeft: 22, color: 'inherit', fontSize: 15, lineHeight: 1.75, listStyleType: 'disc' }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ marginBottom: 4 }}>{parseInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list
    if (line.match(/^\d+\.\s+/)) {
      const items: string[] = [];
      while (i < lines.length && lines[i].match(/^\d+\.\s+/)) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      nodes.push(
        <ol key={i} style={{ margin: '6px 0', paddingLeft: 24, color: 'inherit', fontSize: 15, lineHeight: 1.75 }}>
          {items.map((item, ii) => (
            <li key={ii} style={{ marginBottom: 4 }}>{parseInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const qLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        qLines.push(lines[i].slice(2));
        i++;
      }
      nodes.push(
        <blockquote key={i} style={{ borderLeft: '3px solid #7c3aed', marginLeft: 0, paddingLeft: 12, color: 'inherit', opacity: 0.7, fontStyle: 'italic', fontSize: 13 }}>
          {qLines.map((ql, qi) => <div key={qi}>{parseInline(ql)}</div>)}
        </blockquote>
      );
      continue;
    }

    // Empty line
    if (line.trim() === '') {
      nodes.push(<div key={i} style={{ height: 6 }} />);
      i++;
      continue;
    }

    // Regular paragraph
    nodes.push(
      <p key={i} style={{ margin: '0 0 8px', lineHeight: 1.75, color: 'inherit', fontSize: 15 }}>
        {parseInline(line)}
      </p>
    );
    i++;
  }

  return <div style={{ wordBreak: 'break-word' }}>{nodes}</div>;
}

// ── Message Renderer ────────────────────────────────────────────────────────────
// Injeta apenas reset de layout — não sobrescreve o background gerado pelo Fred
function injectBaseStyles(html: string): string {
  const override = '<style>html,body{margin:0;padding:0;box-sizing:border-box;}</style>';
  if (html.includes('</head>')) return html.replace('</head>', override + '</head>');
  if (html.includes('<body')) return html.replace('<body', override + '<body');
  return override + html;
}

function renderAssistantMessage(content: string, c: any): React.ReactNode {
  const iframeStyle: React.CSSProperties = {
    width: '100%', height: 520, border: 'none',
    borderRadius: 12, display: 'block', overflow: 'hidden',
    background: 'transparent',
  };

  // Detecta HTML em fence markdown: ```html ... ```
  const fenceMatch = content.match(/```[hH][tT][mM][lL]?\s*\n([\s\S]*?)```([\s\S]*)$/);
  if (fenceMatch) {
    const htmlContent = injectBaseStyles(fenceMatch[1]);
    const afterText = fenceMatch[2].trim();
    return (
      <>
        <iframe srcDoc={htmlContent} style={iframeStyle} scrolling="no" sandbox="allow-scripts allow-same-origin" />
        {afterText && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${c.border}`, color: c.assistantBubbleText }}>
            <RichMarkdown text={afterText} />
          </div>
        )}
      </>
    );
  }
  // HTML puro — extrai parte após </html> como texto de análise
  const trimmed = content.trim();
  const htmlPureMatch = trimmed.match(/^(<[\s\S]*?<\/html>)([\s\S]*)$/i);
  if (htmlPureMatch) {
    const htmlContent = injectBaseStyles(htmlPureMatch[1]);
    const afterText = htmlPureMatch[2].trim();
    return (
      <>
        <iframe srcDoc={htmlContent} style={iframeStyle} scrolling="no" sandbox="allow-scripts allow-same-origin" />
        {afterText && (
          <div style={{ padding: '12px 16px', borderTop: `1px solid ${c.border}`, color: c.assistantBubbleText }}>
            <RichMarkdown text={afterText} />
          </div>
        )}
      </>
    );
  }
  if (trimmed.startsWith('<')) {
    return <iframe srcDoc={injectBaseStyles(trimmed)} style={iframeStyle} scrolling="no" sandbox="allow-scripts allow-same-origin" />;
  }
  return <div style={{ color: c.assistantBubbleText }}><RichMarkdown text={content} /></div>;
}

// ── Main Component ─────────────────────────────────────────────────────────────
export function AIChat({ activePage, userName, floatingButton = true, externalOpen, onExternalToggle }: AIChatProps) {
  const [_open, _setOpen] = useState(false);

  // Modo controlado: usa o estado externo se fornecido
  const open = externalOpen !== undefined ? externalOpen : _open;
  const setOpen = (val: boolean | ((o: boolean) => boolean)) => {
    if (onExternalToggle) {
      onExternalToggle();
    } else {
      _setOpen(val);
    }
  };
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showConfig, setShowConfig] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historySessions, setHistorySessions] = useState<Session[]>([]);
  const { config, updateField, saveConfig, resetConfig } = usePersonalityConfig();

  const activeSection = PAGE_SECTION_MAP[activePage] || 'general';
  const history = useChatHistory(activeSection);
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const currentSessionId = useRef<string>('');

  const isFinancialPage = activeSection === 'financial'; // mantido para compatibilidade
  const sectionMeta = SECTION_META[activeSection] || SECTION_META.general;
  const fredMode = sectionMeta.fredMode;

  // Detecta tema de forma reativa
  const [isDark, setIsDark] = useState(() =>
    document.documentElement.classList.contains('dark') ||
    document.documentElement.classList.contains('darker')
  );
  useEffect(() => {
    const obs = new MutationObserver(() => {
      setIsDark(
        document.documentElement.classList.contains('dark') ||
        document.documentElement.classList.contains('darker')
      );
    });
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => obs.disconnect();
  }, []);

  // Superfície e texto vêm dos tokens do tema (--dark-card / --dark-text): acompanha dark e darker.
  const c = isDark ? {
    panelBg: 'rgb(var(--dark-card))',
    msgsBg: 'rgb(var(--dark-card))',
    headerBg: 'rgb(var(--dark-card))',
    border: 'rgba(255,255,255,0.08)',
    configBg: 'rgba(0,0,0,0.2)',
    inputAreaBg: 'rgb(var(--dark-card))',
    inputWrapBg: 'rgba(255,255,255,0.06)',
    inputWrapBorder: 'rgba(255,255,255,0.12)',
    text: 'rgb(var(--dark-text))',
    subText: 'rgba(255,255,255,0.5)',
    labelText: 'rgba(255,255,255,0.3)',
    assistantBubbleBg: 'transparent',
    assistantBubbleText: 'rgb(var(--dark-text) / 0.9)',
    iconBtnBg: 'rgba(255,255,255,0.07)',
    iconBtnColor: 'rgba(255,255,255,0.5)',
    boxShadow: '0 24px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(124,58,237,0.15)',
    dotColor: '#A78BFA',
    hintText: 'rgba(255,255,255,0.2)',
  } : {
    panelBg: 'rgb(var(--dark-card))',
    msgsBg: 'rgb(var(--dark-card))',
    headerBg: 'rgb(var(--dark-card))',
    border: 'rgba(0,0,0,0.1)',
    configBg: '#f9fafb',
    inputAreaBg: 'rgb(var(--dark-card))',
    inputWrapBg: '#f4f4f4',
    inputWrapBorder: '#d1d5db',
    text: 'rgb(var(--dark-text))',
    subText: '#64748b',
    labelText: '#9ca3af',
    assistantBubbleBg: 'transparent',
    assistantBubbleText: 'rgb(var(--dark-text))',
    iconBtnBg: '#f3f4f6',
    iconBtnColor: '#6b7280',
    boxShadow: '0 24px 80px rgba(0,0,0,0.15), 0 0 0 1px rgba(124,58,237,0.1)',
    dotColor: '#7C3AED',
    hintText: 'rgba(0,0,0,0.25)',
  };

  useEffect(() => {
    if (open) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      setTimeout(() => inputRef.current?.focus(), 120);
    }
  }, [messages, open]);

  // ESC em cascata: agora é do <Modal> — o painel do chat desliga o Esc enquanto Histórico ou
  // Configurar estão abertos, então o Esc fecha só o de cima (mesmo comportamento de antes).

  // Prevent body scroll when open
  useEffect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  const sendMessage = useCallback(async () => {
    if (!input.trim() || loading) return;

    const userMessage: Message = { role: 'user', content: input.trim() };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInput('');
    setLoading(true);
    setError(null);

    try {
      const res = await fetch('/api/ai/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          messages: newMessages,
          pageContext: {
            page: activePage,
            section: activeSection,
            fredMode,
            includeFinancial: isFinancialPage,
            theme: document.documentElement.classList.contains('darker') ? 'deep'
              : document.documentElement.classList.contains('dark') ? 'dark'
              : 'light',
          },
          personalityConfig: config,
        }),
      });

      if (!res.ok) {
        const errJson = await res.json().catch(() => ({}));
        throw new Error(errJson.error || `Erro ${res.status}`);
      }

      const data = await res.json();
      const updatedMessages: Message[] = [...newMessages, { role: 'assistant', content: data.reply }];
      setMessages(updatedMessages);
      // Cria sessão na 1ª resposta; atualiza a mesma em seguida
      if (!currentSessionId.current) {
        currentSessionId.current = history.createSession(updatedMessages);
      } else {
        history.updateSession(currentSessionId.current, updatedMessages);
      }
    } catch (err: any) {
      setError(err.message || 'Erro ao conectar. Tente novamente.');
    } finally {
      setLoading(false);
    }
  }, [input, loading, messages, activePage, activeSection, isFinancialPage, config]);

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }

  function clearHistory() {
    // Garante que a sessão atual está salva antes de limpar
    currentSessionId.current = '';
    setMessages([]);
    setError(null);
  }

  function newConversation() {
    // Salva conversa atual (já está sendo atualizada via updateSession) e inicia nova
    currentSessionId.current = '';
    setMessages([]);
    setError(null);
    setTimeout(() => inputRef.current?.focus(), 120);
  }

  function openHistory() {
    setHistorySessions(history.load());
    setShowHistory(true);
  }

  function loadSession(session: Session) {
    currentSessionId.current = session.id;
    setMessages(session.messages);
    setShowHistory(false);
  }

  function deleteSession(id: string) {
    history.deleteSession(id);
    setHistorySessions(prev => prev.filter(s => s.id !== id));
  }

  const greeting = userName ? `Olá, ${userName.split(' ')[0]}!` : 'Olá!';

  const SectionIcon = sectionMeta.icon;
  const iconBtn = (ativo = false): React.CSSProperties => ({
    width: 30, height: 30, borderRadius: 8, border: 'none', cursor: 'pointer',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    background: ativo ? 'rgba(124,58,237,0.2)' : c.iconBtnBg,
    color: ativo ? '#8b5cf6' : c.iconBtnColor,
  });

  // Painel do chat no <Modal> padrão (portal, overlay, Esc, clique fora fecha — como antes).
  const modal = (
    <Modal
      isOpen={open}
      onClose={() => setOpen(false)}
      semCabecalho
      semPadding
      fecharComEsc={!showConfig && !showHistory}
      maxWidth="max-w-[1100px]"
    >
      {/* Panel */}
      <div
        id="ai-chat-panel"
        style={{
          position: 'relative',
          width: '100%',
          height: 'calc(100vh - 120px)',
          maxHeight: 920,
          background: c.panelBg,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          padding: '16px 20px',
          borderBottom: `1px solid ${c.border}`,
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          background: c.headerBg,
          flexShrink: 0,
        }}>
          <div style={{
            width: 38, height: 38, flexShrink: 0,
          }}>
            <img src={fredImg} alt="Fred" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
          </div>

          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 700, fontSize: 17, color: c.text }}>{config.nome}</div>
            <div style={{ fontSize: 10, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: 5, marginTop: 2 }}>
              <span style={{ width: 6, height: 6, borderRadius: '50%', background: sectionMeta.color, flexShrink: 0 }} />
              <span style={{ color: sectionMeta.color, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                {sectionMeta.label} <SectionIcon size={11} />
              </span>
            </div>
          </div>

          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <button
              onClick={openHistory}
              title="Histórico de conversas"
              style={iconBtn(showHistory)}
            ><History size={15} /></button>
            <button
              onClick={newConversation}
              title="Nova conversa"
              style={iconBtn()}
            ><SquarePen size={15} /></button>
            <button
              onClick={clearHistory}
              title="Limpar conversa"
              style={iconBtn()}
            ><Trash2 size={15} /></button>
            <button
              onClick={() => setShowConfig(s => !s)}
              title="Configurar personalidade"
              style={iconBtn(showConfig)}
            ><Settings size={15} /></button>
            <button
              onClick={() => setOpen(false)}
              title="Fechar"
              style={iconBtn()}
            ><X size={16} /></button>
          </div>
        </div>

        {/* ── History Modal ── */}
        <Modal isOpen={showHistory} onClose={() => setShowHistory(false)} semCabecalho semPadding maxWidth="max-w-[600px]">
            <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: c.text, display: 'flex', alignItems: 'center', gap: 8 }}><History size={16} style={{ color: '#8b5cf6' }} /> Histórico de Conversas</div>
                  <div style={{ fontSize: 11, color: c.subText, marginTop: 3 }}>{historySessions.length} sessão(ões) salva(s)</div>
                </div>
                <button onClick={() => setShowHistory(false)} aria-label="Fechar" style={iconBtn()}><X size={16} /></button>
              </div>
              {/* List */}
              <div style={{ maxHeight: '65vh', overflowY: 'auto', padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
                {historySessions.length === 0 ? (
                  <div style={{ textAlign: 'center', padding: '48px 0', color: c.subText, fontSize: 14, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                    <div style={{ width: 64, height: 64, marginBottom: 4 }}>
                <img src={fredImg} alt="Fred" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
                    Nenhuma conversa salva ainda
                  </div>
                ) : historySessions.map(session => {
                  const date = new Date(session.createdAt);
                  const dateStr = date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
                  const timeStr = date.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' });
                  const msgCount = session.messages.length;
                  return (
                    <div key={session.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '12px 14px', borderRadius: 12, border: `1px solid ${c.border}`, background: c.configBg, cursor: 'pointer', transition: 'background 0.15s' }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(124,58,237,0.08)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = c.configBg}
                    >
                      <div style={{ flex: 1, minWidth: 0, cursor: 'pointer' }} onClick={() => loadSession(session)}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: c.text, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{session.title}</div>
                        <div style={{ fontSize: 11, color: c.subText, marginTop: 3 }}>{dateStr} às {timeStr} · {msgCount} mensagens</div>
                      </div>
                      <button
                        onClick={() => loadSession(session)}
                        style={{ padding: '5px 14px', fontSize: 11, fontWeight: 700, background: 'rgba(124,58,237,0.12)', color: '#8b5cf6', border: '1px solid rgba(124,58,237,0.25)', borderRadius: 8, cursor: 'pointer', whiteSpace: 'nowrap' }}
                      >Abrir</button>
                      <button
                        onClick={e => { e.stopPropagation(); deleteSession(session.id); }}
                        style={{ width: 28, height: 28, borderRadius: 8, background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.2)', color: '#f43f5e', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}
                        title="Excluir sessão"
                      ><Trash2 size={13} /></button>
                    </div>
                  );
                })}
              </div>
            </div>
        </Modal>

        {/* ── Config Modal ── (formulário: clique fora não fecha; Esc e Cancelar fecham) */}
        <Modal isOpen={showConfig} onClose={() => setShowConfig(false)} semCabecalho semPadding fecharAoClicarFora={false} maxWidth="max-w-[680px]">
            <div style={{ position: 'relative', width: '100%', overflow: 'hidden' }}>
              {/* Header */}
              <div style={{ padding: '18px 24px', borderBottom: `1px solid ${c.border}`, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 16, color: c.text, display: 'flex', alignItems: 'center', gap: 8 }}><Settings size={16} style={{ color: '#8b5cf6' }} /> Configurar {config.nome}</div>
                  <div style={{ fontSize: 11, color: c.subText, marginTop: 3 }}>Personalize a personalidade e instruções do assistente</div>
                </div>
                <button onClick={() => setShowConfig(false)} aria-label="Fechar" style={iconBtn()}><X size={16} /></button>
              </div>
              {/* Body */}
              <div style={{ padding: '20px 24px', display: 'flex', flexDirection: 'column', gap: 16, maxHeight: '70vh', overflowY: 'auto' }}>
                {/* Nome + Humor */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                  {(['nome', 'humor'] as const).map(field => (
                    <div key={field}>
                      <label style={{ fontSize: 11, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                        {field === 'nome' ? 'Nome do assistente' : 'Humor / Tom'}
                      </label>
                      <input
                        value={config[field]}
                        onChange={e => updateField(field, e.target.value)}
                        style={{ width: '100%', padding: '8px 12px', fontSize: 13, background: c.inputWrapBg, border: `1px solid rgba(124,58,237,0.25)`, borderRadius: 10, color: c.text, outline: 'none', boxSizing: 'border-box', transition: 'border-color 0.2s' }}
                        onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                        onBlur={e => e.target.style.borderColor = 'rgba(124,58,237,0.25)'}
                      />
                    </div>
                  ))}
                </div>
                {/* Personalidade */}
                <div>
                  <label style={{ fontSize: 11, fontWeight: 600, color: c.subText, display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Personalidade</label>
                  <textarea
                    value={config.personalidade}
                    onChange={e => updateField('personalidade', e.target.value)}
                    rows={4}
                    style={{ width: '100%', padding: '10px 12px', fontSize: 13, background: c.inputWrapBg, border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10, color: c.text, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.6, fontFamily: 'inherit', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(124,58,237,0.25)'}
                  />
                </div>
                {/* Instruções extras */}
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
                    <label style={{ fontSize: 11, fontWeight: 600, color: c.subText, textTransform: 'uppercase', letterSpacing: '0.08em' }}>Instruções extras</label>
                    <span style={{ fontSize: 10, color: c.labelText }}>{config.instrucoes_extras.length} caracteres</span>
                  </div>
                  <textarea
                    value={config.instrucoes_extras}
                    onChange={e => updateField('instrucoes_extras', e.target.value)}
                    rows={8}
                    placeholder="Ex: Quando o usuário pedir gráficos, use Chart.js via CDN..."
                    style={{ width: '100%', padding: '10px 12px', fontSize: 12.5, background: c.inputWrapBg, border: '1px solid rgba(124,58,237,0.25)', borderRadius: 10, color: c.text, outline: 'none', boxSizing: 'border-box', resize: 'vertical', lineHeight: 1.7, fontFamily: 'monospace', transition: 'border-color 0.2s' }}
                    onFocus={e => e.target.style.borderColor = 'rgba(124,58,237,0.6)'}
                    onBlur={e => e.target.style.borderColor = 'rgba(124,58,237,0.25)'}
                  />
                </div>
              </div>
              {/* Footer */}
              <div style={{ padding: '16px 24px', borderTop: `1px solid ${c.border}`, display: 'flex', gap: 10, justifyContent: 'flex-end', background: c.configBg }}>
                <button onClick={() => { resetConfig(); }} style={{ padding: '8px 18px', fontSize: 12, fontWeight: 600, background: c.iconBtnBg, color: c.iconBtnColor, border: `1px solid ${c.border}`, borderRadius: 10, cursor: 'pointer' }}>
                  Resetar padrões
                </button>
                <button onClick={() => setShowConfig(false)} style={{ padding: '8px 18px', fontSize: 12, fontWeight: 600, background: c.iconBtnBg, color: c.iconBtnColor, border: `1px solid ${c.border}`, borderRadius: 10, cursor: 'pointer' }}>
                  Cancelar
                </button>
                <button onClick={() => { saveConfig(); setShowConfig(false); }} style={{ padding: '8px 24px', fontSize: 12, fontWeight: 700, background: '#7c3aed', color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <Check size={14} /> Salvar configuração
                </button>
              </div>
            </div>
        </Modal>

        {/* ── Messages ── */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px', display: 'flex', flexDirection: 'column', gap: 24, background: c.msgsBg, fontFamily: "'General Sans', system-ui, -apple-system, sans-serif" }}>

          {messages.length === 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', gap: 10, textAlign: 'center', padding: '0 40px' }}>
              <div style={{ width: 64, height: 64, marginBottom: 8 }}>
                <img src={fredImg} alt="Fred" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
              </div>
              <p style={{ fontSize: 17, color: c.subText, margin: 0, lineHeight: 1.6, fontWeight: 500 }}>
                {greeting} Pergunte sobre finanças, clientes, estratégia ou operações.
              </p>
              {isFinancialPage && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: 'rgba(124,58,237,0.15)', border: '1px solid rgba(124,58,237,0.3)', borderRadius: 8, padding: '6px 14px' }}>
                  <Check size={13} style={{ color: '#8b5cf6' }} />
                  <span style={{ fontSize: 12, color: '#8b5cf6', fontWeight: 600 }}>Dados financeiros disponíveis para análise</span>
                </div>
              )}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, justifyContent: 'center', marginTop: 8 }}>
                {(isFinancialPage
                  ? ['Qual o faturamento do mês?', 'Quais despesas estão pendentes?', 'Mostre um resumo do caixa']
                  : ['Como estão os clientes ativos?', 'Quais tarefas estão atrasadas?', 'Analise a performance comercial']
                ).map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => { setInput(suggestion); setTimeout(() => inputRef.current?.focus(), 50); }}
                    style={{ padding: '8px 16px', fontSize: 13, background: c.iconBtnBg, border: `1px solid ${c.border}`, borderRadius: 20, color: c.subText, cursor: 'pointer', transition: 'all 0.15s' }}
                    onMouseEnter={e => { (e.target as HTMLElement).style.background = 'rgba(124,58,237,0.12)'; (e.target as HTMLElement).style.color = '#8b5cf6'; (e.target as HTMLElement).style.borderColor = 'rgba(124,58,237,0.4)'; }}
                    onMouseLeave={e => { (e.target as HTMLElement).style.background = c.iconBtnBg; (e.target as HTMLElement).style.color = c.subText; (e.target as HTMLElement).style.borderColor = c.border; }}
                  >
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          )}

          {messages.map((m, idx) => (
            <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: m.role === 'user' ? 'flex-end' : 'flex-start', gap: 4 }}>
              {m.role === 'assistant' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                  <div style={{ width: 22, height: 22, flexShrink: 0 }}>
                  <img src={fredImg} alt="Fred" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                </div>
                  <span style={{ fontSize: 12, color: c.subText, fontWeight: 600, fontFamily: "'General Sans', system-ui, -apple-system, sans-serif", letterSpacing: '0.01em' }}>{config.nome}</span>
                </div>
              )}
              {(() => {
                const isHtmlContent = m.role === 'assistant' && (
                  /^```[hH][tT][mM][lL]?\s*\n[\s\S]*?```\s*$/.test(m.content) ||
                  m.content.trim().startsWith('<')
                );
                if (m.role === 'user') {
                  return (
                    <div style={{
                      maxWidth: '72%',
                      background: isDark ? 'rgba(255,255,255,0.08)' : '#f0f0f0',
                      borderRadius: '18px 18px 4px 18px',
                      padding: '11px 16px',
                      color: c.text,
                    }}>
                      <p style={{ margin: 0, fontSize: 15, lineHeight: 1.65, whiteSpace: 'pre-wrap', wordBreak: 'break-word', fontFamily: "'General Sans', system-ui, -apple-system, sans-serif" }}>{m.content}</p>
                    </div>
                  );
                }
                // Assistant: sem caixa, texto plano
                return (
                  <div style={{
                    width: isHtmlContent ? '100%' : undefined,
                    maxWidth: isHtmlContent ? '100%' : '92%',
                    background: 'transparent',
                    border: 'none',
                    padding: isHtmlContent ? '0' : '0 0 0 30px',
                    color: c.assistantBubbleText,
                  }}>
                    {renderAssistantMessage(m.content, c)}
                  </div>
                );
              })()}
            </div>
          ))}

          {loading && (
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 4 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 7, marginBottom: 2 }}>
                <div style={{ width: 22, height: 22 }}>
                  <img src={fredImg} alt="Fred" style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }} />
                </div>
                <span style={{ fontSize: 12, color: c.subText, fontWeight: 600, fontFamily: "'General Sans', system-ui, -apple-system, sans-serif" }}>{config.nome}</span>
              </div>
              <div style={{ paddingLeft: 30 }}>
                <Lottie
                  animationData={grapeLoader}
                  loop
                  autoplay
                  style={{ width: 100, height: 100 }}
                />
              </div>
            </div>
          )}

          {error && (
            <div style={{ background: 'rgba(244,63,94,0.1)', border: '1px solid rgba(244,63,94,0.3)', borderRadius: 10, padding: '10px 14px', fontSize: 12, color: '#f43f5e', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}><AlertTriangle size={14} style={{ flexShrink: 0 }} /> {error}</span>
              <button onClick={() => setError(null)} aria-label="Fechar aviso" style={{ background: 'none', border: 'none', color: '#f43f5e', cursor: 'pointer', padding: 0, display: 'flex' }}><X size={15} /></button>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* ── Input ── */}
        <div style={{ padding: '12px 16px', borderTop: `1px solid ${c.border}`, background: c.inputAreaBg, flexShrink: 0 }}>
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', background: c.inputWrapBg, border: `1px solid ${c.inputWrapBorder}`, borderRadius: 14, padding: '8px 10px', transition: 'border-color 0.2s' }}>
            <textarea
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Pergunte algo... (Shift+Enter para nova linha)"
              disabled={loading}
              rows={1}
              style={{
                flex: 1,
                background: 'transparent',
                border: 'none',
                color: c.text,
                fontSize: 15,
                outline: 'none',
                resize: 'none',
                lineHeight: 1.5,
                maxHeight: 100,
                overflow: 'auto',
                paddingTop: 2,
                fontFamily: 'inherit',
              }}
              onInput={(e) => {
                const t = e.target as HTMLTextAreaElement;
                t.style.height = 'auto';
                t.style.height = Math.min(t.scrollHeight, 100) + 'px';
              }}
            />
            <button
              onClick={sendMessage}
              disabled={loading || !input.trim()}
              style={{
                background: loading || !input.trim() ? 'rgba(124,58,237,0.3)' : '#7C3AED',
                border: 'none',
                borderRadius: 10,
                width: 36,
                height: 36,
                color: '#fff',
                cursor: loading || !input.trim() ? 'not-allowed' : 'pointer',
                fontSize: 16,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'background 0.2s',
                flexShrink: 0,
              }}
              aria-label="Enviar"
            ><SendHorizontal size={16} /></button>
          </div>
          <p style={{ fontSize: 10, color: c.hintText, margin: '6px 0 0', textAlign: 'center' }}>
            Enter para enviar · Shift+Enter para nova linha
          </p>
        </div>
      </div>
    </Modal>
  );

  return (
    <>
        {floatingButton && (
        <button
          id="ai-chat-toggle-btn"
          onClick={() => setOpen((o) => !o)}
          title={open ? 'Fechar Fred' : `Abrir ${config.nome}`}
          style={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 9998,
            width: 52,
            height: 52,
            borderRadius: '50%',
            background: open ? '#6d28d9' : '#7c3aed',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            boxShadow: '0 4px 16px rgba(0,0,0,0.25)',
            transition: 'all 0.2s',
            transform: open ? 'rotate(90deg) scale(0.9)' : 'scale(1)',
          }}
        >
          {open
            ? <X size={18} />
            : <img src={fredImg} alt="Fred" style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
          }
        </button>
        )}

      {/* ── Modal (o <Modal> já usa portal) ── */}
      {modal}
    </>
  );
}
