import React, { useState, useEffect, useRef } from 'react';
import { Brain, CheckCircle2, ChevronRight, ChevronLeft, Send } from 'lucide-react';

// ── Questions ──────────────────────────────────────────────────────────────
// 40 original behavioral statements, 4 per saboteur archetype.
// Scale: 1 (Discordo totalmente) → 5 (Concordo totalmente)

interface Question {
  id: number;
  text: string;
  saboteur: string;
}

const QUESTIONS: Question[] = [
  // Crítico
  { id: 1, text: 'Costumo avaliar e julgar a mim mesmo com bastante rigidez.', saboteur: 'critico' },
  { id: 2, text: 'Frequentemente percebo primeiro os defeitos ou erros nas situações.', saboteur: 'critico' },
  { id: 3, text: 'Tenho dificuldade em aceitar quando algo não sai perfeito.', saboteur: 'critico' },
  { id: 4, text: 'Costumo ser muito exigente comigo mesmo quando cometo um erro.', saboteur: 'critico' },
  // Insistente
  { id: 5, text: 'Sinto necessidade de que tudo esteja organizado e no lugar certo.', saboteur: 'insistente' },
  { id: 6, text: 'Fico incomodado quando as coisas não seguem um padrão ou rotina.', saboteur: 'insistente' },
  { id: 7, text: 'Tenho dificuldade em delegar tarefas porque acho que ninguém faz tão bem quanto eu.', saboteur: 'insistente' },
  { id: 8, text: 'Dedico tempo excessivo para garantir que cada detalhe esteja correto.', saboteur: 'insistente' },
  // Prestativo
  { id: 9, text: 'Tenho dificuldade em dizer "não" para as pessoas.', saboteur: 'prestativo' },
  { id: 10, text: 'Costumo priorizar as necessidades dos outros acima das minhas.', saboteur: 'prestativo' },
  { id: 11, text: 'Fico ansioso quando sinto que alguém está insatisfeito comigo.', saboteur: 'prestativo' },
  { id: 12, text: 'Busco constantemente a aprovação das pessoas ao meu redor.', saboteur: 'prestativo' },
  // Hiper-Realizador
  { id: 13, text: 'Meu valor pessoal está muito ligado às minhas conquistas profissionais.', saboteur: 'hiper_realizador' },
  { id: 14, text: 'Sinto que preciso estar sempre produzindo algo para me sentir bem.', saboteur: 'hiper_realizador' },
  { id: 15, text: 'Tenho dificuldade em relaxar sem sentir culpa.', saboteur: 'hiper_realizador' },
  { id: 16, text: 'Comparo frequentemente meus resultados com os dos outros.', saboteur: 'hiper_realizador' },
  // Vítima
  { id: 17, text: 'Às vezes sinto que as circunstâncias da vida são injustas comigo.', saboteur: 'vitima' },
  { id: 18, text: 'Quando algo dá errado, tendo a focar no quanto a situação me afeta.', saboteur: 'vitima' },
  { id: 19, text: 'Costumo relembrar experiências negativas do passado com frequência.', saboteur: 'vitima' },
  { id: 20, text: 'Sinto que mereço mais reconhecimento do que recebo.', saboteur: 'vitima' },
  // Hiper-Racional
  { id: 21, text: 'Prefiro analisar situações de forma lógica do que emocional.', saboteur: 'hiper_racional' },
  { id: 22, text: 'Tenho dificuldade em expressar ou lidar com emoções intensas.', saboteur: 'hiper_racional' },
  { id: 23, text: 'Acredito que decisões devem ser tomadas exclusivamente com base em dados.', saboteur: 'hiper_racional' },
  { id: 24, text: 'Às vezes as pessoas me dizem que sou frio ou distante.', saboteur: 'hiper_racional' },
  // Hiper-Vigilante
  { id: 25, text: 'Costumo antecipar problemas e cenários negativos antes que aconteçam.', saboteur: 'hiper_vigilante' },
  { id: 26, text: 'Tenho dificuldade em confiar plenamente nas pessoas.', saboteur: 'hiper_vigilante' },
  { id: 27, text: 'Estou sempre atento a possíveis riscos ou ameaças.', saboteur: 'hiper_vigilante' },
  { id: 28, text: 'Fico tenso em situações de incerteza ou mudança.', saboteur: 'hiper_vigilante' },
  // Inquieto
  { id: 29, text: 'Tenho dificuldade em me concentrar em uma única atividade por muito tempo.', saboteur: 'inquieto' },
  { id: 30, text: 'Estou sempre buscando novas experiências ou desafios.', saboteur: 'inquieto' },
  { id: 31, text: 'Fico entediado facilmente com rotinas repetitivas.', saboteur: 'inquieto' },
  { id: 32, text: 'Costumo iniciar muitos projetos, mas nem sempre finalizo todos.', saboteur: 'inquieto' },
  // Controlador
  { id: 33, text: 'Prefiro liderar situações do que seguir instruções de outros.', saboteur: 'controlador' },
  { id: 34, text: 'Fico impaciente quando as coisas não acontecem no meu ritmo.', saboteur: 'controlador' },
  { id: 35, text: 'Tenho necessidade de estar no comando das situações.', saboteur: 'controlador' },
  { id: 36, text: 'Às vezes as pessoas me consideram autoritário ou dominante.', saboteur: 'controlador' },
  // Esquivo
  { id: 37, text: 'Tendo a evitar conversas difíceis ou conflitos.', saboteur: 'esquivo' },
  { id: 38, text: 'Prefiro adiar tarefas desagradáveis em vez de enfrentá-las logo.', saboteur: 'esquivo' },
  { id: 39, text: 'Costumo minimizar problemas para não ter que lidar com eles.', saboteur: 'esquivo' },
  { id: 40, text: 'Foco mais nos aspectos positivos das situações, mesmo quando há problemas claros.', saboteur: 'esquivo' },
];

// Shuffle questions deterministically based on candidate id for consistency
function shuffleQuestions(questions: Question[], seed: number): Question[] {
  const arr = [...questions];
  let s = seed;
  for (let i = arr.length - 1; i > 0; i--) {
    s = (s * 9301 + 49297) % 233280;
    const j = Math.floor((s / 233280) * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

const SABOTEUR_NAMES: Record<string, string> = {
  critico: 'Crítico', insistente: 'Insistente', prestativo: 'Prestativo',
  hiper_realizador: 'Hiper-Realizador', vitima: 'Vítima', hiper_racional: 'Hiper-Racional',
  hiper_vigilante: 'Hiper-Vigilante', inquieto: 'Inquieto', controlador: 'Controlador', esquivo: 'Esquivo',
};

const SCALE_LABELS = ['Discordo totalmente', 'Discordo', 'Neutro', 'Concordo', 'Concordo totalmente'];
const QUESTIONS_PER_PAGE = 8;

// ── Component ──────────────────────────────────────────────────────────────
export default function SaboteurTestPage() {
  const candidateId = new URLSearchParams(window.location.search).get('saboteur-test');
  const [candidateName, setCandidateName] = useState('');
  const [answers, setAnswers] = useState<Record<number, number>>({});
  const [page, setPage] = useState(0);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [alreadyDone, setAlreadyDone] = useState(false);
  const topRef = useRef<HTMLDivElement>(null);

  const shuffled = shuffleQuestions(QUESTIONS, Number(candidateId) || 1);
  const totalPages = Math.ceil(shuffled.length / QUESTIONS_PER_PAGE);
  const currentQuestions = shuffled.slice(page * QUESTIONS_PER_PAGE, (page + 1) * QUESTIONS_PER_PAGE);
  const answered = Object.keys(answers).length;
  const progress = (answered / shuffled.length) * 100;

  useEffect(() => {
    if (!candidateId) return;
    // Check if already submitted
    fetch(`/api/hiring/candidates/${candidateId}/saboteurs`)
      .then(r => r.json())
      .then(data => {
        if (Array.isArray(data) && data.length > 0 && data.some((d: any) => d.score > 0)) {
          setAlreadyDone(true);
        }
      })
      .catch(() => {});
  }, [candidateId]);

  if (!candidateId) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center p-4">
        <div className="text-center">
          <Brain className="mx-auto mb-4 text-violet-400" size={48} />
          <h1 className="text-2xl font-black text-white mb-2">Link Inválido</h1>
          <p className="text-slate-400">Este link de avaliação não é válido.</p>
        </div>
      </div>
    );
  }

  if (alreadyDone) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md">
          <CheckCircle2 className="mx-auto mb-4 text-emerald-400" size={56} />
          <h1 className="text-2xl font-black text-white mb-2">Avaliação já realizada</h1>
          <p className="text-slate-400">Você já completou esta avaliação de perfil comportamental. Obrigado!</p>
        </div>
      </div>
    );
  }

  const handleAnswer = (questionId: number, value: number) => {
    setAnswers(prev => ({ ...prev, [questionId]: value }));
  };

  const calculateScores = () => {
    const saboteurSums: Record<string, number[]> = {};
    QUESTIONS.forEach(q => {
      if (!saboteurSums[q.saboteur]) saboteurSums[q.saboteur] = [];
      saboteurSums[q.saboteur].push(answers[q.id] || 1);
    });
    return Object.entries(saboteurSums).map(([key, scores]) => {
      const sum = scores.reduce((a, b) => a + b, 0);
      // Normalize: 4 questions, each 1-5 → range 4-20 → normalize to 0-10
      const normalized = Math.round(((sum - 4) / 16) * 10 * 2) / 2; // round to 0.5
      return { saboteur_key: key, score: normalized };
    });
  };

  const handleSubmit = async () => {
    if (answered < shuffled.length) {
      setError('Por favor, responda todas as perguntas antes de enviar.');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const results = calculateScores();
      const res = await fetch(`/api/hiring/candidates/${candidateId}/saboteurs`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ results })
      });
      if (!res.ok) throw new Error('Erro ao salvar resultado');
      setSuccess(true);
    } catch (e: any) {
      setError(e.message || 'Erro ao enviar resultado');
    }
    setSubmitting(false);
  };

  const nextPage = () => {
    if (page < totalPages - 1) {
      setPage(p => p + 1);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };
  const prevPage = () => {
    if (page > 0) {
      setPage(p => p - 1);
      topRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  };

  // All answered on current page?
  const allCurrentAnswered = currentQuestions.every(q => answers[q.id] !== undefined);
  const isLastPage = page === totalPages - 1;

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950 flex items-center justify-center p-4">
        <div className="text-center max-w-md animate-in fade-in zoom-in-95 duration-500">
          <div className="w-20 h-20 rounded-full bg-emerald-500/20 flex items-center justify-center mx-auto mb-6">
            <CheckCircle2 className="text-emerald-400" size={40} />
          </div>
          <h1 className="text-3xl font-black text-white mb-3">Avaliação Concluída!</h1>
          <p className="text-slate-400 leading-relaxed">
            Obrigado por completar a avaliação de perfil comportamental. Seus resultados foram registrados com sucesso.
          </p>
          <div className="mt-8 inline-flex items-center gap-2 bg-violet-500/15 text-violet-400 font-bold text-sm px-5 py-2.5 rounded-full">
            <Brain size={16} /> Grape Mídia
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-900 to-violet-950">
      <div ref={topRef} />

      {/* Header */}
      <div className="sticky top-0 z-50 bg-slate-950/80 backdrop-blur-xl border-b border-white/5">
        <div className="max-w-3xl mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-600 flex items-center justify-center shadow-lg shadow-violet-500/30">
              <Brain size={20} className="text-white" />
            </div>
            <div>
              <h1 className="text-sm font-black text-white tracking-tight">Avaliação Comportamental</h1>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Grape Mídia</p>
            </div>
          </div>
          <div className="text-right">
            <span className="text-xs font-bold text-violet-400">{answered}/{shuffled.length}</span>
            <div className="w-24 h-1.5 bg-white/10 rounded-full mt-1 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-500" style={{ width: `${progress}%` }} />
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-3xl mx-auto px-4 py-8">

        {/* Intro text on first page */}
        {page === 0 && (
          <div className="mb-8 bg-white/5 border border-white/10 rounded-2xl p-6">
            <h2 className="text-lg font-black text-white mb-2">Bem-vindo à Avaliação de Perfil</h2>
            <p className="text-sm text-slate-400 leading-relaxed">
              Esta avaliação contém <strong className="text-white">{shuffled.length} afirmações</strong> sobre comportamentos do dia a dia.
              Para cada afirmação, indique o quanto ela se aplica a você. Não existem respostas certas ou erradas — seja honesto(a) e use a primeira resposta que vier à mente.
            </p>
            <p className="text-xs text-slate-500 mt-3">⏱ Tempo estimado: 5 minutos</p>
          </div>
        )}

        {/* Page indicator */}
        <div className="flex items-center gap-2 mb-6">
          {Array.from({ length: totalPages }).map((_, i) => (
            <button
              key={i}
              onClick={() => { setPage(i); topRef.current?.scrollIntoView({ behavior: 'smooth' }); }}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === page ? 'w-8 bg-violet-500' : i < page ? 'w-2 bg-violet-500/50' : 'w-2 bg-white/10'
              }`}
            />
          ))}
        </div>

        {/* Questions */}
        <div className="space-y-4">
          {currentQuestions.map((q, idx) => {
            const globalIdx = page * QUESTIONS_PER_PAGE + idx + 1;
            const selected = answers[q.id];
            return (
              <div
                key={q.id}
                className={`bg-white/5 border rounded-2xl p-5 transition-all duration-300 ${
                  selected !== undefined ? 'border-violet-500/30 bg-violet-500/5' : 'border-white/10'
                }`}
              >
                <p className="text-sm text-white font-semibold mb-4 leading-relaxed">
                  <span className="text-violet-400 font-black mr-2">{globalIdx}.</span>
                  {q.text}
                </p>
                <div className="flex flex-wrap gap-2">
                  {SCALE_LABELS.map((label, i) => {
                    const value = i + 1;
                    const isSelected = selected === value;
                    return (
                      <button
                        key={value}
                        onClick={() => handleAnswer(q.id, value)}
                        className={`flex-1 min-w-[100px] py-2.5 px-2 rounded-xl text-xs font-bold transition-all duration-200 border ${
                          isSelected
                            ? 'bg-violet-600 text-white border-violet-500 shadow-lg shadow-violet-500/20 scale-[1.02]'
                            : 'bg-white/5 text-slate-400 border-white/10 hover:bg-white/10 hover:text-white hover:border-white/20'
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        {/* Error */}
        {error && (
          <div className="mt-4 bg-rose-500/10 border border-rose-500/30 rounded-xl px-4 py-3 text-rose-400 text-sm">
            {error}
          </div>
        )}

        {/* Navigation */}
        <div className="flex items-center justify-between mt-8 pb-10">
          <button
            onClick={prevPage}
            disabled={page === 0}
            className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-slate-400 bg-white/5 border border-white/10 rounded-xl hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-all"
          >
            <ChevronLeft size={16} /> Anterior
          </button>

          {isLastPage ? (
            <button
              onClick={handleSubmit}
              disabled={submitting || answered < shuffled.length}
              className="flex items-center gap-2 px-6 py-3 text-sm font-black text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-lg shadow-violet-500/30 disabled:opacity-40 disabled:cursor-not-allowed transition-all"
            >
              {submitting ? (
                <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> Enviando...</>
              ) : (
                <><Send size={16} /> Enviar Avaliação</>
              )}
            </button>
          ) : (
            <button
              onClick={nextPage}
              className="flex items-center gap-2 px-5 py-3 text-sm font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-lg shadow-violet-500/30 transition-all"
            >
              Próximo <ChevronRight size={16} />
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
