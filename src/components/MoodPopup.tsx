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

const TOAST_WIDTH = 400;

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

  // Resolve collaborator ID and check if already answered today
  useEffect(() => {
    if (!userData?.email) return;

    const checkPulse = async () => {
      try {
        // Get collaborator ID from email
        const collabRes = await fetch(`/api/collaborators/by-email/${encodeURIComponent(userData.email)}`);
        if (!collabRes.ok) return;
        const collabData = await collabRes.json();
        if (!collabData?.id) return;
        setCollaboratorId(collabData.id);

        // Check if already answered today
        const histRes = await fetch(`/api/colaboradores/${collabData.id}/pulso-diario/historico?dias=1`);
        if (!histRes.ok) { setIsOpen(true); return; }
        const history = await histRes.json();
        
        // Timezone-safe local date string comparison
        const localToday = new Date();
        const todayStr = `${localToday.getFullYear()}-${String(localToday.getMonth() + 1).padStart(2, '0')}-${String(localToday.getDate()).padStart(2, '0')}`;
        
        const answeredToday = history.some((p: any) => {
          const cleanDate = p.data.includes('T') ? p.data : p.data + 'T12:00:00';
          const pulseDate = new Date(cleanDate);
          const pulseStr = `${pulseDate.getFullYear()}-${String(pulseDate.getMonth() + 1).padStart(2, '0')}-${String(pulseDate.getDate()).padStart(2, '0')}`;
          return pulseStr === todayStr;
        });

        if (!answeredToday) {
          setTimeout(() => setIsOpen(true), 1500);
        }
      } catch (e) {
        console.error('MoodPopup check error:', e);
      }
    };

    checkPulse();
  }, [userData?.email]);

  const handleSelect = async (moodId: string) => {
    setSelectedMood(moodId);
    
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
    
    setTimeout(() => setIsOpen(false), 600);
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 24,
        right: 24,
        zIndex: 9998,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'flex-end',
        pointerEvents: 'none',
      }}
    >
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="mood-toast"
            initial={{ opacity: 0, y: -30, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -30, scale: 0.95, transition: { duration: 0.25 } }}
            transition={{ type: 'spring', stiffness: 400, damping: 28 }}
            style={{
              pointerEvents: 'auto',
              width: TOAST_WIDTH,
              transformOrigin: 'top center',
            }}
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
                padding: '16px 18px',
                display: 'flex',
                flexDirection: 'column' as const,
                gap: 14,
              }}
            >
              {/* Header */}
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div
                  style={{
                    width: 38,
                    height: 38,
                    borderRadius: 10,
                    background: isDark
                      ? 'linear-gradient(135deg, rgba(139,92,246,0.3), rgba(139,92,246,0.15))'
                      : 'linear-gradient(135deg, rgba(139,92,246,0.2), rgba(139,92,246,0.08))',
                    border: '1px solid rgba(139,92,246,0.4)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                    fontSize: 20,
                  }}
                >
                  💜
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
                      color: isDark ? '#a78bfa' : '#7c3aed',
                      background: isDark ? 'rgba(139, 92, 246, 0.15)' : 'rgba(139, 92, 246, 0.12)',
                      borderRadius: 4, padding: '1px 5px',
                    }}>
                      GrapeHub
                    </span>
                  </div>
                  <p style={{
                    fontSize: 13, fontWeight: 600, margin: 0, lineHeight: 1.3,
                    color: isDark ? 'rgba(255,255,255,0.95)' : 'rgba(0,0,0,0.88)',
                  }}>
                    🍇 Como você está se sentindo hoje? 🍇
                  </p>
                </div>
              </div>

              {/* Mood Buttons */}
              <div style={{ display: 'flex', justifyContent: 'space-between', gap: 6 }}>
                {MOODS.map(mood => {
                  const isSelected = selectedMood === mood.id;
                  return (
                    <button
                      key={mood.id}
                      onClick={() => handleSelect(mood.id)}
                      style={{
                        flex: 1,
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: 5,
                        padding: '10px 4px',
                        borderRadius: 12,
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
                          el.style.transform = 'scale(1.05)';
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
                      <span style={{ fontSize: 24, lineHeight: 1 }}>{mood.emoji}</span>
                      <span style={{
                        fontSize: 10,
                        fontWeight: 600,
                        color: isSelected
                          ? mood.color
                          : isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.45)',
                      }}>
                        {mood.label}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
