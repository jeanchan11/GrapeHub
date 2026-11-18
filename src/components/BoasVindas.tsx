import React, { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';

/**
 * Recepção logo depois do login (18/11/2026): tela cheia com a uva, "Boa tarde, Jean" e uma
 * barra de progresso; some sozinha em ~2 s revelando o app. Só aparece quando o login acabou
 * de acontecer nesta aba (marca `gh-acabou-de-entrar` no sessionStorage, gravada pelo
 * LoginView) — recarregar a página com a sessão já aberta não mostra de novo.
 */
export const MARCA_LOGIN = 'gh-acabou-de-entrar';
/** Preferência (localStorage) para desligar a recepção — Configurações › Aparência. */
export const PREF_SEM_BOAS_VINDAS = 'gh-sem-boas-vindas';

export function marcarLogin() {
  try { sessionStorage.setItem(MARCA_LOGIN, '1'); } catch { /* sem storage: sem recepção */ }
}

function consumirMarca(): boolean {
  try {
    if (sessionStorage.getItem(MARCA_LOGIN) !== '1') return false;
    sessionStorage.removeItem(MARCA_LOGIN);
    return localStorage.getItem(PREF_SEM_BOAS_VINDAS) !== '1';
  } catch { return false; }
}

const saudacao = () => {
  const h = new Date().getHours();
  return h < 12 ? 'Bom dia' : h < 18 ? 'Boa tarde' : 'Boa noite';
};

export default function BoasVindas({ nome }: { nome?: string | null }) {
  const [visivel, setVisivel] = useState(() => consumirMarca());

  useEffect(() => {
    if (!visivel) return;
    const t = setTimeout(() => setVisivel(false), 2100);
    return () => clearTimeout(t);
  }, [visivel]);

  const primeiro = (nome || '').trim().split(/\s+/)[0];

  return (
    <AnimatePresence>
      {visivel && (
        <motion.div
          key="boas-vindas"
          className="fixed inset-0 z-[200000] flex items-center justify-center overflow-hidden"
          style={{ background: '#0A0118' }}
          initial={{ opacity: 1 }}
          exit={{ opacity: 0, scale: 1.04 }}
          transition={{ duration: 0.55, ease: [0.4, 0, 0.2, 1] }}
          onClick={() => setVisivel(false)}
        >
          {/* brilhos */}
          <motion.div
            aria-hidden
            className="absolute rounded-full"
            style={{ width: 900, height: 900, background: 'radial-gradient(circle, rgba(124,58,237,.5), transparent 70%)' }}
            initial={{ scale: 0.6, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1] }}
          />

          <div className="relative flex flex-col items-center text-center px-6">
            <motion.div
              className="w-20 h-20 rounded-[24px] flex items-center justify-center p-3.5"
              style={{ background: 'linear-gradient(135deg,#a78bfa,#6d28d9)', boxShadow: '0 24px 60px -18px rgba(124,58,237,.95)' }}
              initial={{ scale: 0.4, opacity: 0, rotate: -12 }}
              animate={{ scale: 1, opacity: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 260, damping: 18, delay: 0.05 }}
            >
              <img src="/logobranca.png" alt="" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
            </motion.div>

            <motion.h1
              className="mt-8 text-[34px] sm:text-[44px] font-black tracking-tight text-white"
              initial={{ opacity: 0, y: 14, filter: 'blur(8px)' }}
              animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
              transition={{ duration: 0.6, delay: 0.35, ease: [0.22, 1, 0.36, 1] }}
            >
              {saudacao()}{primeiro ? ', ' : ''}
              {primeiro && (
                <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#8b5cf6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>{primeiro}</span>
              )}
            </motion.h1>

            <motion.p
              className="mt-2 text-[15px] text-slate-400"
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.6 }}
            >
              Preparando o seu GrapeHub…
            </motion.p>

            <div className="mt-8 h-1 w-48 rounded-full overflow-hidden" style={{ background: 'rgba(255,255,255,.08)' }}>
              <motion.div
                className="h-full rounded-full"
                style={{ background: 'linear-gradient(90deg,#8b5cf6,#c4b5fd)' }}
                initial={{ width: '0%' }}
                animate={{ width: '100%' }}
                transition={{ duration: 1.6, delay: 0.3, ease: [0.4, 0, 0.2, 1] }}
              />
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
