// Tela de login do GrapeHub (refeita em 18/11/2026): o sistema é só do time interno e o
// acesso é só pelo Google. O login de cliente por e-mail/senha saiu daqui (o portal do
// cliente deixou de ser usado). Mesmo idioma visual da página inicial: fundo escuro,
// brilhos violeta e painel de vidro. Original em backup-menu-antes-materna/redesign-crm/.
import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { AlertTriangle, ArrowLeft, Loader2, Lock } from 'lucide-react';
import { motion } from 'motion/react';
import { marcarLogin } from './BoasVindas';

const V = '#7C3AED';
const FUNDO = '#0A0118';

const Login: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [erro, setErro] = useState<string | null>(null);
  const [diagnostico, setDiagnostico] = useState(false);
  const [entrando, setEntrando] = useState(false);

  const firebaseConfig = {
    apiKey: (window as any).FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: (window as any).FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: (window as any).FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  };
  const origem = window.location.origin;

  const entrarComGoogle = async () => {
    setErro(null);
    setEntrando(true);
    try {
      if (!firebaseConfig.authDomain || firebaseConfig.authDomain.includes('run.app')) {
        throw new Error('O authDomain parece estar incorreto. Ele deve ser algo como "projeto.firebaseapp.com" e não a URL do app.');
      }
      await signInWithPopup(auth, googleProvider);
      marcarLogin(); // o App mostra a recepção (BoasVindas) ao abrir
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setErro(`Domínio não autorizado. Adicione "${origem}" aos domínios autorizados no Console do Firebase.`);
        setDiagnostico(true);
      } else if (err.code === 'auth/popup-closed-by-user' || err.code === 'auth/cancelled-popup-request') {
        setErro('A janela do Google foi fechada antes de terminar. Tente de novo.');
      } else if (err.code === 'auth/popup-blocked') {
        setErro('O navegador bloqueou a janela do Google. Libere pop-ups para este site e tente de novo.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setErro('O login com Google não está ativado no Console do Firebase.');
        setDiagnostico(true);
      } else {
        setErro(`Não foi possível entrar: ${err.message || 'falha desconhecida'}`);
        setDiagnostico(true);
      }
    } finally {
      setEntrando(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-5 text-white antialiased relative overflow-hidden" style={{ background: FUNDO, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Brilhos do fundo */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        <div className="absolute rounded-full" style={{ width: 760, height: 760, left: -260, top: -280, background: 'radial-gradient(circle, rgba(124,58,237,.45), transparent 70%)' }} />
        <div className="absolute rounded-full" style={{ width: 760, height: 760, right: -300, bottom: -320, background: 'radial-gradient(circle, rgba(109,40,217,.32), transparent 70%)' }} />
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-[14px] font-semibold text-slate-300 hover:text-white transition-colors"
          style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.03)' }}
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 18, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        className="relative z-10 w-full max-w-[420px] rounded-[24px] px-8 py-10 sm:px-10 sm:py-12"
        style={{
          background: 'rgba(48,32,78,.42)',
          border: '1px solid rgba(192,165,222,.16)',
          boxShadow: '0 1px 0 rgba(255,255,255,.06) inset, 0 40px 90px -40px rgba(0,0,0,.85)',
        }}
      >
        {/* Marca */}
        <div className="flex flex-col items-center text-center">
          <div className="w-14 h-14 rounded-[18px] flex items-center justify-center p-2.5 mb-5" style={{ background: 'linear-gradient(135deg,#a78bfa,#6d28d9)', boxShadow: '0 14px 30px -12px rgba(124,58,237,.9)' }}>
            <img src="/logobranca.png" alt="GrapeHub" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
          </div>
          <div className="flex items-baseline mb-6">
            <span className="font-semibold text-[22px] tracking-tight text-white">Grape</span>
            <span className="font-light text-[22px]" style={{ color: '#c4b5fd' }}>Hub</span>
          </div>
          <h1 className="text-[26px] font-black tracking-tight leading-tight">Entre com a sua conta da Grape</h1>
          <p className="mt-2 text-[14.5px] text-slate-400 leading-relaxed">Use o seu e-mail @grapemidia.com no Google.</p>
        </div>

        {erro && (
          <motion.div
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-7 p-3.5 rounded-2xl text-[13px] flex flex-col gap-2"
            style={{ background: 'rgba(244,63,94,.1)', border: '1px solid rgba(244,63,94,.25)', color: '#fda4af' }}
          >
            <div className="flex items-start gap-2.5">
              <AlertTriangle className="shrink-0 mt-0.5" size={16} />
              <p className="font-medium leading-relaxed">{erro}</p>
            </div>
            {diagnostico && (
              <div className="pt-2 text-[10.5px] font-mono opacity-80 break-all" style={{ borderTop: '1px solid rgba(244,63,94,.2)' }}>
                <p>Origem: {origem}</p>
                <p>AuthDomain: {firebaseConfig.authDomain || 'N/A'}</p>
              </div>
            )}
          </motion.div>
        )}

        <button
          type="button"
          onClick={entrarComGoogle}
          disabled={entrando}
          className="mt-8 w-full h-[52px] rounded-2xl flex items-center justify-center gap-3 text-[15px] font-semibold transition-all hover:-translate-y-px disabled:opacity-70 disabled:hover:translate-y-0"
          style={{ background: '#fff', color: '#1f1f1f', boxShadow: '0 14px 30px -16px rgba(124,58,237,.9)' }}
        >
          {entrando ? (
            <><Loader2 size={18} className="animate-spin" style={{ color: V }} /> Abrindo o Google…</>
          ) : (
            <>
              <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="" className="w-5 h-5" />
              Entrar com Google
            </>
          )}
        </button>

        <div className="mt-8 flex items-start gap-2.5 text-[12.5px] text-slate-400 leading-relaxed">
          <Lock size={14} className="shrink-0 mt-0.5 text-slate-500" />
          <p>Acesso restrito ao time da Grape Mídia. As páginas que você vê dependem da sua função; se faltar alguma, fale com o administrador.</p>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
