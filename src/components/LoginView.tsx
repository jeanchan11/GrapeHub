
// Login component for GrapeHub (Renamed to LoginView)
// Redesenhado para casar com a landing page (tema escuro)
import React, { useState } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { LogIn, AlertTriangle, ChevronRight, Zap, ArrowLeft, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import Typewriter from './Typewriter';
import { useClientSession } from '../portal/ClientSessionContext';

// Paleta da landing (auto-contida, independente do tema do app)
const V = '#7C3AED';       // violeta primário
const V_LIGHT = '#A855F7'; // accent
const DARK = '#0A0118';    // fundo escuro

// Palavras que giram no efeito de digitação
const TYPE_WORDS = ['relatórios.', 'métricas.', 'reuniões.', 'entregas.'];

const Login: React.FC<{ onBack?: () => void }> = ({ onBack }) => {
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loadingEmail, setLoadingEmail] = useState(false);
  const { login: clientLogin } = useClientSession();

  // Login do cliente: valida no Neon (não no Firebase). Sucesso → o App renderiza o portal.
  const handleEmailLogin = async (e?: React.FormEvent) => {
    e?.preventDefault();
    setError(null);
    if (!email || !password) { setError('Preencha e-mail e senha.'); return; }
    setLoadingEmail(true);
    const { ok, error: err } = await clientLogin(email.trim(), password);
    if (!ok) setError(err || 'E-mail ou senha incorretos.');
    setLoadingEmail(false);
  };

  const firebaseConfig = {
    apiKey: (window as any).FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: (window as any).FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: (window as any).FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  };

  const currentOrigin = window.location.origin;

  const handleLogin = async () => {
    setError(null);
    try {
      if (!firebaseConfig.authDomain || firebaseConfig.authDomain.includes('run.app')) {
        throw new Error('O authDomain parece estar incorreto. Ele deve ser algo como "projeto.firebaseapp.com" e não a URL do app.');
      }
      await signInWithPopup(auth, googleProvider);
    } catch (err: any) {
      console.error('Login error:', err);
      if (err.code === 'auth/unauthorized-domain') {
        setError(`Domínio não autorizado. Adicione "${currentOrigin}" aos domínios autorizados no Console do Firebase.`);
      } else if (err.code === 'auth/popup-closed-by-user') {
        setError('O popup foi fechado. Certifique-se de completar o login na janela que abrir.');
      } else if (err.code === 'auth/operation-not-allowed') {
        setError('O provedor Google não está ativado no Console do Firebase.');
      } else {
        setError(`Erro: ${err.message || 'Falha desconhecida'}`);
      }
      setShowDiagnostics(true);
    }
  };

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4 md:p-10 text-white antialiased relative overflow-hidden"
      style={{ background: DARK }}
    >
      {/* ── glows de fundo (igual ao hero da landing) ── */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden">
        <div
          className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-30"
          style={{ background: `radial-gradient(circle, ${V} 0%, transparent 60%)`, filter: 'blur(20px)' }}
        />
        <div
          className="absolute -bottom-40 -right-40 w-[500px] h-[500px] rounded-full opacity-20"
          style={{ background: `radial-gradient(circle, ${V_LIGHT} 0%, transparent 60%)`, filter: 'blur(30px)' }}
        />
      </div>

      {onBack && (
        <button
          onClick={onBack}
          className="absolute top-6 left-6 z-20 inline-flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold text-white/80 border border-white/15 hover:bg-white/5 transition-all"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
      )}

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative z-10 max-w-6xl w-full grid lg:grid-cols-2 rounded-[2rem] overflow-hidden border border-white/10 min-h-[720px]"
        style={{ background: 'rgba(20,8,46,0.55)', backdropFilter: 'blur(14px)', boxShadow: '0 40px 90px -25px rgba(0,0,0,0.6)' }}
      >
        {/* ── Coluna esquerda — marca / hero ── */}
        <div className="relative p-10 md:p-14 flex flex-col overflow-hidden">
          {/* glow interno */}
          <div
            className="pointer-events-none absolute -top-24 -left-24 w-80 h-80 rounded-full opacity-30"
            style={{ background: `radial-gradient(circle, ${V} 0%, transparent 60%)`, filter: 'blur(40px)' }}
          />

          <div className="relative z-10 flex flex-col h-full">
            {/* logo */}
            <div className="flex items-center gap-3 mb-12">
              <div
                className="w-11 h-11 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: V, boxShadow: `0 8px 24px -8px ${V}` }}
              >
                <img src="/logobranca.png" alt="GrapeHub" className="w-6 h-6 object-contain" referrerPolicy="no-referrer" />
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-2xl tracking-tight text-white">Grape</span>
                <span className="font-light text-2xl text-white/60">Hub</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              {/* pill kicker */}
              <motion.span
                initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.1 }}
                className="inline-flex items-center gap-2 text-[11px] font-mono tracking-wide px-3 py-1.5 rounded-full border mb-6 self-start"
                style={{ borderColor: 'rgba(168,85,247,0.3)', color: V_LIGHT, background: 'rgba(124,58,237,0.08)' }}
              >
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: V_LIGHT }} />
                Portal do cliente · marketing jurídico
              </motion.span>

              <motion.h1
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.16 }}
                className="text-4xl md:text-5xl font-black tracking-tight leading-[1.05] mb-5"
              >
                Bem-vindo ao hub da{' '}
                <span style={{ background: `linear-gradient(90deg, ${V}, ${V_LIGHT})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                  Grape Mídia.
                </span>
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.22 }}
                className="text-white/60 text-lg leading-relaxed max-w-md"
              >
                Aqui você pode consultar <Typewriter words={TYPE_WORDS} color={V_LIGHT} />
              </motion.p>
            </div>

          </div>
        </div>

        {/* ── Coluna direita — formulário ── */}
        <div
          className="relative p-10 md:p-14 flex flex-col justify-center border-t lg:border-t-0 lg:border-l border-white/10"
          style={{ background: 'rgba(255,255,255,0.02)' }}
        >
          <div className="max-w-md w-full mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}
            >
              <h2 className="text-3xl md:text-4xl font-black tracking-tight text-white mb-2">Bem-vindo de volta</h2>
              <p className="text-white/50 text-base mb-10">Entre para acessar seus projetos e métricas.</p>
            </motion.div>

            {error && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-300 text-sm flex flex-col gap-2"
              >
                <div className="flex items-start gap-3">
                  <AlertTriangle className="shrink-0 mt-0.5" size={18} />
                  <p className="font-medium">{error}</p>
                </div>
                {showDiagnostics && (
                  <div className="mt-2 pt-2 border-t border-rose-500/20 text-[10px] font-mono opacity-80 break-all">
                    <p>Origin: {currentOrigin}</p>
                    <p>AuthDomain: {firebaseConfig.authDomain || 'N/A'}</p>
                  </div>
                )}
              </motion.div>
            )}

            <form className="space-y-5" onSubmit={handleEmailLogin}>
              <div className="space-y-3">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30">
                    <LogIn size={18} />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    autoComplete="email"
                    placeholder="seu@email.com"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-white/30">
                    <Zap size={18} />
                  </div>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    autoComplete="current-password"
                    placeholder="••••••••"
                    className="w-full bg-white/[0.03] border border-white/10 rounded-xl py-3.5 pl-12 pr-4 text-sm text-white placeholder-white/30 outline-none focus:border-violet-500/50 transition-colors"
                  />
                </div>
              </div>

              {/* Entrar (clientes — e-mail/senha) */}
              <button
                type="submit"
                disabled={loadingEmail}
                className="w-full rounded-xl py-3.5 flex items-center justify-center gap-2.5 font-bold text-white transition-all group disabled:opacity-60"
                style={{ background: V, boxShadow: `0 12px 32px -8px ${V}` }}
                onMouseEnter={e => !loadingEmail && (e.currentTarget.style.background = '#6D28D9')}
                onMouseLeave={e => (e.currentTarget.style.background = V)}
              >
                {loadingEmail ? <Loader2 size={18} className="animate-spin" /> : <span>Entrar</span>}
                {!loadingEmail && <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />}
              </button>

              {/* divisor */}
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-white/10" />
                <span className="text-[11px] uppercase tracking-widest text-white/30">ou</span>
                <div className="flex-1 h-px bg-white/10" />
              </div>

              {/* Entrar com Google (colaboradores) */}
              <button
                type="button"
                onClick={handleLogin}
                className="w-full rounded-xl py-3.5 flex items-center justify-center gap-3 font-bold text-white/90 border border-white/15 hover:bg-white/[0.04] transition-all"
              >
                <span className="w-6 h-6 rounded-full bg-white flex items-center justify-center shrink-0">
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-4 h-4" />
                </span>
                <span>Entrar com Google</span>
              </button>
            </form>

            <p className="mt-8 text-[10px] text-center text-white/30 leading-relaxed">
              Clientes acessam com e-mail e senha · Equipe Grape entra com Google.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
