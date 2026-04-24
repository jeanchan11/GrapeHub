import React, { useState, useEffect } from 'react';
import { Brain, CheckCircle2, ChevronLeft } from 'lucide-react';

// 28 word-groups: each has one word per DISC profile
const DISC_QUESTIONS = [
  { d: 'Decidido', i: 'Entusiasta', s: 'Paciente', c: 'Preciso' },
  { d: 'Ousado', i: 'Comunicativo', s: 'Calmo', c: 'Analítico' },
  { d: 'Competitivo', i: 'Sociável', s: 'Cooperativo', c: 'Lógico' },
  { d: 'Direto', i: 'Persuasivo', s: 'Receptivo', c: 'Detalhista' },
  { d: 'Determinado', i: 'Otimista', s: 'Estável', c: 'Cauteloso' },
  { d: 'Exigente', i: 'Expressivo', s: 'Leal', c: 'Metódico' },
  { d: 'Independente', i: 'Animado', s: 'Compreensivo', c: 'Organizado' },
  { d: 'Assertivo', i: 'Carismático', s: 'Gentil', c: 'Perfeccionista' },
  { d: 'Corajoso', i: 'Inspirador', s: 'Confiável', c: 'Criterioso' },
  { d: 'Ambicioso', i: 'Divertido', s: 'Tolerante', c: 'Sistemático' },
  { d: 'Firme', i: 'Empolgante', s: 'Harmonioso', c: 'Disciplinado' },
  { d: 'Prático', i: 'Popular', s: 'Flexível', c: 'Cuidadoso' },
  { d: 'Resoluto', i: 'Motivador', s: 'Tranquilo', c: 'Estratégico' },
  { d: 'Dominante', i: 'Influente', s: 'Acolhedor', c: 'Racional' },
  { d: 'Objetivo', i: 'Criativo', s: 'Dedicado', c: 'Exato' },
  { d: 'Destemido', i: 'Espontâneo', s: 'Amigável', c: 'Prudente' },
  { d: 'Pioneiro', i: 'Encantador', s: 'Solidário', c: 'Técnico' },
  { d: 'Intenso', i: 'Extrovertido', s: 'Atencioso', c: 'Rigoroso' },
  { d: 'Líder', i: 'Envolvente', s: 'Prestativo', c: 'Minucioso' },
  { d: 'Aventureiro', i: 'Alegre', s: 'Moderado', c: 'Reflexivo' },
  { d: 'Empreendedor', i: 'Contagiante', s: 'Generoso', c: 'Planejador' },
  { d: 'Arrojado', i: 'Eloquente', s: 'Conciliador', c: 'Investigador' },
  { d: 'Pragmático', i: 'Cativante', s: 'Sensível', c: 'Meticuloso' },
  { d: 'Audacioso', i: 'Dinâmico', s: 'Bondoso', c: 'Reservado' },
  { d: 'Visionário', i: 'Magnético', s: 'Pacificador', c: 'Ponderado' },
  { d: 'Desafiador', i: 'Convincente', s: 'Constante', c: 'Estruturado' },
  { d: 'Inovador', i: 'Expansivo', s: 'Consistente', c: 'Seletivo' },
  { d: 'Poderoso', i: 'Acessível', s: 'Modesto', c: 'Formal' },
];

const TOTAL = DISC_QUESTIONS.length;

// Shuffle options order per question (deterministic by index)
function getOptions(q: typeof DISC_QUESTIONS[0], idx: number) {
  const opts = [
    { label: q.d, profile: 'D' },
    { label: q.i, profile: 'I' },
    { label: q.s, profile: 'S' },
    { label: q.c, profile: 'C' },
  ];
  // Simple deterministic shuffle based on question index
  const seed = idx * 2654435761;
  const shuffled = [...opts];
  for (let i = 3; i > 0; i--) {
    const j = Math.abs((seed >> (i * 8)) % (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }
  return shuffled;
}

const PROFILE_INFO: Record<string, { name: string; color: string; desc: string }> = {
  D: { name: 'Dominância', color: '#ef4444', desc: 'Orientado a resultados, decisivo e competitivo' },
  I: { name: 'Influência', color: '#f59e0b', desc: 'Comunicativo, entusiasta e persuasivo' },
  S: { name: 'Estabilidade', color: '#10b981', desc: 'Paciente, confiável e colaborativo' },
  C: { name: 'Conformidade', color: '#3b82f6', desc: 'Analítico, detalhista e preciso' },
};

export default function DiscTestPage() {
  const candidateId = new URLSearchParams(window.location.search).get('disc-test');
  const [currentQ, setCurrentQ] = useState(0);
  const [answers, setAnswers] = useState<string[]>([]);
  const [animating, setAnimating] = useState(false);
  const [selected, setSelected] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [alreadyDone, setAlreadyDone] = useState(false);
  const [error, setError] = useState('');
  const [slideDir, setSlideDir] = useState<'in' | 'out'>('in');

  useEffect(() => {
    if (!candidateId) return;
    fetch(`/api/hiring/candidates/${candidateId}/disc`)
      .then(r => r.json())
      .then(data => {
        if (data && (data.d_score > 0 || data.i_score > 0 || data.s_score > 0 || data.c_score > 0)) {
          setAlreadyDone(true);
        }
      })
      .catch(() => {});
  }, [candidateId]);

  if (!candidateId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Brain className="mx-auto mb-4 text-blue-400" size={48} />
          <h1 className="text-2xl font-black text-white mb-2">Link Inválido</h1>
          <p className="text-slate-400">Este link de avaliação não é válido.</p>
        </div>
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={56} />
          <h1 className="text-2xl font-black text-white mb-2">Avaliação já realizada</h1>
          <p className="text-slate-400">Você já completou a avaliação de Perfil Comportamental DISC. Obrigado!</p>
        </div>
      </div>
    );
  }

  const handleAnswer = (profile: string) => {
    if (animating) return;
    setSelected(profile);
    setAnimating(true);

    setTimeout(() => {
      const newAnswers = [...answers, profile];
      setAnswers(newAnswers);
      setSlideDir('out');

      setTimeout(() => {
        if (currentQ < TOTAL - 1) {
          setCurrentQ(prev => prev + 1);
          setSelected(null);
          setSlideDir('in');
          setAnimating(false);
        } else {
          // Submit
          submitResults(newAnswers);
        }
      }, 200);
    }, 350);
  };

  const goBack = () => {
    if (currentQ === 0 || animating) return;
    setSlideDir('out');
    setTimeout(() => {
      setCurrentQ(prev => prev - 1);
      setAnswers(prev => prev.slice(0, -1));
      setSelected(null);
      setSlideDir('in');
    }, 200);
  };

  const submitResults = async (allAnswers: string[]) => {
    setSubmitting(true);
    setError('');
    const counts = { D: 0, I: 0, S: 0, C: 0 };
    allAnswers.forEach(a => { counts[a as keyof typeof counts]++; });
    const pct = (v: number) => Math.round((v / TOTAL) * 1000) / 10;
    try {
      const res = await fetch(`/api/hiring/candidates/${candidateId}/disc`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          d_score: pct(counts.D), i_score: pct(counts.I),
          s_score: pct(counts.S), c_score: pct(counts.C)
        })
      });
      if (!res.ok) throw new Error('Erro ao salvar');
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
      setAnimating(false);
    }
    setSubmitting(false);
  };

  const progress = ((currentQ) / TOTAL) * 100;

  if (success) {
    const counts = { D: 0, I: 0, S: 0, C: 0 };
    answers.forEach(a => { counts[a as keyof typeof counts]++; });
    const dominant = (Object.entries(counts) as [string, number][]).sort((a, b) => b[1] - a[1])[0][0];
    const info = PROFILE_INFO[dominant];
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6" style={{ background: `${info.color}20` }}>
            <CheckCircle2 style={{ color: info.color }} size={40} />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Avaliação Concluída!</h1>
          <p className="text-slate-400 leading-relaxed mb-6">
            Seus resultados foram registrados com sucesso.
          </p>
          <div className="bg-white/5 border border-white/10 rounded-2xl p-5 text-left">
            <p className="text-[10px] text-slate-500 uppercase tracking-widest font-bold mb-3">Seu perfil dominante</p>
            <div className="flex items-center gap-3">
              <div className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl font-black text-white" style={{ background: info.color }}>{dominant}</div>
              <div>
                <p className="text-white font-bold">{info.name}</p>
                <p className="text-slate-400 text-xs">{info.desc}</p>
              </div>
            </div>
          </div>
          <div className="mt-6 inline-flex items-center gap-2 bg-blue-500/15 text-blue-400 font-bold text-sm px-5 py-2.5 rounded-full">
            <Brain size={16} /> Grape Mídia
          </div>
        </div>
      </div>
    );
  }

  if (submitting) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500/30 border-t-blue-500 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-slate-400 text-sm">Processando resultado...</p>
        </div>
      </div>
    );
  }

  const q = DISC_QUESTIONS[currentQ];
  const options = getOptions(q, currentQ);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-blue-950 flex flex-col">

      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-2xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/30">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight">Perfil Comportamental DISC</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Grape Mídia</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-blue-400">PERGUNTA {currentQ + 1} DE {TOTAL}</span>
            <div className="w-28 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-blue-500 rounded-full transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Question */}
      <div className="flex-1 flex items-center justify-center p-4">
        <div
          className="w-full max-w-lg transition-all duration-300 ease-out"
          style={{
            opacity: slideDir === 'in' ? 1 : 0,
            transform: slideDir === 'in' ? 'translateX(0)' : 'translateX(-30px)',
          }}
        >
          <p className="text-center text-slate-500 text-xs font-bold uppercase tracking-widest mb-3">
            {Math.round(((currentQ + 1) / TOTAL) * 100)}%
          </p>
          <h2 className="text-2xl sm:text-3xl font-black text-white text-center mb-2 leading-tight">
            Qual palavra melhor te descreve?
          </h2>
          <p className="text-slate-500 text-sm text-center mb-10">Selecione a opção que mais combina com você.</p>

          <div className="space-y-3">
            {options.map(opt => {
              const isSelected = selected === opt.profile;
              return (
                <button
                  key={opt.profile}
                  onClick={() => handleAnswer(opt.profile)}
                  disabled={animating}
                  className={`w-full py-4 px-6 rounded-2xl text-lg font-bold transition-all duration-300 border ${
                    isSelected
                      ? 'bg-blue-600 text-white border-blue-500 scale-[1.02] shadow-xl shadow-blue-500/30'
                      : 'bg-white/5 text-slate-300 border-white/10 hover:bg-white/10 hover:border-white/20 hover:text-white hover:scale-[1.01]'
                  }`}
                >
                  {opt.label}
                </button>
              );
            })}
          </div>

          {/* Back button */}
          {currentQ > 0 && (
            <button
              onClick={goBack}
              className="mt-8 mx-auto flex items-center gap-2 text-sm text-slate-500 hover:text-slate-300 transition-colors"
            >
              <ChevronLeft size={16} /> Voltar
            </button>
          )}

          {error && (
            <div className="mt-4 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm text-center">
              {error}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
