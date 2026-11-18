import React, { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  ArrowRight, LogIn, Menu, X, FolderKanban, Layers, ClipboardCheck, CalendarClock,
  Palette, GraduationCap, ListTodo, Lock, Megaphone, Users, Sparkles, CheckCircle2,
} from 'lucide-react';
import Typewriter from '../components/Typewriter';

/**
 * Página inicial do GrapeHub (refeita em 18/11/2026). O sistema agora é só do time interno —
 * o cliente final não acessa nada. Foco na operação; nada de financeiro aqui.
 * Paleta própria (independe do tema do app), no mesmo idioma visual do app: fundo quase preto,
 * brilhos violeta, painéis de vidro. Original em backup-menu-antes-materna/redesign-crm/.
 */

const V = '#7C3AED';
const V_CLARO = '#A78BFA';
const FUNDO = '#0A0118';

const NAV = [
  { label: 'Operação', href: '#operacao' },
  { label: 'Ferramentas', href: '#ferramentas' },
  { label: 'Para quem', href: '#funcoes' },
];

const FERRAMENTAS = [
  { Icone: FolderKanban, titulo: 'Projetos & Parceiros', texto: 'A carteira de cada gestor num lugar só: produtos, verba, resultado da campanha e a última reunião de cada cliente.' },
  { Icone: Layers, titulo: 'Playbook de ações', texto: 'As ações que funcionam em cada nicho, quem já roda cada uma e o que dá resultado — para não começar do zero.' },
  { Icone: ClipboardCheck, titulo: 'Onboarding e checklists', texto: 'Do contrato à campanha no ar: cada etapa com responsável, prazo e o que falta para o cliente começar a rodar.' },
  { Icone: CalendarClock, titulo: 'Reuniões e 1:1', texto: 'Anotações das reuniões com cliente e dos 1:1 do time, com próximos passos que não se perdem.' },
  { Icone: Palette, titulo: 'Visual Hub e Estúdio', texto: 'Pedidos de criativo, aprovação e vídeos com avatar gerados direto da plataforma.' },
  { Icone: GraduationCap, titulo: 'Central de Treinamentos', texto: 'Cursos e aulas do time, com o progresso de cada pessoa acompanhado pelos gestores.' },
  { Icone: ListTodo, titulo: 'Tarefas e chamados', texto: 'To do de cada head, chamados internos e ideias de criativo organizados por quadro.' },
  { Icone: Megaphone, titulo: 'Dashboard Operacional', texto: 'A saúde da carteira dia a dia: projetos com resultado bom, ok e ruim, risco de churn e erros de token.' },
];

const FUNCOES = [
  { Icone: Megaphone, titulo: 'Gestores de tráfego', itens: ['Seus projetos e produtos em uma tela', 'Ações do playbook por nicho', 'Alerta de saldo baixo nas contas'] },
  { Icone: Users, titulo: 'Heads e liderança', itens: ['Evolução da carteira por squad', 'Reuniões e 1:1 com o time', 'Risco de churn antes de virar saída'] },
  { Icone: Sparkles, titulo: 'Design e vídeo', itens: ['Fila de criativos com prioridade', 'Aprovação sem ida e volta no WhatsApp', 'Vídeos com avatar no Estúdio'] },
];

// Prévia ilustrativa (números de exemplo, sem cliente real)
const CARTEIRA = [
  { rotulo: 'Bom', valor: 41, cor: '#10b981' },
  { rotulo: 'Ok', valor: 19, cor: '#f59e0b' },
  { rotulo: 'Ruim', valor: 12, cor: '#f43f5e' },
];
const SERIE = [52, 54, 53, 56, 55, 58, 57, 60, 59, 61, 63, 62, 64, 66];
const ACOES = [
  { titulo: 'Subir campanha', detalhe: 'Previdenciário · etapa 3 de 5', cor: V_CLARO },
  { titulo: 'Reunião de alinhamento', detalhe: 'Bancário · hoje, 15h', cor: '#38bdf8' },
  { titulo: 'Novo criativo aprovado', detalhe: 'Trabalhista · Visual Hub', cor: '#10b981' },
];

const surgir = {
  initial: { opacity: 0, y: 18 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-60px' },
  transition: { duration: 0.5, ease: [0.22, 1, 0.36, 1] as any },
};

const Logo = () => (
  <a href="#top" className="flex items-center gap-2.5 shrink-0">
    <div className="w-9 h-9 rounded-[12px] flex items-center justify-center p-1.5 shadow-lg" style={{ background: 'linear-gradient(135deg,#a78bfa,#6d28d9)', boxShadow: '0 8px 20px -8px rgba(124,58,237,.7)' }}>
      <img src="logobranca.png" alt="GrapeHub" className="w-full h-full object-contain" referrerPolicy="no-referrer" />
    </div>
    <div className="flex items-baseline">
      <span className="font-semibold text-[19px] tracking-tight text-white">Grape</span>
      <span className="font-light text-[19px]" style={{ color: '#c4b5fd' }}>Hub</span>
    </div>
  </a>
);

const Vidro: React.FC<{ className?: string; children: React.ReactNode }> = ({ className = '', children }) => (
  <div
    className={`rounded-[22px] ${className}`}
    style={{
      background: 'rgba(48,32,78,.38)',
      border: '1px solid rgba(192,165,222,.14)',
      boxShadow: '0 1px 0 rgba(255,255,255,.05) inset, 0 30px 60px -40px rgba(0,0,0,.8)',
    }}
  >
    {children}
  </div>
);

const Rotulo: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.16em] mb-4" style={{ color: V_CLARO }}>
    <span className="w-1.5 h-1.5 rounded-full" style={{ background: V_CLARO }} />
    {children}
  </span>
);

/** Mini painel da operação: carteira, evolução e próximas ações. Ilustrativo. */
function PreviaOperacao() {
  const total = CARTEIRA.reduce((s, c) => s + c.valor, 0);
  const max = Math.max(...SERIE), min = Math.min(...SERIE);
  const pts = SERIE.map((v, i) => `${(i / (SERIE.length - 1)) * 100},${36 - ((v - min) / (max - min || 1)) * 30}`).join(' ');
  return (
    <Vidro className="p-5 sm:p-6 w-full">
      <div className="flex items-center justify-between mb-5">
        <div>
          <p className="text-[12px] text-slate-400">Dashboard Operacional</p>
          <p className="text-[15px] font-semibold text-white">Carteira hoje</p>
        </div>
        <span className="inline-flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full" style={{ background: 'rgba(16,185,129,.12)', color: '#34d399' }}>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" /> ao vivo
        </span>
      </div>

      <div className="grid grid-cols-3 gap-3 mb-5">
        {CARTEIRA.map(c => (
          <div key={c.rotulo} className="rounded-2xl px-3 py-3" style={{ background: 'rgba(255,255,255,.04)', border: '1px solid rgba(255,255,255,.06)' }}>
            <p className="text-[11px] text-slate-400 flex items-center gap-1.5"><i className="w-2 h-2 rounded-full" style={{ background: c.cor }} />{c.rotulo}</p>
            <p className="text-[22px] text-white mt-1" style={{ fontFamily: '"Azeret Mono", monospace' }}>{c.valor}</p>
            <p className="text-[10.5px] text-slate-500">{Math.round((c.valor / total) * 100)}% da carteira</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl px-4 pt-3 pb-2 mb-5" style={{ background: 'rgba(255,255,255,.03)', border: '1px solid rgba(255,255,255,.06)' }}>
        <div className="flex items-baseline justify-between">
          <p className="text-[11.5px] text-slate-400">Resultado positivo · 14 dias</p>
          <p className="text-[12px] font-semibold text-emerald-400">+14 p.p.</p>
        </div>
        <svg viewBox="0 0 100 40" preserveAspectRatio="none" className="w-full h-16 mt-1">
          <defs>
            <linearGradient id="lp-area" x1="0" x2="0" y1="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity=".35" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
            </linearGradient>
          </defs>
          <polygon points={`0,40 ${pts} 100,40`} fill="url(#lp-area)" />
          <polyline points={pts} fill="none" stroke="#10b981" strokeWidth="1.6" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
        </svg>
      </div>

      <p className="text-[12px] text-slate-400 mb-2">Próximas ações do time</p>
      <div className="space-y-1.5">
        {ACOES.map(a => (
          <div key={a.titulo} className="flex items-center gap-3 rounded-xl px-3 py-2.5" style={{ background: 'rgba(255,255,255,.03)' }}>
            <i className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: a.cor, boxShadow: `0 0 0 4px ${a.cor}22` }} />
            <div className="min-w-0">
              <p className="text-[13px] font-medium text-white truncate">{a.titulo}</p>
              <p className="text-[11.5px] text-slate-500 truncate">{a.detalhe}</p>
            </div>
          </div>
        ))}
      </div>
    </Vidro>
  );
}

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [rolou, setRolou] = useState(false);
  const [menuAberto, setMenuAberto] = useState(false);

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 12);
    aoRolar();
    window.addEventListener('scroll', aoRolar, { passive: true });
    return () => window.removeEventListener('scroll', aoRolar);
  }, []);

  const entrar = () => { setMenuAberto(false); onEnter(); };

  return (
    <div className="min-h-screen text-white antialiased overflow-x-hidden" style={{ background: FUNDO, fontFamily: 'Inter, system-ui, sans-serif' }}>
      {/* Brilhos do fundo (mesmo idioma do app) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute rounded-full" style={{ width: 760, height: 760, left: -260, top: -260, background: 'radial-gradient(circle, rgba(124,58,237,.45), transparent 70%)' }} />
        <div className="absolute rounded-full" style={{ width: 820, height: 820, right: -320, top: '30%', background: 'radial-gradient(circle, rgba(109,40,217,.32), transparent 70%)' }} />
        <div className="absolute rounded-full" style={{ width: 600, height: 600, left: '30%', bottom: -340, background: 'radial-gradient(circle, rgba(167,139,250,.14), transparent 70%)' }} />
      </div>

      {/* ── Topo ── */}
      <header className={`fixed top-0 inset-x-0 z-50 transition-colors duration-300 ${rolou ? 'backdrop-blur-xl' : ''}`} style={{ background: rolou ? 'rgba(10,1,24,.72)' : 'transparent', borderBottom: rolou ? '1px solid rgba(255,255,255,.06)' : '1px solid transparent' }}>
        <div className="max-w-6xl mx-auto px-5 h-[72px] flex items-center justify-between">
          <Logo />
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map(n => <a key={n.href} href={n.href} className="text-[14px] text-slate-300 hover:text-white transition-colors">{n.label}</a>)}
          </nav>
          <div className="flex items-center gap-2">
            <button onClick={entrar} className="hidden sm:inline-flex items-center gap-2 h-10 px-5 rounded-xl text-[14px] font-semibold text-white transition-transform hover:-translate-y-px" style={{ background: `linear-gradient(180deg, ${V}, #6d28d9)`, boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 12px 24px -12px rgba(124,58,237,.9)' }}>
              <LogIn size={16} /> Entrar
            </button>
            <button onClick={() => setMenuAberto(v => !v)} className="md:hidden p-2 rounded-lg text-slate-300 hover:text-white" aria-label="Menu">
              {menuAberto ? <X size={22} /> : <Menu size={22} />}
            </button>
          </div>
        </div>
        {menuAberto && (
          <div className="md:hidden px-5 pb-5 space-y-1" style={{ background: 'rgba(10,1,24,.95)' }}>
            {NAV.map(n => <a key={n.href} href={n.href} onClick={() => setMenuAberto(false)} className="block py-2.5 text-[15px] text-slate-200">{n.label}</a>)}
            <button onClick={entrar} className="mt-2 w-full h-11 rounded-xl text-[15px] font-semibold text-white" style={{ background: V }}>Entrar</button>
          </div>
        )}
      </header>

      {/* ── Hero ── */}
      <section id="top" className="relative pt-32 sm:pt-36 pb-20 px-5">
        <div className="max-w-6xl mx-auto grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-14 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}>
            <span className="inline-flex items-center gap-2 text-[12px] font-medium px-3 py-1.5 rounded-full mb-6" style={{ background: 'rgba(124,58,237,.14)', border: '1px solid rgba(167,139,250,.25)', color: '#ddd6fe' }}>
              <Lock size={12} /> Uso interno · time Grape Mídia
            </span>
            <h1 className="text-[40px] sm:text-[54px] leading-[1.04] font-black tracking-tight">
              A operação da Grape,{' '}
              <span style={{ background: 'linear-gradient(90deg,#c4b5fd,#8b5cf6)', WebkitBackgroundClip: 'text', backgroundClip: 'text', color: 'transparent' }}>num lugar só.</span>
            </h1>
            <p className="mt-6 text-[17px] sm:text-[18px] leading-relaxed text-slate-300 max-w-xl">
              Do onboarding do cliente ao resultado da campanha: o time acompanha{' '}
              <Typewriter words={['os projetos.', 'as ações por nicho.', 'as reuniões.', 'os criativos.', 'o dia a dia do time.']} color="#c4b5fd" className="font-semibold" />
            </p>
            <div className="mt-9 flex flex-wrap items-center gap-3">
              <button onClick={entrar} className="inline-flex items-center gap-2 h-12 px-6 rounded-xl text-[15px] font-semibold text-white transition-transform hover:-translate-y-px" style={{ background: `linear-gradient(180deg, ${V}, #6d28d9)`, boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 16px 32px -14px rgba(124,58,237,.95)' }}>
                Entrar no GrapeHub <ArrowRight size={17} />
              </button>
              <a href="#ferramentas" className="inline-flex items-center h-12 px-6 rounded-xl text-[15px] font-semibold text-slate-200 hover:text-white transition-colors" style={{ border: '1px solid rgba(255,255,255,.12)', background: 'rgba(255,255,255,.03)' }}>
                Ver o que tem dentro
              </a>
            </div>
            <p className="mt-6 text-[13px] text-slate-500">Acesso com a sua conta Google da Grape.</p>
          </motion.div>

          <motion.div initial={{ opacity: 0, y: 24, scale: 0.98 }} animate={{ opacity: 1, y: 0, scale: 1 }} transition={{ duration: 0.7, delay: 0.12, ease: [0.22, 1, 0.36, 1] }}>
            <PreviaOperacao />
          </motion.div>
        </div>
      </section>

      {/* ── Operação em números (o que o sistema organiza) ── */}
      <section id="operacao" className="relative px-5 pb-8">
        <motion.div {...surgir} className="max-w-6xl mx-auto">
          <Vidro className="grid grid-cols-2 md:grid-cols-4 divide-x divide-white/5">
            {[
              ['Carteira', 'por gestor e squad'],
              ['Playbook', 'ações por nicho'],
              ['Reuniões', 'com cliente e 1:1'],
              ['Criativos', 'do pedido ao ar'],
            ].map(([t, s]) => (
              <div key={t} className="px-6 py-6">
                <p className="text-[18px] font-semibold text-white">{t}</p>
                <p className="text-[13px] text-slate-400 mt-0.5">{s}</p>
              </div>
            ))}
          </Vidro>
        </motion.div>
      </section>

      {/* ── Ferramentas ── */}
      <section id="ferramentas" className="relative py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <motion.div {...surgir} className="max-w-2xl mb-12">
            <Rotulo>Ferramentas do time</Rotulo>
            <h2 className="text-[32px] sm:text-[40px] font-black tracking-tight leading-tight">Tudo que a operação usa no dia, sem planilha paralela.</h2>
            <p className="mt-4 text-[16px] text-slate-400 leading-relaxed">Cada área do time trabalha na mesma base — o que um registra, o outro já enxerga.</p>
          </motion.div>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {FERRAMENTAS.map((f, i) => (
              <motion.div key={f.titulo} {...surgir} transition={{ ...surgir.transition, delay: Math.min(i, 7) * 0.05 }}>
                <Vidro className="h-full p-5 transition-transform duration-300 hover:-translate-y-1">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-4" style={{ background: 'rgba(124,58,237,.18)', color: '#c4b5fd' }}>
                    <f.Icone size={19} />
                  </div>
                  <h3 className="text-[15.5px] font-semibold text-white">{f.titulo}</h3>
                  <p className="mt-2 text-[13.5px] leading-relaxed text-slate-400">{f.texto}</p>
                </Vidro>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Para cada função ── */}
      <section id="funcoes" className="relative py-20 px-5">
        <div className="max-w-6xl mx-auto">
          <motion.div {...surgir} className="max-w-2xl mb-12">
            <Rotulo>Para cada função</Rotulo>
            <h2 className="text-[32px] sm:text-[40px] font-black tracking-tight leading-tight">Cada pessoa vê o que importa para o trabalho dela.</h2>
          </motion.div>
          <div className="grid md:grid-cols-3 gap-4">
            {FUNCOES.map((f, i) => (
              <motion.div key={f.titulo} {...surgir} transition={{ ...surgir.transition, delay: i * 0.06 }}>
                <Vidro className="h-full p-6">
                  <div className="flex items-center gap-3 mb-5">
                    <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(124,58,237,.18)', color: '#c4b5fd' }}>
                      <f.Icone size={19} />
                    </div>
                    <h3 className="text-[17px] font-semibold text-white">{f.titulo}</h3>
                  </div>
                  <ul className="space-y-3">
                    {f.itens.map(it => (
                      <li key={it} className="flex items-start gap-2.5 text-[14px] text-slate-300">
                        <CheckCircle2 size={16} className="mt-0.5 shrink-0 text-emerald-400" /> {it}
                      </li>
                    ))}
                  </ul>
                </Vidro>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Acesso ── */}
      <section className="relative py-24 px-5">
        <motion.div {...surgir} className="max-w-4xl mx-auto">
          <Vidro className="relative overflow-hidden px-8 py-14 sm:px-14 text-center">
            <div className="pointer-events-none absolute -top-40 left-1/2 -translate-x-1/2 w-[520px] h-[520px] rounded-full" style={{ background: 'radial-gradient(circle, rgba(124,58,237,.35), transparent 70%)' }} aria-hidden />
            <div className="relative">
              <div className="mx-auto w-12 h-12 rounded-2xl flex items-center justify-center mb-5" style={{ background: 'rgba(124,58,237,.2)', color: '#ddd6fe' }}>
                <Lock size={20} />
              </div>
              <h2 className="text-[28px] sm:text-[36px] font-black tracking-tight">Acesso restrito ao time da Grape.</h2>
              <p className="mt-3 text-[16px] text-slate-400 max-w-lg mx-auto">Entre com o seu e-mail @grapemidia. As páginas que você vê dependem da sua função.</p>
              <button onClick={entrar} className="mt-8 inline-flex items-center gap-2 h-12 px-7 rounded-xl text-[15px] font-semibold text-white transition-transform hover:-translate-y-px" style={{ background: `linear-gradient(180deg, ${V}, #6d28d9)`, boxShadow: '0 1px 0 rgba(255,255,255,.25) inset, 0 16px 32px -14px rgba(124,58,237,.95)' }}>
                <LogIn size={17} /> Entrar no GrapeHub
              </button>
            </div>
          </Vidro>
        </motion.div>
      </section>

      <footer className="relative px-5 pb-10">
        <div className="max-w-6xl mx-auto pt-8 flex flex-col sm:flex-row items-center justify-between gap-3" style={{ borderTop: '1px solid rgba(255,255,255,.06)' }}>
          <Logo />
          <p className="text-[12.5px] text-slate-500">© {new Date().getFullYear()} Grape Mídia · sistema de uso interno</p>
        </div>
      </footer>
    </div>
  );
}
