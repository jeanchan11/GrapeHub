import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import {
  Target, Users, TrendingUp, FileText, BarChart3,
  Wallet, ArrowRight, Check, Menu, X, LogIn,
} from 'lucide-react';

// Paleta da landing (auto-contida, independente do tema do app)
const V = '#7C3AED';       // violeta primário
const V_LIGHT = '#A855F7'; // accent
const DARK = '#0A0118';    // fundo escuro
const DARK_2 = '#14082E';  // card escuro
const CREAM = '#FAFAF8';   // seção clara

const MODULES = [
  { icon: BarChart3, title: 'Resultados em tempo real', desc: 'Leads, conversões, investimento e custo por lead das suas campanhas — atualizados o tempo todo.' },
  { icon: FileText, title: 'Relatórios completos', desc: 'Desempenho por campanha e criativo, em relatórios profissionais e sempre à mão, em PDF.' },
  { icon: Users, title: 'Reuniões & alinhamentos', desc: 'Histórico de reuniões, decisões e próximos passos do seu projeto — tudo registrado.' },
  { icon: Check, title: 'Prestação de serviço', desc: 'Transparência total: o que já foi entregue, o que está no ar e o que vem a seguir.' },
];

const FEATURES = [
  { icon: TrendingUp, title: 'Leads e conversões', desc: 'Acompanhe cada lead que suas campanhas geram, em tempo real.' },
  { icon: FileText, title: 'Relatórios de campanha', desc: 'Desempenho por campanha e por criativo, em PDF, quando você quiser.' },
  { icon: Wallet, title: 'Investimento e custo por lead', desc: 'Saiba exatamente pra onde vai a verba e quanto custa cada resultado.' },
  { icon: Target, title: 'Estratégia do seu nicho', desc: 'Campanhas pensadas pra sua área de atuação e pro público certo.' },
  { icon: Users, title: 'Reuniões e decisões', desc: 'Alinhamentos, próximos passos e histórico do projeto sempre à vista.' },
  { icon: Check, title: 'Entregas registradas', desc: 'Tudo que a Grape faz pelo seu escritório, documentado e transparente.' },
];

const NAV = [
  { label: 'Início', href: '#top' },
  { label: 'Resultados', href: '#modulos' },
  { label: 'Transparência', href: '#solucoes' },
];

const Logo = ({ light = false }: { light?: boolean }) => (
  <a href="#top" className="flex items-center gap-2.5 shrink-0">
    <div className="w-8 h-8 rounded-lg flex items-center justify-center overflow-hidden" style={{ background: V }}>
      <img src="logobranca.png" alt="GrapeHub" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
    </div>
    <div className="flex items-baseline">
      <span className="font-bold text-xl tracking-tight" style={{ color: light ? '#fff' : V }}>Grape</span>
      <span className="font-light text-xl" style={{ color: light ? 'rgba(255,255,255,0.7)' : '#94a3b8' }}>Hub</span>
    </div>
  </a>
);

// Rótulo estilo "// comentário" (igual à referência)
const Kicker = ({ children, onDark = false }: { children: React.ReactNode; onDark?: boolean }) => (
  <span className="inline-block text-[11px] font-mono font-medium tracking-wide mb-4" style={{ color: onDark ? V_LIGHT : V }}>
    {`// `}{children}
  </span>
);

export default function LandingPage({ onEnter }: { onEnter: () => void }) {
  const [scrolled, setScrolled] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Os botões "Entrar" levam para a tela de login antiga (onde o login de fato acontece).
  const handleLogin = () => { setMobileOpen(false); onEnter(); };

  const LoginBtn = ({ full = false, className = '' }: { full?: boolean; className?: string }) => (
    <button
      onClick={handleLogin}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-5 py-2.5 text-sm font-bold text-white transition-all ${full ? 'w-full' : ''} ${className}`}
      style={{ background: V, boxShadow: `0 8px 24px -8px ${V}` }}
      onMouseEnter={e => (e.currentTarget.style.background = '#6D28D9')}
      onMouseLeave={e => (e.currentTarget.style.background = V)}
    >
      <LogIn size={16} />
      Entrar
    </button>
  );

  return (
    <div style={{ background: DARK }} className="min-h-screen text-white antialiased overflow-x-hidden">
      {/* ── NAV ─────────────────────────────────────────────── */}
      <header
        className="fixed top-0 inset-x-0 z-50 transition-all duration-300"
        style={{
          background: scrolled ? 'rgba(10,1,24,0.85)' : 'transparent',
          backdropFilter: scrolled ? 'blur(12px)' : 'none',
          borderBottom: scrolled ? '1px solid rgba(255,255,255,0.06)' : '1px solid transparent',
        }}
      >
        <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
          <Logo light />
          <nav className="hidden md:flex items-center gap-8">
            {NAV.map(n => (
              <a key={n.href} href={n.href} className="text-sm text-white/60 hover:text-white transition-colors">{n.label}</a>
            ))}
          </nav>
          <div className="hidden md:block"><LoginBtn /></div>
          <button className="md:hidden text-white/80 p-2" onClick={() => setMobileOpen(o => !o)}>
            {mobileOpen ? <X size={22} /> : <Menu size={22} />}
          </button>
        </div>
        {mobileOpen && (
          <div className="md:hidden px-5 pb-4 pt-2 space-y-3" style={{ background: 'rgba(10,1,24,0.95)', backdropFilter: 'blur(12px)' }}>
            {NAV.map(n => (
              <a key={n.href} href={n.href} onClick={() => setMobileOpen(false)} className="block text-sm text-white/70 py-1">{n.label}</a>
            ))}
            <LoginBtn full />
          </div>
        )}
      </header>

      {/* ── HERO ────────────────────────────────────────────── */}
      <section id="top" className="relative pt-36 pb-28 px-5">
        {/* glow */}
        <div className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] h-[600px] rounded-full opacity-30"
            style={{ background: `radial-gradient(circle, ${V} 0%, transparent 60%)`, filter: 'blur(20px)' }} />
          <div className="absolute top-20 -right-40 w-[500px] h-[500px] rounded-full opacity-20"
            style={{ background: `radial-gradient(circle, ${V_LIGHT} 0%, transparent 60%)`, filter: 'blur(30px)' }} />
        </div>

        <div className="relative max-w-6xl mx-auto grid lg:grid-cols-2 gap-12 lg:gap-10 items-center">
          {/* ── Coluna esquerda: copy ── */}
          <div className="text-center lg:text-left">
            <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
              <span className="inline-flex items-center gap-2 text-[11px] font-mono tracking-wide px-3 py-1.5 rounded-full border mb-6"
                style={{ borderColor: 'rgba(168,85,247,0.3)', color: V_LIGHT, background: 'rgba(124,58,237,0.08)' }}>
                <span className="w-1.5 h-1.5 rounded-full" style={{ background: V_LIGHT }} />
                Portal do cliente · marketing jurídico
              </span>
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.05 }}
              className="text-4xl sm:text-5xl md:text-[3.4rem] font-black tracking-tight leading-[1.05]"
            >
              Acompanhe os{' '}
              <span style={{ background: `linear-gradient(90deg, ${V}, ${V_LIGHT})`, WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                resultados
              </span>{' '}
              do seu marketing jurídico.
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.12 }}
              className="mt-6 text-base sm:text-lg text-white/60 max-w-lg mx-auto lg:mx-0 leading-relaxed"
            >
              Campanhas, leads, relatórios e reuniões do seu escritório — num só lugar.
              Veja em tempo real o que a Grape está construindo pelo seu resultado.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5, delay: 0.18 }}
              className="mt-9 flex flex-col sm:flex-row items-center lg:items-start justify-center lg:justify-start gap-3"
            >
              <button
                onClick={handleLogin}
                className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-white transition-all w-full sm:w-auto"
                style={{ background: V, boxShadow: `0 12px 32px -8px ${V}` }}
                onMouseEnter={e => (e.currentTarget.style.background = '#6D28D9')}
                onMouseLeave={e => (e.currentTarget.style.background = V)}
              >
                Acessar meus resultados
                <ArrowRight size={16} />
              </button>
              <a href="#modulos" className="inline-flex items-center justify-center gap-2 rounded-xl px-7 py-3.5 text-sm font-bold text-white/80 border border-white/15 hover:bg-white/5 transition-all w-full sm:w-auto">
                Ver o que acompanho
              </a>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.5, delay: 0.28 }}
              className="mt-10 max-w-lg mx-auto lg:mx-0"
            >
              <p className="text-[10px] font-mono uppercase tracking-widest text-white/30 mb-2">seu marketing</p>
              <div className="flex flex-wrap items-center justify-center lg:justify-start gap-x-4 gap-y-1.5 text-xs font-mono text-white/40">
                {['leads', 'campanhas', 'relatórios', 'reuniões', 'resultados'].map((t, i) => (
                  <React.Fragment key={t}>
                    {i > 0 && <span className="text-white/20">·</span>}
                    <span>{t}</span>
                  </React.Fragment>
                ))}
              </div>
            </motion.div>
          </div>

          {/* ── Coluna direita: janela de navegador com dashboard de campanha ── */}
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
            className="relative"
          >
            {/* glow atrás da janela */}
            <div className="absolute -inset-6 rounded-[2rem] opacity-40 pointer-events-none"
              style={{ background: `radial-gradient(circle at 50% 40%, ${V} 0%, transparent 70%)`, filter: 'blur(40px)' }} />

            <div className="relative rounded-2xl overflow-hidden border border-white/10"
              style={{ background: '#FAFAF8', boxShadow: '0 40px 90px -25px rgba(0,0,0,0.6)' }}>
              {/* barra de título estilo macOS */}
              <div className="flex items-center justify-between px-4 h-11 border-b border-slate-200/80" style={{ background: '#F1F0EC' }}>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full" style={{ background: '#ff5f57' }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: '#febc2e' }} />
                  <span className="w-3 h-3 rounded-full" style={{ background: '#28c840' }} />
                </div>
                <span className="text-[11px] font-medium text-slate-500 hidden sm:block">Seus resultados · Meta Ads</span>
                <span className="inline-flex items-center gap-1.5 text-[10px] font-bold text-emerald-600">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" /> ao vivo
                </span>
              </div>

              {/* corpo com grid de blueprint */}
              <div className="relative p-5"
                style={{ backgroundImage: 'linear-gradient(rgba(0,0,0,0.035) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.035) 1px, transparent 1px)', backgroundSize: '26px 26px' }}>
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Conversões · últimos 14 dias</p>
                    <p className="text-2xl font-black text-slate-900 mt-0.5">342 <span className="text-emerald-600 text-sm font-bold align-middle">+18%</span></p>
                  </div>
                  <span className="text-[10px] font-bold px-2 py-1 rounded-md" style={{ background: 'rgba(124,58,237,0.1)', color: V }}>ROAS 4,2×</span>
                </div>

                {/* gráfico de barras animado */}
                <div className="flex items-end justify-between gap-1.5 h-36">
                  {[35, 48, 40, 58, 52, 66, 60, 74, 68, 82, 78, 90, 86, 100].map((h, i) => (
                    <motion.div
                      key={i}
                      initial={{ height: '0%' }} animate={{ height: `${h}%` }}
                      transition={{ duration: 0.7, delay: 0.55 + i * 0.045, ease: [0.22, 1, 0.36, 1] }}
                      className="flex-1 rounded-t-[3px]"
                      style={{ background: `linear-gradient(180deg, ${V_LIGHT} 0%, ${V} 100%)`, minWidth: 6 }}
                    />
                  ))}
                </div>

                {/* badge flutuante topo-esquerda */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: [0, -5, 0] }}
                  transition={{ opacity: { delay: 1.1, duration: 0.4 }, y: { delay: 1.1, duration: 3.5, repeat: Infinity, ease: 'easeInOut' } }}
                  className="absolute top-16 left-5 bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2"
                >
                  <p className="text-[8px] font-bold uppercase tracking-widest text-slate-400">campanha</p>
                  <p className="text-[11px] font-bold text-slate-800">em veiculação</p>
                </motion.div>

                {/* badge flutuante baixo-direita */}
                <motion.div
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: [0, -6, 0] }}
                  transition={{ opacity: { delay: 1.3, duration: 0.4 }, y: { delay: 1.3, duration: 4, repeat: Infinity, ease: 'easeInOut' } }}
                  className="absolute -bottom-1 right-4 bg-white rounded-xl shadow-lg border border-slate-100 px-3 py-2 flex items-center gap-2"
                >
                  <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.12)', color: '#10b981' }}>
                    <Check size={12} strokeWidth={3} />
                  </span>
                  <p className="text-[11px] font-bold text-slate-800">+128 leads hoje</p>
                </motion.div>
              </div>

              {/* cards de métrica */}
              <div className="grid grid-cols-3 border-t border-slate-200/80" style={{ background: '#fff' }}>
                {[
                  { label: 'Investimento', value: 'R$ 4,2k', sub: 'no ritmo', color: V },
                  { label: 'CPL', value: 'R$ 12,40', sub: 'abaixo da meta', color: '#10b981' },
                  { label: 'Conversões', value: '342', sub: '+18%', color: '#10b981' },
                ].map((s, i) => (
                  <div key={s.label} className={`px-4 py-3.5 ${i < 2 ? 'border-r border-slate-200/80' : ''}`}>
                    <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400 flex items-center gap-1">
                      <TrendingUp size={9} /> {s.label}
                    </p>
                    <p className="text-base font-black text-slate-900 mt-1">{s.value}</p>
                    <p className="text-[10px] font-bold mt-0.5" style={{ color: s.color }}>{s.sub}</p>
                  </div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ── MÓDULOS (seção clara) ───────────────────────────── */}
      <section id="modulos" style={{ background: CREAM, color: '#0a0a0a' }} className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <Kicker>o que você acompanha</Kicker>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Tudo do seu marketing, num só lugar
            </h2>
            <p className="mt-4 text-slate-500 text-base leading-relaxed">
              Do primeiro clique ao contrato assinado — você acompanha cada etapa do seu marketing jurídico, com total transparência.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
            {MODULES.map((m, i) => {
              const Icon = m.icon;
              return (
                <motion.div
                  key={m.title}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: i * 0.06 }}
                  className="group rounded-2xl border border-slate-200 bg-white p-7 hover:border-violet-300 hover:shadow-lg hover:shadow-violet-500/5 transition-all"
                >
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-5"
                    style={{ background: 'rgba(124,58,237,0.1)', color: V }}>
                    <Icon size={22} />
                  </div>
                  <h3 className="text-lg font-bold text-slate-900">{m.title}</h3>
                  <p className="mt-2 text-sm text-slate-500 leading-relaxed">{m.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── FEATURES (seção escura) ─────────────────────────── */}
      <section className="py-24 px-5" style={{ background: DARK }}>
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <Kicker onDark>transparência de ponta a ponta</Kicker>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-white">
              Você vê exatamente o que acontece
            </h2>
            <p className="mt-4 text-white/50 text-base leading-relaxed">
              Nada de caixa-preta. Cada lead, cada real investido e cada entrega ficam registrados e acessíveis pra você, quando quiser.
            </p>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map((f, i) => {
              const Icon = f.icon;
              return (
                <motion.div
                  key={f.title}
                  initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                  transition={{ duration: 0.4, delay: (i % 3) * 0.06 }}
                  className="rounded-2xl p-6 transition-colors"
                  style={{ background: DARK_2, border: '1px solid rgba(255,255,255,0.12)' }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(168,85,247,0.45)')}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.12)')}
                >
                  <div className="w-10 h-10 rounded-lg flex items-center justify-center mb-4"
                    style={{ background: 'rgba(124,58,237,0.15)', color: V_LIGHT }}>
                    <Icon size={18} />
                  </div>
                  <h3 className="text-base font-bold text-white">{f.title}</h3>
                  <p className="mt-1.5 text-sm text-white/50 leading-relaxed">{f.desc}</p>
                </motion.div>
              );
            })}
          </div>
        </div>
      </section>

      {/* ── SOLUÇÕES / MODELO (seção clara) ─────────────────── */}
      <section id="solucoes" style={{ background: CREAM, color: '#0a0a0a' }} className="py-24 px-5">
        <div className="max-w-6xl mx-auto">
          <div className="max-w-2xl">
            <Kicker>feito pra você acompanhar</Kicker>
            <h2 className="text-3xl sm:text-4xl font-black tracking-tight text-slate-900">
              Seu resultado, com total transparência
            </h2>
          </div>

          <div className="mt-12 grid grid-cols-1 md:grid-cols-2 gap-5">
            {[
              {
                tag: 'Na palma da mão',
                title: 'Tudo atualizado sozinho',
                desc: 'Campanhas, leads e relatórios do seu escritório sempre atualizados — sem precisar pedir, a qualquer hora.',
                items: ['Resultados em tempo real', 'Relatórios quando você quiser', 'Histórico de reuniões e entregas'],
              },
              {
                tag: 'Marketing jurídico de verdade',
                title: 'Feito pro seu mercado',
                desc: 'Estratégia, tráfego e criativos pensados pra escritórios de advocacia — com quem entende do seu público.',
                items: ['Campanhas por área de atuação', 'Criativos alinhados ao seu nicho', 'Time especialista no jurídico'],
              },
            ].map((c, i) => (
              <motion.div
                key={c.title}
                initial={{ opacity: 0, y: 24 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true, margin: '-60px' }}
                transition={{ duration: 0.4, delay: i * 0.08 }}
                className="rounded-2xl border border-slate-200 bg-white p-8"
              >
                <span className="text-[11px] font-mono font-medium" style={{ color: V }}>{c.tag}</span>
                <h3 className="mt-2 text-2xl font-black text-slate-900">{c.title}</h3>
                <p className="mt-3 text-sm text-slate-500 leading-relaxed">{c.desc}</p>
                <ul className="mt-6 space-y-2.5">
                  {c.items.map(it => (
                    <li key={it} className="flex items-center gap-2.5 text-sm text-slate-700">
                      <span className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(124,58,237,0.1)', color: V }}>
                        <Check size={12} strokeWidth={3} />
                      </span>
                      {it}
                    </li>
                  ))}
                </ul>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA FINAL ───────────────────────────────────────── */}
      <section className="relative py-28 px-5 overflow-hidden" style={{ background: DARK }}>
        <div className="pointer-events-none absolute inset-0">
          <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[800px] h-[400px] rounded-full opacity-25"
            style={{ background: `radial-gradient(circle, ${V} 0%, transparent 60%)`, filter: 'blur(24px)' }} />
        </div>
        <div className="relative max-w-3xl mx-auto text-center">
          <Kicker onDark>seu resultado te espera</Kicker>
          <h2 className="text-4xl sm:text-5xl font-black tracking-tight text-white leading-tight">
            Acompanhe o seu resultado<br />agora mesmo.
          </h2>
          <p className="mt-5 text-white/55 text-base max-w-xl mx-auto">
            Entre no portal e veja em tempo real o que a Grape está fazendo pelo seu escritório — leads, campanhas e relatórios esperando por você.
          </p>
          <div className="mt-9">
            <button
              onClick={handleLogin}
              className="inline-flex items-center justify-center gap-2 rounded-xl px-8 py-4 text-sm font-bold text-white transition-all"
              style={{ background: V, boxShadow: `0 16px 40px -10px ${V}` }}
              onMouseEnter={e => (e.currentTarget.style.background = '#6D28D9')}
              onMouseLeave={e => (e.currentTarget.style.background = V)}
            >
              <LogIn size={16} />
              Acessar meus resultados
            </button>
          </div>
        </div>
      </section>

      {/* ── FOOTER ──────────────────────────────────────────── */}
      <footer className="px-5 py-10" style={{ background: DARK }}>
        <div className="max-w-6xl mx-auto">
          <div className="h-px w-full mb-8" style={{ background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.09), transparent)' }} />
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <Logo light />
            <p className="text-xs text-white/30 font-mono">leads · campanhas · relatórios · reuniões · resultados</p>
            <p className="text-xs text-white/30">© {new Date().getFullYear()} Grape Mídia</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
