import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import {
  Phone, Mail, Users, MessageSquare, Video, FileText,
  Instagram, Linkedin, Zap, X, Clock, Bell, ChevronDown
} from 'lucide-react';

// ─── Types ────────────────────────────────────────────────────────────────────
interface Activity {
  id: number;
  lead_id: string;
  lead_name?: string;
  lead_company?: string;
  kanban_id?: string;
  kanban_name?: string;
  title: string;
  type: string;
  priority?: string;
  due_date?: string;
  start_time?: string;
  end_time?: string;
  responsible_id?: string;
  observations?: string;
  completed: boolean;
  completed_at?: string;
  created_at: string;
}

interface ToastItem {
  id: string;
  activityId: number;
  title: string;
  subtitle: string;
  type: string;
  isOverdue: boolean;
  leadName?: string;
  kanbanName?: string;
}

// ─── Type Config ──────────────────────────────────────────────────────────────
const TYPE_CONFIG: Record<string, { icon: React.ElementType; emoji: string; color: string }> = {
  'Ligação':      { icon: Phone,         emoji: '📞', color: '#8b5cf6' },
  'Reunião':      { icon: Users,         emoji: '📅', color: '#f59e0b' },
  'Videochamada': { icon: Video,         emoji: '📹', color: '#ec4899' },
  'Email':        { icon: Mail,          emoji: '✉️', color: '#3b82f6' },
  'WhatsApp':     { icon: MessageSquare, emoji: '💬', color: '#22c55e' },
  'Instagram':    { icon: Instagram,     emoji: '📸', color: '#f43f5e' },
  'LinkedIn':     { icon: Linkedin,      emoji: '💼', color: '#0ea5e9' },
  'Outros':       { icon: FileText,      emoji: '📋', color: '#64748b' },
};

function getTypeConfig(type: string) {
  return TYPE_CONFIG[type] || { icon: Zap, emoji: '⚡', color: '#8b5cf6' };
}

// ─── Constants ────────────────────────────────────────────────────────────────
const STACK_OFFSET_Y = 8;
const STACK_SCALE = 0.04;
const STACK_OPACITY = 0.12;
const MAX_VISIBLE = 5;
const AUTO_DISMISS_MS = 10000;
const POLL_INTERVAL_MS = 60 * 1000;
const UPCOMING_MINUTES = 15;
const TOAST_WIDTH = 380;

// ─── iOS Notification Sound (Web Audio API) ───────────────────────────────────
let audioCtx: AudioContext | null = null;
let audioWarmedUp = false;

function warmUpAudio() {
  if (audioWarmedUp) return;
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    audioWarmedUp = true;
  } catch {
    // Silent fail
  }
}

if (typeof window !== 'undefined') {
  const initAudio = () => {
    warmUpAudio();
    document.removeEventListener('click', initAudio);
    document.removeEventListener('keydown', initAudio);
  };
  document.addEventListener('click', initAudio, { once: false });
  document.addEventListener('keydown', initAudio, { once: false });
}

function playNotificationSound() {
  try {
    if (!audioCtx) audioCtx = new AudioContext();
    const ctx = audioCtx;
    if (ctx.state === 'suspended') ctx.resume();
    const now = ctx.currentTime;
    const notes = [880, 1108.73, 1318.51];
    notes.forEach((freq, i) => {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.value = freq;
      gain.gain.setValueAtTime(0, now + i * 0.12);
      gain.gain.linearRampToValueAtTime(0.45, now + i * 0.12 + 0.02);
      gain.gain.exponentialRampToValueAtTime(0.001, now + i * 0.12 + 0.3);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start(now + i * 0.12);
      osc.stop(now + i * 0.12 + 0.35);
    });
  } catch {
    // Silent fail
  }
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function isOverdue(dateStr: string, timeStr?: string): boolean {
  if (!dateStr) return false;
  const now = new Date();
  const dateOnly = dateStr.split('T')[0];
  const day = new Date(dateOnly + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (day < today) return true;
  if (+day > +today) return false;
  if (timeStr) {
    const [h, m] = timeStr.split(':').map(Number);
    const actTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
    return actTime < now;
  }
  return false;
}

function isUpcoming(dateStr: string, timeStr?: string): boolean {
  if (!dateStr || !timeStr) return false;
  const now = new Date();
  const dateOnly = dateStr.split('T')[0];
  const day = new Date(dateOnly + 'T00:00:00');
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (+day !== +today) return false;
  const [h, m] = timeStr.split(':').map(Number);
  const actTime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), h, m);
  const diffMin = (actTime.getTime() - now.getTime()) / 60000;
  return diffMin > 0 && diffMin <= UPCOMING_MINUTES;
}

function formatTimeLabel(timeStr?: string): string {
  if (!timeStr) return '';
  return timeStr.slice(0, 5);
}

// ─── Toast Content ────────────────────────────────────────────────────────────
const ToastContent: React.FC<{
  toast: ToastItem;
  isDark: boolean;
  onDismiss: (id: string) => void;
  isExpanded?: boolean;
}> = ({ toast, isDark, onDismiss, isExpanded }) => {
  const cfg = getTypeConfig(toast.type);
  const Icon = cfg.icon;

  return (
    <div
      style={{
        background: isDark ? 'rgba(28, 28, 30, 0.82)' : 'rgba(255, 255, 255, 0.92)',
        backdropFilter: 'blur(24px) saturate(180%)',
        WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        borderRadius: 18,
        border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
        boxShadow: isDark
          ? (isExpanded 
             ? '0 2px 12px rgba(0,0,0,0.15), inset 0 1px 0 rgba(255,255,255,0.06)'
             : '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)')
          : (isExpanded
             ? '0 2px 12px rgba(0,0,0,0.04), inset 0 1px 0 rgba(255,255,255,0.9)'
             : '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)'),
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        cursor: 'default',
        width: TOAST_WIDTH,
        boxSizing: 'border-box',
      }}
    >
      {/* Icon */}
      <div
        style={{
          width: 38,
          height: 38,
          borderRadius: 10,
          background: `linear-gradient(135deg, ${cfg.color}33, ${cfg.color}18)`,
          border: `1px solid ${cfg.color}40`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0,
        }}
      >
        <Icon size={18} style={{ color: cfg.color }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
          {toast.isOverdue && (
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: '#ff453a', background: 'rgba(255, 69, 58, 0.15)', borderRadius: 4, padding: '1px 5px',
            }}>
              Atrasada
            </span>
          )}
          {!toast.isOverdue && (
            <span style={{
              fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
              color: isDark ? '#30d158' : '#34c759',
              background: isDark ? 'rgba(48, 209, 88, 0.15)' : 'rgba(52, 199, 89, 0.12)',
              borderRadius: 4, padding: '1px 5px',
            }}>
              Em breve
            </span>
          )}
          {toast.kanbanName && (
            <span style={{
              fontSize: 9, fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em',
              color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
            }}>
              {toast.kanbanName}
            </span>
          )}
        </div>

        <p style={{
          fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.3,
          color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.88)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {toast.title}
        </p>

        <p style={{
          fontSize: 11, fontWeight: 500, margin: 0, marginTop: 1, lineHeight: 1.3,
          color: isDark ? 'rgba(255,255,255,0.45)' : 'rgba(0,0,0,0.45)',
          whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
        }}>
          {toast.subtitle}
        </p>
      </div>

      {/* Dismiss */}
      <button
        onClick={(e) => { e.stopPropagation(); onDismiss(toast.id); }}
        style={{
          width: 28, height: 28, borderRadius: '50%', display: 'flex',
          alignItems: 'center', justifyContent: 'center', cursor: 'pointer',
          flexShrink: 0, transition: 'all 0.15s ease',
          background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
          border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.06)',
          color: isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)',
        }}
        onMouseEnter={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = isDark ? 'rgba(255,255,255,0.15)' : 'rgba(0,0,0,0.1)';
          el.style.color = isDark ? 'rgba(255,255,255,0.8)' : 'rgba(0,0,0,0.7)';
        }}
        onMouseLeave={(e) => {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
          el.style.color = isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.35)';
        }}
      >
        <X size={13} />
      </button>
    </div>
  );
};

// ─── Main Toast Stack ─────────────────────────────────────────────────────────
const ActivityToastStack: React.FC = () => {
  const { userData } = useAuth();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );
  const dismissedIdsRef = useRef<Set<string>>(new Set());
  const containerRef = useRef<HTMLDivElement>(null);

  const allowedRoles = ['superadmin', 'gerente-comercial'];
  const hasAccess = userData?.role && allowedRoles.includes(userData.role);

  // Watch for theme changes instantly
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains('dark'));
    });
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  const activityToToast = useCallback((a: Activity): ToastItem => {
    const timeLabel = formatTimeLabel(a.start_time);
    const actIsOverdue = isOverdue(a.due_date || '', a.start_time);
    const title = a.title || 'Atividade';
    const subtitle = [
      timeLabel ? `🕐 ${timeLabel}` : '',
      a.type || '',
      a.lead_name ? `👤 ${a.lead_name}` : '',
      a.kanban_name || '',
    ].filter(Boolean).join(' · ');

    return {
      id: `act-${a.id}-${Date.now()}`,
      activityId: a.id,
      title,
      subtitle,
      type: a.type,
      isOverdue: actIsOverdue,
      leadName: a.lead_name,
      kanbanName: a.kanban_name,
    };
  }, []);

  const fetchAndNotify = useCallback(async () => {
    if (!hasAccess) return;
    try {
      const res = await fetch('/api/crm-comercial/activities?completed=false');
      if (!res.ok) return;
      const activities: Activity[] = await res.json();
      const relevant = activities.filter(a => {
        if (!a.due_date || a.completed) return false;
        return isOverdue(a.due_date, a.start_time) || isUpcoming(a.due_date, a.start_time);
      });
      const newToasts: ToastItem[] = [];
      for (const act of relevant) {
        const baseKey = `act-${act.id}`;
        if (!dismissedIdsRef.current.has(baseKey)) {
          newToasts.push(activityToToast(act));
        }
      }
      if (newToasts.length > 0) {
        setToasts(prev => {
          const existingIds = new Set(prev.map(t => t.activityId));
          const unique = newToasts.filter(t => !existingIds.has(t.activityId));
          if (unique.length > 0) playNotificationSound();
          return [...unique, ...prev].slice(0, MAX_VISIBLE * 2);
        });
      }
    } catch (err) {
      console.error('[ActivityToast] Error fetching:', err);
    }
  }, [hasAccess, activityToToast]);

  useEffect(() => {
    if (!hasAccess) return;
    const initialTimer = setTimeout(() => fetchAndNotify(), 3000);
    const interval = setInterval(fetchAndNotify, POLL_INTERVAL_MS);
    return () => {
      clearTimeout(initialTimer);
      clearInterval(interval);
    };
  }, [hasAccess, fetchAndNotify]);

  // Close expanded view when clicking outside
  useEffect(() => {
    if (!expanded) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setExpanded(false);
      }
    };
    const timer = setTimeout(() => {
      document.addEventListener('mousedown', handleClickOutside);
    }, 100);
    return () => {
      clearTimeout(timer);
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [expanded]);

  // Auto-dismiss front toast when collapsed
  useEffect(() => {
    if (expanded || toasts.length === 0) return;
    const timer = setTimeout(() => {
      setToasts(prev => {
        if (prev.length === 0) return prev;
        const front = prev[0];
        dismissedIdsRef.current.add(`act-${front.activityId}`);
        return prev.slice(1);
      });
    }, AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [expanded, toasts]);

  const handleDismiss = useCallback((id: string) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id);
      if (toast) dismissedIdsRef.current.add(`act-${toast.activityId}`);
      const next = prev.filter(t => t.id !== id);
      if (next.length === 0) setExpanded(false);
      return next;
    });
  }, []);

  const handleDismissAll = useCallback(() => {
    toasts.forEach(t => dismissedIdsRef.current.add(`act-${t.activityId}`));
    setToasts([]);
    setExpanded(false);
  }, [toasts]);

  const handleStackClick = useCallback(() => {
    if (toasts.length > 1 && !expanded) setExpanded(true);
  }, [toasts.length, expanded]);

  if (!hasAccess) return null;
  if (toasts.length === 0) return null;

  const visibleCollapsed = toasts.slice(0, MAX_VISIBLE);
  const displayedToasts = expanded ? toasts : visibleCollapsed;

  return (
    <div
      ref={containerRef}
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9999,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <motion.div
        style={{
          position: 'relative',
          pointerEvents: 'auto',
          width: TOAST_WIDTH,
        }}
      >
        {/* ═══ Count badge (collapsed only) ═══ */}
        <AnimatePresence>
          {!expanded && toasts.length > 1 && (
            <motion.div
              key="badge"
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.15 } }}
              style={{
                position: 'absolute',
                top: -8,
                right: -8,
                zIndex: 100,
                background: 'linear-gradient(135deg, #8b5cf6, #6d28d9)',
                color: 'white',
                fontSize: 10,
                fontWeight: 800,
                width: 22,
                height: 22,
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 2px 8px rgba(139, 92, 246, 0.5)',
                border: isDark ? '2px solid rgba(28, 28, 30, 0.9)' : '2px solid rgba(255, 255, 255, 0.95)',
              }}
            >
              {toasts.length}
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Blur backdrop (expanded only) ═══ */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, transition: { duration: 0.35 } }}
              transition={{ duration: 0.3 }}
              style={{
                position: 'absolute',
                top: -160,
                bottom: -160,
                left: -40,
                right: -60,
                zIndex: -1,
                pointerEvents: 'none',
                ...(isDark
                  ? { background: 'rgba(10, 10, 14, 0.8)' }
                  : {
                      backdropFilter: 'blur(40px) saturate(250%)',
                      WebkitBackdropFilter: 'blur(40px) saturate(250%)',
                    }),
                maskImage: 'radial-gradient(closest-side, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
                WebkitMaskImage: 'radial-gradient(closest-side, rgba(0,0,0,1) 70%, rgba(0,0,0,0) 100%)',
              }}
            />
          )}
        </AnimatePresence>

        {/* ═══ Header (expanded only) ═══ */}
        <AnimatePresence>
          {expanded && (
            <motion.div
              key="header"
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10, transition: { duration: 0.35 } }}
              transition={{ type: 'spring', stiffness: 400, damping: 30 }}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                zIndex: 10,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span style={{
                fontSize: 12,
                fontWeight: 700,
                color: isDark ? 'rgba(255,255,255,0.7)' : 'rgba(0,0,0,0.6)',
                letterSpacing: '0.03em',
              }}>
                <Bell size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: 4 }} />
                {toasts.length} {toasts.length === 1 ? 'notificação' : 'notificações'}
              </span>

              <div style={{ display: 'flex', gap: 6 }}>
                <button
                  onClick={handleDismissAll}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: '#ff453a',
                    background: 'rgba(255, 69, 58, 0.12)',
                    border: '1px solid rgba(255, 69, 58, 0.2)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 69, 58, 0.22)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = 'rgba(255, 69, 58, 0.12)';
                  }}
                >
                  Limpar tudo
                </button>
                <button
                  onClick={() => setExpanded(false)}
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    color: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.5)',
                    background: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)',
                    border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                    borderRadius: 8,
                    padding: '4px 10px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: 4,
                    transition: 'all 0.15s ease',
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.14)' : 'rgba(0,0,0,0.1)';
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLButtonElement).style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                  }}
                >
                  <ChevronDown size={12} /> Recolher
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* ═══ Cards container (always mounted, layout changes) ═══ */}
        <div
          onClick={!expanded ? handleStackClick : undefined}
          style={{
            position: 'relative',
            cursor: !expanded && toasts.length > 1 ? 'pointer' : 'default',
            ...(expanded
              ? {
                  paddingTop: 36,
                  maxHeight: 'calc(80vh - 100px)',
                  overflowY: 'auto' as const,
                  overflowX: 'hidden' as const,
                  scrollbarWidth: 'none' as any,
                }
              : {
                  height: 80,
                  overflow: 'visible' as const,
                }),
          }}
        >
          <AnimatePresence mode="popLayout">
            {displayedToasts.map((toast, index) => (
              <motion.div
                key={toast.id}
                layout
                initial={{ opacity: 0, y: -30, scale: 0.95 }}
                animate={{
                  opacity: expanded
                    ? 1
                    : Math.max(1 - index * STACK_OPACITY, 0.3),
                  y: expanded ? 0 : index * STACK_OFFSET_Y,
                  scale: expanded
                    ? 1
                    : Math.max(1 - index * STACK_SCALE, 0.8),
                }}
                exit={{
                  opacity: 0,
                  scale: 0.95,
                  transition: { duration: 0.15 },
                }}
                transition={{
                  type: 'spring',
                  stiffness: 400,
                  damping: 28,
                  layout: {
                    type: 'spring',
                    stiffness: 380,
                    damping: 32,
                  },
                }}
                style={{
                  transformOrigin: 'top center',
                  zIndex: displayedToasts.length - index,
                  ...(expanded
                    ? { marginBottom: 8 }
                    : {
                        position: 'absolute' as const,
                        top: 0,
                        left: 0,
                      }),
                }}
              >
                <ToastContent
                  toast={toast}
                  isDark={isDark}
                  onDismiss={handleDismiss}
                  isExpanded={expanded}
                />
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </motion.div>
    </div>
  );
};

export default ActivityToastStack;
