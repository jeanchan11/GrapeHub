import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Star } from 'lucide-react';

interface FormField {
  key: string;
  label: string;
  type: 'text' | 'textarea' | 'stars';
  placeholder?: string;
  required?: boolean;
}

const FORM_STEPS: FormField[] = [
  { key: 'grape_satisfaction', label: 'Em uma escala de 0 a 5, o quão satisfeito está com a Grape Mídia?', type: 'stars', required: true },
  { key: 'response_time_score', label: 'Qual nota que você daria ao tempo de resposta e ao atendimento prestado pela Grape?', type: 'stars', required: true },
  { key: 'project_result_score', label: 'Em uma escala de 0 a 5, qual nota você daria para o resultado do projeto?', type: 'stars', required: true },
  { key: 'paid_traffic_score', label: 'Qual nota que você daria, com relação a sua satisfação, ao Tráfego Pago do nosso projeto?', type: 'stars', required: true },
  { key: 'operations_manager_score', label: 'Com qual nota você qualifica o nosso Gerente de Operações?', type: 'stars', required: true },
  { key: 'improvements', label: 'Houve algum ponto que deixamos a desejar no nosso projeto e que gostaria que melhorássemos daqui em diante?', type: 'textarea', placeholder: 'Inserir texto' },
  { key: 'other_services', label: 'No momento atual do escritório, há algum outro serviço que gostaria que fosse realizado pela Grape?', type: 'textarea', placeholder: 'Inserir texto' }
];

export default function NpsForm({ projectId }: { projectId: string }) {
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(-1);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);
  const steps = FORM_STEPS;
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    const init: Record<string, any> = {};
    steps.forEach(f => { init[f.key] = f.type === 'stars' ? 0 : ''; });
    setFormData(init);
  }, []);

  useEffect(() => {
    if (currentStep >= 0) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [currentStep]);

  const currentField = currentStep >= 0 ? steps[currentStep] : null;
  const totalSteps = steps.length;
  const progress = currentStep >= 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const canAdvance = () => {
    if (!currentField) return true;
    if (currentField.required) {
      if (currentField.type === 'stars') {
        return typeof formData[currentField.key] === 'number' && formData[currentField.key] > 0;
      }
      return !!formData[currentField.key]?.trim();
    }
    return true;
  };

  const goTo = (step: number, dir: 'next' | 'prev') => {
    if (animating) return;
    setDirection(dir);
    setAnimating(true);
    setTimeout(() => {
      setCurrentStep(step);
      setAnimating(false);
    }, 250);
  };

  const handleNext = () => {
    if (!canAdvance()) return;
    if (currentStep < totalSteps - 1) {
      goTo(currentStep + 1, 'next');
    } else {
      handleSubmit();
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) goTo(currentStep - 1, 'prev');
    else if (currentStep === 0) goTo(-1, 'prev');
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && currentField?.type !== 'textarea') {
      e.preventDefault();
      handleNext();
    }
  };

  const handleSubmit = async () => {
    if (!projectId) return;
    setSubmitting(true);

    try {
      const payload = {
        project_id: projectId,
        grape_satisfaction: formData.grape_satisfaction,
        response_time_score: formData.response_time_score,
        project_result_score: formData.project_result_score,
        paid_traffic_score: formData.paid_traffic_score,
        operations_manager_score: formData.operations_manager_score,
        improvements: formData.improvements || '',
        other_services: formData.other_services || ''
      };

      const res = await fetch('/api/nps/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) setSuccess(true);
      else alert('Erro ao enviar. Tente novamente.');
    } catch {
      alert('Erro na conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!projectId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="bg-dark-card border border-white/10 rounded-2xl p-10 max-w-md w-full text-center relative z-10">
          <h1 className="text-xl font-bold text-white mb-2">Página Inválida</h1>
          <p className="text-slate-400 text-sm">O link requer o identificador do projeto. Verifique o link recebido.</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans">
        {/* Same dramatic glows */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-violet-700/25 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Top logo */}
        <div className="flex justify-center items-center gap-2 pt-8 relative z-10">
          <img src="/logobranca.png" alt="Grape" className="h-7 w-7 object-contain" />
          <span className="text-white font-black text-xl tracking-widest uppercase">Grape</span>
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="text-center max-w-lg w-full flex flex-col items-center gap-6">
            <div className="relative inline-block">
              <div className="absolute inset-0 bg-emerald-500/30 rounded-full blur-3xl scale-150" />
              <div className="w-20 h-20 rounded-2xl bg-emerald-900/40 border border-emerald-700/40 flex items-center justify-center shadow-[0_0_40px_rgba(16,185,129,0.3)] relative">
                <CheckCircle2 className="w-10 h-10 text-emerald-400" />
              </div>
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Obrigado pela sua avaliação!</h1>
            <p className="text-slate-400 text-base leading-relaxed max-w-sm text-center">
              Agradecemos por despender o seu bem mais precioso (seu tempo) para preencher esse formulário.<br />
              <span className="text-slate-300 font-semibold">Seu resultado é o nosso compromisso 🍇</span>
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (currentStep === -1) {
    return (
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans">
        {/* Dramatic purple glows like reference */}
        <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-violet-700/30 rounded-full blur-[140px] pointer-events-none" />
        <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none" />

        {/* Top logo */}
        <div className="flex justify-center items-center gap-2 pt-8 relative z-10">
          <img src="/logobranca.png" alt="Grape" className="h-7 w-7 object-contain" />
          <span className="text-white font-black text-xl tracking-widest uppercase">Grape</span>
        </div>

        {/* Center content */}
        <div className="flex-1 flex items-center justify-center px-6 relative z-10">
          <div className="max-w-lg w-full text-center flex flex-col items-center gap-6">

            {/* Icon in dark rounded square */}
            <div className="w-16 h-16 rounded-2xl bg-violet-900/60 border border-violet-700/40 flex items-center justify-center shadow-[0_0_40px_rgba(109,40,217,0.3)]">
              <img src="/logobranca.png" alt="" className="h-8 w-8 object-contain opacity-90" />
            </div>

            {/* Title */}
            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">
              Pesquisa de qualidade
            </h1>

            {/* Description */}
            <div className="space-y-3 max-w-sm mx-auto">
              <p className="text-slate-400 text-sm sm:text-base leading-relaxed text-center">
                Caro parceiro de negócios, é muito importante o preenchimento desse formulário para entendermos como continuaremos prestando a nossa assessoria da melhor forma a vocês e continuarmos evoluindo a cada dia.
              </p>
              <p className="text-slate-300 text-sm font-semibold tracking-wide text-center uppercase">
                Seu resultado é o nosso compromisso 🍇
              </p>
            </div>

            {/* CTA Button */}
            <button
              onClick={() => goTo(0, 'next')}
              className="group bg-violet-600 hover:bg-violet-500 text-white font-bold px-10 py-4 rounded-2xl transition-all shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] flex items-center gap-3 hover:scale-[1.03] active:scale-[0.97] text-base"
            >
              Começar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>

            <span className="text-slate-600 text-xs font-normal">
              Leva aproximadamente 2 minutos
            </span>
          </div>
        </div>
      </div>
    );
  }

  const stepNumber = currentStep + 1;
  const isLastStep = currentStep === totalSteps - 1;
  const field = steps[currentStep];
  const value = formData[field.key];

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans" onKeyDown={handleKeyDown}>
      {/* Dramatic purple glows */}
      <div className="absolute -top-32 -left-32 w-[500px] h-[500px] bg-violet-700/25 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute -bottom-32 -right-32 w-[400px] h-[400px] bg-violet-900/20 rounded-full blur-[120px] pointer-events-none" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Header */}
      <div className="flex items-center justify-between px-8 py-5 relative z-10">
        <button
          onClick={handlePrev}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <div className="flex items-center gap-2">
          <img src="/logobranca.png" alt="Grape" className="h-6 w-6 object-contain" />
          <span className="text-white font-black text-sm tracking-widest uppercase">Grape</span>
        </div>
        <span className="text-xs text-slate-500 font-mono bg-white/5 px-3 py-1.5 rounded-xl border border-white/5">
          {stepNumber} / {totalSteps}
        </span>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 pb-20 relative z-10">
        <div
          className={`max-w-2xl w-full transition-all duration-300 ease-out ${
            animating
              ? direction === 'next'
                ? 'opacity-0 translate-y-6'
                : 'opacity-0 -translate-y-6'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex items-center gap-3 mb-6 justify-center">
            <span className="text-violet-400 font-extrabold text-sm tracking-widest uppercase">Pergunta {stepNumber}</span>
            <ArrowRight size={14} className="text-violet-500/40" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 tracking-tight leading-snug text-center">
            {field.label}
            {field.required && <span className="text-violet-500 ml-1.5">*</span>}
          </h2>

          <div className="relative flex flex-col items-center">
            {field.type === 'stars' ? (
              <div className="flex items-center gap-3 mt-4">
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, [field.key]: star }));
                      setTimeout(() => handleNext(), 500);
                    }}
                    className={`p-2.5 rounded-xl transition-all duration-300 hover:scale-110 ${
                      value >= star 
                        ? 'bg-violet-500 text-white shadow-[0_0_20px_rgba(139,92,246,0.3)]' 
                        : 'bg-white/5 text-slate-600 hover:bg-white/10 hover:text-slate-400 border border-white/5'
                    }`}
                  >
                    <Star className={`w-6 h-6 ${value >= star ? 'fill-current' : ''}`} strokeWidth={value >= star ? 0 : 1.5} />
                  </button>
                ))}
              </div>
            ) : field.type === 'textarea' ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={value || ''}
                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={4}
                className="w-full bg-transparent border-b border-white/10 focus:border-violet-500 text-white text-xl sm:text-2xl py-4 focus:outline-none transition-all duration-300 resize-none placeholder:text-slate-700"
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={field.type}
                value={value || ''}
                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full bg-transparent border-b border-white/10 focus:border-violet-500 text-white text-2xl sm:text-3xl py-4 focus:outline-none transition-all duration-300 placeholder:text-slate-700"
              />
            )}
          </div>

          <div className="mt-12 flex items-center justify-center gap-5">
            <button
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className={`group px-10 py-4 rounded-2xl font-bold text-base flex items-center gap-2 transition-all ${
                canAdvance()
                  ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_0_30px_rgba(139,92,246,0.4)] hover:shadow-[0_0_40px_rgba(139,92,246,0.5)] hover:scale-[1.03] active:scale-[0.97]'
                  : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {submitting ? (
                <>Enviando <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin ml-1" /></>
              ) : isLastStep ? (
                <>Finalizar Avaliação <CheckCircle2 className="w-5 h-5" /></>
              ) : (
                <>OK <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>

            {field.type !== 'stars' && (
              <span className="text-xs text-slate-600 font-medium">
                pressione <kbd className="px-2 py-1 bg-white/5 border border-white/5 rounded text-slate-500 font-mono text-[10px] uppercase shadow-sm">Enter ↵</kbd>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
