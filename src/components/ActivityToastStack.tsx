import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';
import {
  Phone, Mail, Users, MessageSquare, Video, FileText,
  Instagram, Linkedin, Zap, X, Clock, Bell
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
const POLL_INTERVAL_MS = 60 * 1000; // 1 minute
const UPCOMING_MINUTES = 15;

// ─── iOS Notification Sound (Web Audio API) ───────────────────────────────────
let audioCtx: AudioContext | null = null;
let audioWarmedUp = false;

// Warm up AudioContext on first user interaction (required by browsers)
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

// Listen for first user interaction to enable audio
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

    if (ctx.state === 'suspended') {
      ctx.resume();
    }

    const now = ctx.currentTime;

    // ── Tri-tone chime (iOS style: 3 ascending notes) ──
    const notes = [880, 1108.73, 1318.51]; // A5, C#6, E6

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
function parseLocalDate(dateString: string): Date {
  if (!dateString) return new Date();
  const dateOnly = dateString.split('T')[0];
  return new Date(dateOnly + 'T12:00:00');
}

function isToday(dateStr: string): boolean {
  const d = parseLocalDate(dateStr);
  const now = new Date();
  return d.getFullYear() === now.getFullYear() &&
         d.getMonth() === now.getMonth() &&
         d.getDate() === now.getDate();
}

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

// ─── Individual Toast ─────────────────────────────────────────────────────────
const ToastCard: React.FC<{
  toast: ToastItem;
  index: number;
  total: number;
  onDismiss: (id: string) => void;
}> = ({ toast, index, total, onDismiss }) => {
  const cfg = getTypeConfig(toast.type);
  const Icon = cfg.icon;
  const isDark = document.documentElement.classList.contains('dark');

  useEffect(() => {
    const timer = setTimeout(() => onDismiss(toast.id), AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [toast.id, onDismiss]);

  return (
    <motion.li
      layout
      initial={{ opacity: 0, y: 60, scale: 0.85 }}
      animate={{
        opacity: Math.max(1 - index * STACK_OPACITY, 0.3),
        y: -(index * STACK_OFFSET_Y),
        scale: Math.max(1 - index * STACK_SCALE, 0.8),
        zIndex: total - index,
      }}
      exit={{
        opacity: 0,
        x: 120,
        scale: 0.85,
        transition: { duration: 0.25, ease: 'easeOut' },
      }}
      transition={{
        type: 'spring',
        stiffness: 420,
        damping: 30,
        mass: 1,
      }}
      style={{
        position: 'absolute',
        bottom: 0,
        left: '50%',
        transform: 'translateX(-50%)',
        width: '100%',
        transformOrigin: 'bottom center',
        listStyle: 'none',
      }}
      className="pointer-events-auto"
    >
      <div
        style={{
          background: isDark ? 'rgba(28, 28, 30, 0.82)' : 'rgba(255, 255, 255, 0.92)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
          borderRadius: 18,
          border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
          boxShadow: isDark
            ? '0 8px 32px rgba(0,0,0,0.35), 0 2px 8px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.06)'
            : '0 8px 32px rgba(0,0,0,0.12), 0 2px 8px rgba(0,0,0,0.06), inset 0 1px 0 rgba(255,255,255,0.9)',
          padding: '14px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          cursor: 'default',
          overflow: 'hidden',
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
    </motion.li>
  );
};

// ─── Main Toast Stack ─────────────────────────────────────────────────────────
const ActivityToastStack: React.FC = () => {
  const { userData } = useAuth();
  const [toasts, setToasts] = useState<ToastItem[]>([]);
  const dismissedIdsRef = useRef<Set<string>>(new Set());

  const allowedRoles = ['superadmin', 'gerente-comercial'];
  const hasAccess = userData?.role && allowedRoles.includes(userData.role);

  const activityToToast = useCallback((a: Activity): ToastItem => {
    const timeLabel = formatTimeLabel(a.start_time);
    const actIsOverdue = isOverdue(a.due_date || '', a.start_time);

    const leadPart = a.lead_name || '';
    const titlePart = a.title || '';
    const title = titlePart || 'Atividade';
    const subtitle = [
      timeLabel ? `🕐 ${timeLabel}` : '',
      a.type || '',
      leadPart ? `👤 ${leadPart}` : '',
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
          if (unique.length > 0) {
            playNotificationSound();
          }
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

  const handleDismiss = useCallback((id: string) => {
    setToasts(prev => {
      const toast = prev.find(t => t.id === id);
      if (toast) {
        dismissedIdsRef.current.add(`act-${toast.activityId}`);
      }
      return prev.filter(t => t.id !== id);
    });
  }, []);

  if (!hasAccess) return null;

  const visibleToasts = toasts.slice(0, MAX_VISIBLE);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 32,
        left: '50%',
        transform: 'translateX(-50%)',
        zIndex: 9999,
        width: 400,
        pointerEvents: 'none',
      }}
    >
      {toasts.length > MAX_VISIBLE && (
        <div
          style={{
            position: 'absolute',
            bottom: -8,
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 10000,
            background: 'rgba(139, 92, 246, 0.9)',
            backdropFilter: 'blur(8px)',
            color: 'white',
            fontSize: 10,
            fontWeight: 700,
            borderRadius: 10,
            padding: '2px 8px',
            pointerEvents: 'auto',
          }}
        >
          +{toasts.length - MAX_VISIBLE} mais
        </div>
      )}

      <ol
        style={{
          position: 'relative',
          listStyle: 'none',
          padding: 0,
          margin: 0,
          minHeight: visibleToasts.length > 0 ? 80 : 0,
        }}
      >
        <AnimatePresence mode="popLayout">
          {visibleToasts.map((toast, index) => (
            <ToastCard
              key={toast.id}
              toast={toast}
              index={index}
              total={visibleToasts.length}
              onDismiss={handleDismiss}
            />
          ))}
        </AnimatePresence>
      </ol>
    </div>
  );
};

export default ActivityToastStack;
