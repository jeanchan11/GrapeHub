import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../contexts/AuthContext';

const MOODS = [
  { id: 'otimo', label: 'Ótimo', emoji: '😁', color: '#22c55e' },
  { id: 'bem', label: 'Bem', emoji: '😊', color: '#8b5cf6' },
  { id: 'ok', label: 'Ok', emoji: '😐', color: '#f59e0b' },
  { id: 'dificil', label: 'Difícil', emoji: '😔', color: '#f97316' },
  { id: 'pesado', label: 'Pesado', emoji: '😤', color: '#ef4444' },
];

const TOAST_WIDTH = 420;

// Returns today's date string in local timezone: "YYYY-MM-DD"
function localToday(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

// localStorage keys per user+date so different users on same browser are isolated
function doneKey(email: string): string {
  return `mood_done_${email}_${localToday()}`;
}
function pendingKey(email: string): string {
  return `mood_pending_${email}_${localToday()}`;
}

export function MoodPopup() {
  const { userData } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [selectedMood, setSelectedMood] = useState<string | null>(null);
  const [collaboratorId, setCollaboratorId] = useState<number | null>(null);
  const [isDark, setIsDark] = useState(() =>
    typeof document !== 'undefined' && document.documentElement.classList.contains('dark')
  );

  // Watch dark mode
  useEffect(() => {
    const el = document.documentElement;
    const observer = new MutationObserver(() => {
      setIsDark(el.classList.contains('dark'));
    });
    observer.observe(el, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  // On mount: decide whether to show the mood popup
  useEffect(() => {
    if (!userData?.email) return;
    const email = userData.email;

    // If already answered today → never show (fast path)
    if (localStorage.getItem(doneKey(email))) return;

    const check = async () => {
      try {
        // Resolve collaborator ID from email
        const collabRes = await fetch(`/api/collaborators/by-email/${encodeURIComponent(email)}`);
        if (!collabRes.ok) return; // can't identify user, skip to avoid spam
        const collabData = await collabRes.json();
        if (!collabData?.id) return;
        setCollaboratorId(collabData.id);


        // If already pending (loaded before without answering) → show again immediately
        if (localStorage.getItem(pendingKey(email))) {
          setTimeout(() => setIsOpen(true), 800);
          return;
        }

        // First load today: check database for existing answer
        const histRes = await fetch(`/api/colaboradores/${collabData.id}/pulso-diario/historico?dias=1`);
        if (!histRes.ok) {
          // API failed → assume not answered, mark pending, show
          localStorage.setItem(pendingKey(email), '1');
          setTimeout(() => setIsOpen(true), 1500);
          return;
        }

        const history = await histRes.json();
        const today = localToday();
        const answeredToday = history.some((p: any) => {
          const cleanDate = p.data.includes('T') ? p.data : p.data + 'T12:00:00';
          const pulseDate = new Date(cleanDate);
          const pulseStr = `${pulseDate.getFullYear()}-${String(pulseDate.getMonth() + 1).padStart(2, '0')}-${String(pulseDate.getDate()).padStart(2, '0')}`;
          return pulseStr === today;
        });

        if (answeredToday) {
          // Already answered in DB → mark done locally so future loads skip the API call
          localStorage.setItem(doneKey(email), '1');
        } else {
          // Not answered → mark pending and show popup
          localStorage.setItem(pendingKey(email), '1');
          setTimeout(() => setIsOpen(true), 1500);
        }
      } catch (e) {
        console.error('MoodPopup check error:', e);
      }
    };

    check();
  }, [userData?.email]);

  const handleSelect = async (moodId: string) => {
    setSelectedMood(moodId);
    const email = userData?.email;

    if (collaboratorId) {
      try {
        await fetch(`/api/colaboradores/${collaboratorId}/pulso-diario`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ humor: moodId }),
        });
      } catch (e) {
        console.error('Failed to save pulse:', e);
      }
    }

    // Mark answered: set done, clear pending
    if (email) {
      localStorage.setItem(doneKey(email), '1');
      localStorage.removeItem(pendingKey(email));
    }

    setTimeout(() => setIsOpen(false), 600);
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Fullscreen blur backdrop — blocks interaction with the page */}
          <motion.div
            key="mood-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, transition: { duration: 0.3, delay: 0.1 } }}
            transition={{ duration: 0.4 }}
            style={{
              position: 'fixed',
              inset: 0,
              zIndex: 9997,
              backdropFilter: 'blur(8px) saturate(120%)',
              WebkitBackdropFilter: 'blur(8px) saturate(120%)',
              background: isDark ? 'rgba(0, 0, 0, 0.4)' : 'rgba(0, 0, 0, 0.2)',
            }}
          />

          {/* Toast container — bottom center, animates from below */}
          <div
            style={{
              position: 'fixed',
              bottom: 32,
              left: '50%',
              transform: 'translateX(-50%)',
              zIndex: 9998,
              display: 'flex',
              justifyContent: 'center',
            }}
          >
            <motion.div
              key="mood-toast"
              initial={{ opacity: 0, y: 80, scale: 0.92 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 60, scale: 0.92, transition: { duration: 0.25 } }}
              transition={{ type: 'spring', stiffness: 300, damping: 26, delay: 0.15 }}
              style={{
                width: TOAST_WIDTH,
                transformOrigin: 'bottom center',
              }}
            >
              <div
                style={{
                  background: isDark ? 'rgba(28, 28, 30, 0.88)' : 'rgba(255, 255, 255, 0.95)',
                  backdropFilter: 'blur(24px) saturate(180%)',
                  WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                  borderRadius: 20,
                  border: isDark ? '1px solid rgba(255, 255, 255, 0.12)' : '1px solid rgba(0, 0, 0, 0.08)',
                  boxShadow: isDark
                    ? '0 -4px 40px rgba(0,0,0,0.45), 0 -2px 12px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.08)'
                    : '0 -4px 40px rgba(0,0,0,0.15), 0 -2px 12px rgba(0,0,0,0.08), inset 0 1px 0 rgba(255,255,255,0.9)',
                  padding: '20px 22px',
                  display: 'flex',
                  flexDirection: 'column' as const,
                  gap: 16,
                }}
              >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: 12,
                      background: isDark
                        ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.15))'
                        : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.08))',
                      border: '1px solid rgba(139,92,246,0.4)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                      fontSize: 22,
                    }}
                  >
                    💜
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{
                        fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                        color: isDark ? '#a78bfa' : '#7c3aed',
                        background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.12)',
                        borderRadius: 4, padding: '2px 6px',
                      }}>
                        GrapeHub
                      </span>
                    </div>
                    <p style={{
                      fontSize: 14, fontWeight: 600, margin: 0, lineHeight: 1.3,
                      color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.88)',
                    }}>
                      🍇 Como você está se sentindo hoje? 🍇
                    </p>
                  </div>
                </div>

                {/* Mood Buttons — staggered entrance */}
                <div style={{ display: 'flex', justifyContent: 'space-between', gap: 8 }}>
                  {MOODS.map((mood, i) => {
                    const isSelected = selectedMood === mood.id;
                    return (
                      <motion.button
                        key={mood.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.25 + i * 0.06, type: 'spring', stiffness: 400, damping: 22 }}
                        onClick={() => handleSelect(mood.id)}
                        style={{
                          flex: 1,
                          display: 'flex',
                          flexDirection: 'column',
                          alignItems: 'center',
                          gap: 6,
                          padding: '12px 4px',
                          borderRadius: 14,
                          border: isSelected
                            ? `2px solid ${mood.color}`
                            : isDark
                              ? '1px solid rgba(255,255,255,0.08)'
                              : '1px solid rgba(0,0,0,0.06)',
                          background: isSelected
                            ? `${mood.color}22`
                            : isDark
                              ? 'rgba(255,255,255,0.04)'
                              : 'rgba(0,0,0,0.02)',
                          cursor: 'pointer',
                          transition: 'all 0.2s ease',
                          transform: isSelected ? 'scale(1.05)' : 'scale(1)',
                        }}
                        onMouseEnter={(e) => {
                          if (!isSelected) {
                            const el = e.currentTarget;
                            el.style.background = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.05)';
                            el.style.transform = 'scale(1.08)';
                            el.style.borderColor = `${mood.color}60`;
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (!isSelected) {
                            const el = e.currentTarget;
                            el.style.background = isDark ? 'rgba(255,255,255,0.04)' : 'rgba(0,0,0,0.02)';
                            el.style.transform = 'scale(1)';
                            el.style.borderColor = isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.06)';
                          }
                        }}
                      >
                        <span style={{ fontSize: 28, lineHeight: 1 }}>{mood.emoji}</span>
                        <span style={{
                          fontSize: 11,
                          fontWeight: 600,
                          color: isSelected
                            ? mood.color
                            : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                        }}>
                          {mood.label}
                        </span>
                      </motion.button>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          </div>
        </>
      )}
    </AnimatePresence>
  );
}
