
// Login component for GrapeHub (Renamed to LoginView)
// Last updated: 2026-04-02 21:04 UTC
import React, { useState, useEffect } from 'react';
import { auth, googleProvider } from '../firebase';
import { signInWithPopup } from 'firebase/auth';
import { LogIn, AlertTriangle, Play, ChevronRight, BarChart3, Target, Zap, Sun, Moon } from 'lucide-react';
import { motion } from 'motion/react';

const ROLE_ORDER: Record<string, number> = {
  'superadmin': 0,
  'diretor-operacional': 1,
  'gerente-operacional': 2,
  'gerente-comercial': 3,
  'gestor-trafego': 4,
  'analista-ia': 5,
  'design': 6,
  'user': 7,
};

const Login: React.FC = () => {
  const [error, setError] = useState<string | null>(null);
  const [showDiagnostics, setShowDiagnostics] = useState(false);
  const [teamMembers, setTeamMembers] = useState<{ id: string; name: string; picture?: string; role: string }[]>([]);
  const [theme, setTheme] = useState<'light' | 'dark' | 'darker'>(() => {
    if (typeof window !== 'undefined') {
      const savedTheme = localStorage.getItem('theme');
      return (savedTheme as 'light' | 'dark' | 'darker') || 'light';
    }
    return 'light';
  });

  useEffect(() => {
    const root = window.document.documentElement;
    root.classList.remove('light', 'dark', 'darker');
    if (theme === 'darker') {
      root.classList.add('dark', 'darker');
    } else {
      root.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  useEffect(() => {
    fetch('/api/system-users')
      .then(r => r.ok ? r.json() : [])
      .then((users: { id: string; name: string; picture?: string; role: string }[]) => {
        const sorted = [...users]
          .filter(u => u.picture)
          .sort((a, b) => (ROLE_ORDER[a.role] ?? 99) - (ROLE_ORDER[b.role] ?? 99));
        setTeamMembers(sorted.slice(0, 5));
      })
      .catch(() => {});
  }, []);

  const toggleTheme = () => {
    setTheme(prev => prev === 'light' ? 'dark' : prev === 'dark' ? 'darker' : 'light');
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
    <div className="min-h-screen flex items-center justify-center p-4 md:p-10 bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <button 
        onClick={toggleTheme}
        className="absolute top-6 right-6 p-3 rounded-full bg-slate-200 dark:bg-white/10 text-slate-600 dark:text-slate-300 hover:bg-slate-300 dark:hover:bg-white/20 transition-colors"
      >
        {theme === 'light' ? <Moon size={20} /> : theme === 'dark' ? <Zap size={20} /> : <Sun size={20} />}
      </button>
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-6xl w-full flex flex-col md:flex-row bg-light-card dark:bg-dark-card rounded-[3rem] overflow-hidden border border-slate-200 dark:border-white/5 shadow-2xl min-h-[750px]"
      >
        {/* Left Side - Decorative/Info */}
        <div className="md:w-1/2 bg-slate-50 dark:bg-dark-card p-10 md:p-16 flex flex-col relative overflow-hidden">
          {/* Background Decorative Elements */}
          <div className="absolute top-0 right-0 w-80 h-80 bg-violet-600/10 rounded-full blur-3xl -mr-40 -mt-40"></div>
          <div className="absolute bottom-0 left-0 w-80 h-80 bg-emerald-500/5 rounded-full blur-3xl -ml-40 -mb-40"></div>
          
          <div className="relative z-10 flex flex-col h-full">
            <div className="flex items-center gap-4 mb-20">
              <div className="relative">
                <div className="absolute inset-0 bg-violet-500 blur-xl opacity-50 rounded-2xl"></div>
                <div className="relative w-12 h-12 bg-violet-600 rounded-2xl flex items-center justify-center shadow-lg shadow-violet-600/20">
                  <img src="/logobranca.png" alt="Logo" className="w-7 h-7 object-contain" referrerPolicy="no-referrer" />
                </div>
              </div>
              <div className="flex items-baseline">
                <span className="font-bold text-3xl text-slate-900 dark:text-white tracking-tight">Grape</span>
                <span className="font-light text-3xl text-violet-600 dark:text-violet-200/80">Hub</span>
              </div>
            </div>

            <div className="flex-1 flex flex-col justify-center">
              <motion.h1 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.2 }}
                className="text-5xl md:text-6xl font-bold text-slate-900 dark:text-white leading-tight mb-6"
              >
                Bem-vindo ao hub da <span className="text-violet-500">Grape Mídia.</span>
              </motion.h1>
              <motion.p 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.3 }}
                className="text-slate-600 dark:text-slate-400 text-xl leading-relaxed mb-8 max-w-lg"
              >
                Métricas, relatórios e entregas do seu projeto em um só lugar.
              </motion.p>
            </div>

            <div className="mt-auto pt-10 flex items-center gap-8">
              <div className="flex -space-x-3">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    title={member.name}
                    className="w-11 h-11 rounded-full border-2 border-white dark:border-dark-card bg-slate-200 dark:bg-slate-800 flex items-center justify-center overflow-hidden shadow-md"
                  >
                    {member.picture
                      ? <img src={member.picture} alt={member.name} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                      : <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{member.name?.[0]?.toUpperCase()}</span>
                    }
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-base font-medium">Junte-se a centenas de gestores.</p>
            </div>
          </div>
        </div>

        {/* Right Side - Login Form */}
        <div className="md:w-1/2 p-10 md:p-20 flex flex-col justify-center bg-light-card dark:bg-dark-card">
          <div className="max-w-md w-full mx-auto">
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <h2 className="text-4xl font-bold text-light-text dark:text-white mb-3">Bem-vindo de volta</h2>
              <p className="text-slate-500 dark:text-slate-400 text-lg mb-12">Entre para acessar seus projetos e métricas.</p>
            </motion.div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                className="mb-8 p-4 bg-rose-500/10 border border-rose-500/20 rounded-2xl text-rose-500 text-sm flex flex-col gap-2"
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

            <div className="space-y-6">
              <div className="space-y-4">
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <LogIn size={18} />
                  </div>
                  <input 
                    type="email" 
                    disabled
                    placeholder="seu@email.com" 
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none text-slate-400">
                    <Zap size={18} />
                  </div>
                  <input 
                    type="password" 
                    disabled
                    placeholder="••••••••" 
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-4 pl-12 pr-4 text-sm text-slate-500 outline-none cursor-not-allowed"
                  />
                </div>
              </div>

              <button
                onClick={handleLogin}
                className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-2xl flex items-center justify-center gap-3 hover:opacity-90 transition-all shadow-xl group"
              >
                <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" className="w-5 h-5" />
                <span>Entrar com Google</span>
                <ChevronRight size={18} className="group-hover:translate-x-1 transition-transform" />
              </button>

              <div className="flex items-center justify-center gap-2 text-sm">
                <span className="text-slate-500">Não tem uma conta?</span>
                <button className="text-violet-600 font-bold hover:underline">Criar conta</button>
              </div>
            </div>

            <p className="mt-12 text-[10px] text-center text-slate-400 dark:text-slate-500 leading-relaxed">
              Ao entrar, você concorda com nossos Termos de Serviço e Política de Privacidade.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
};

export default Login;
