import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Briefcase, ChevronDown } from 'lucide-react';

interface FolderData {
  id: number;
  nome: string;
  cargo: string | null;
  form_fields?: FormField[] | null;
}

interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'tel';
  placeholder?: string;
  required?: boolean;
  options?: string[];
}

const FORM_STEPS: FormField[] = [
  { key: 'nome', label: 'Qual é o seu nome completo?', type: 'text', placeholder: 'Digite seu nome completo', required: true },
  { key: 'idade', label: 'Qual é a sua idade?', type: 'number', placeholder: 'Ex: 25', required: true },
  { key: 'telefone', label: 'Qual é o seu telefone com DDD?', type: 'tel', placeholder: '(11) 99999-9999', required: true },
  { key: 'whatsapp', label: 'Qual é o seu WhatsApp?', type: 'tel', placeholder: '(11) 99999-9999', required: true },
  { key: 'cidade_estado', label: 'Qual é a sua CIDADE e ESTADO?', type: 'text', placeholder: 'Ex: São Paulo, SP', required: true },
  { key: 'estado_civil', label: 'Qual seu estado civil? Conte mais sobre você (família, etc)', type: 'textarea', placeholder: 'Ex: Solteiro, moro independente...' },
  { key: 'social_media', label: 'Qual seu Instagram (@) e LinkedIn (link)?', type: 'text', placeholder: '@seuinsta / linkedin.com/in/...' },
  { key: 'tempo_experiencia', label: 'Quanto tempo de experiência e quantos projetos ao todo?', type: 'textarea', placeholder: 'Ex: 2 anos de experiência, já atuei em 15 projetos...', required: true },
  { key: 'projetos_atuais', label: 'Quantos projetos você está atendendo atualmente?', type: 'text', placeholder: 'Ex: Estou com 4 clientes ativos', required: true },
  { key: 'exp_agencia', label: 'Já trabalhou em Agência? Conte sobre a experiência.', type: 'textarea', placeholder: 'Descreva sua experiência em agências...' },
  { key: 'facebook_ads', label: 'Qual o seu nível de prática no Facebook Ads?', type: 'select', options: ['Iniciante', 'Intermediário', 'Avançado'], required: true },
  { key: 'google_ads', label: 'Qual o seu nível de prática no Google Ads?', type: 'select', options: ['Iniciante', 'Intermediário', 'Avançado'], required: true },
  { key: 'frentes_dominantes', label: 'Quais frentes de tráfego você mais domina?', type: 'text', placeholder: 'Lançamentos, Negócios Locais, E-commerce...', required: true },
  { key: 'pretensao_salarial', label: 'Qual é a sua pretensão salarial inicial?', type: 'text', placeholder: 'R$ 0.000,00', required: true },
  { key: 'salario_faz_sentido', label: 'Nosso valor da vaga faz sentido para você?', type: 'select', options: ['Sim, com certeza', 'Não', 'Tenho flexibilidade'], required: true },
  { key: 'treinamentos', label: 'Quais cursos e treinamentos você já fez? (Eric, etc.)', type: 'textarea', placeholder: 'Descreva os treinamentos já realizados...' },
  { key: 'disposicao_fulltime', label: 'Você tem disponibilidade full-time, contato com gerência e reuniões?', type: 'text', placeholder: 'Sim/Não, detalhe brevemente...', required: true },
  { key: 'motivo_contratar', label: 'Por que devemos te contratar? Qual o seu diferencial?', type: 'textarea', placeholder: 'Use este espaço para se vender. Mostre seu diferencial!', required: true },
  { key: 'canal_vaga', label: 'Por qual canal você encontrou esta vaga?', type: 'text', placeholder: 'Ex: Infojobs, Telegram, Indicação...' },
];

export default function CandidateApplicationForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const folderId = urlParams.get('apply');

  const [folder, setFolder] = useState<FolderData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(-1); // -1 = intro screen
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  // Dynamic steps: use folder's custom fields or fall back to default
  const steps = React.useMemo(() => {
    if (folder?.form_fields && folder.form_fields.length > 0) return folder.form_fields;
    return FORM_STEPS;
  }, [folder]);

  const [formData, setFormData] = useState<Record<string, string>>({});

  // Re-initialize formData when steps change
  React.useEffect(() => {
    const init: Record<string, string> = {};
    steps.forEach(f => { init[f.key] = ''; });
    setFormData(init);
  }, [steps]);

  useEffect(() => {
    if (!folderId) { setLoading(false); return; }
    fetch(`/api/hiring/public/folders/${folderId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) setFolder(data); else setError('Vaga não encontrada.'); })
      .catch(() => setError('Erro ao conectar.'))
      .finally(() => setLoading(false));
  }, [folderId]);

  // Auto-focus input on step change
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
    if (currentField.required && !formData[currentField.key]?.trim()) return false;
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
    if (!folderId) return;
    setSubmitting(true);

    const payload = { ...formData };
    const nome = payload.nome;
    const contato = payload.whatsapp;
    delete payload.nome;
    delete payload.whatsapp;

    try {
      const res = await fetch('/api/hiring/public/apply', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          folder_id: parseInt(folderId),
          nome,
          contato,
          form_data: payload
        })
      });
      if (res.ok) setSuccess(true);
      else alert('Erro ao enviar. Tente novamente.');
    } catch {
      alert('Erro na conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  // ── Error / Invalid States ──
  if (!folderId) {
    return (
      <div className="min-h-screen bg-[#0d0d15] flex items-center justify-center p-6">
        <div className="bg-[#16162a] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
          <Briefcase className="w-12 h-12 text-violet-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Página Inválida</h1>
          <p className="text-slate-400 text-sm">O link requer o identificador da vaga. Verifique o link recebido.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0d0d15] flex items-center justify-center">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  if (error || !folder) {
    return (
      <div className="min-h-screen bg-[#0d0d15] flex items-center justify-center p-6">
        <div className="bg-[#16162a] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
          <Briefcase className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Vaga Inativa</h1>
          <p className="text-slate-400 text-sm">{error || 'Não foi possível encontrar a vaga.'}</p>
        </div>
      </div>
    );
  }

  // ── Success Screen ──
  if (success) {
    return (
      <div className="min-h-screen bg-[#0d0d15] flex items-center justify-center p-6">
        <div className="text-center max-w-lg w-full">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150" />
            <CheckCircle2 className="w-20 h-20 text-emerald-400 relative" />
          </div>
          <h1 className="text-3xl font-extrabold text-white mb-4">Inscrição Enviada!</h1>
          <p className="text-slate-400 text-lg leading-relaxed">
            Seus dados foram registrados no processo seletivo para{' '}
            <span className="text-white font-semibold">{folder.nome}</span>.
            <br />Nossa equipe entrará em contato em breve!
          </p>
        </div>
      </div>
    );
  }

  // ── Intro Screen (step = -1) ──
  if (currentStep === -1) {
    return (
      <div className="min-h-screen bg-[#0d0d15] flex flex-col">
        {/* Progress bar */}
        <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
          <div className="h-full bg-violet-500 transition-all duration-500 ease-out" style={{ width: '0%' }} />
        </div>

        <div className="flex-1 flex items-center justify-center p-6">
          <div className="max-w-xl w-full text-center">
            {/* Logo */}
            <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 shadow-[0_0_60px_rgba(124,58,237,0.3)] mb-10">
              <img src="/logobranca.png" alt="Grape Mídia" className="w-10 h-10 object-contain" referrerPolicy="no-referrer" />
            </div>

            <h1 className="text-3xl sm:text-5xl font-extrabold text-white mb-4 tracking-tight leading-tight">
              Formulário de{' '}
              <span className="bg-gradient-to-r from-violet-400 to-indigo-400 bg-clip-text text-transparent">Inscrição</span>
            </h1>

            <p className="text-slate-400 text-lg mb-2">
              Você está se candidatando para:
            </p>
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mb-10">
              <Briefcase size={16} className="text-violet-400" />
              <span className="text-violet-300 font-semibold">{folder.cargo || folder.nome}</span>
            </div>

            <div>
              <button
                onClick={() => goTo(0, 'next')}
                className="group px-10 py-4 bg-violet-600 hover:bg-violet-500 text-white font-bold text-lg rounded-xl transition-all shadow-[0_4px_30px_rgba(124,58,237,0.4)] hover:shadow-[0_4px_40px_rgba(124,58,237,0.6)] hover:scale-[1.02] active:scale-[0.98]"
              >
                Começar <ArrowRight className="inline ml-2 w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <p className="text-slate-600 text-sm mt-8">
              ⏱ Leva aproximadamente 3 minutos
            </p>
          </div>
        </div>
      </div>
    );
  }

  // ── Question Steps ──
  const stepNumber = currentStep + 1;
  const isLastStep = currentStep === totalSteps - 1;
  const field = steps[currentStep];
  const value = formData[field.key];

  return (
    <div className="min-h-screen bg-[#0d0d15] flex flex-col" onKeyDown={handleKeyDown}>
      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Top nav */}
      <div className="flex items-center justify-between px-6 py-4 relative z-10">
        <button
          onClick={handlePrev}
          className="flex items-center gap-1 text-sm text-slate-500 hover:text-white transition-colors"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-xs text-slate-600 font-mono">
          {stepNumber} / {totalSteps}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-6 pb-16">
        <div
          className={`max-w-2xl w-full transition-all duration-300 ease-out ${
            animating
              ? direction === 'next'
                ? 'opacity-0 translate-y-6'
                : 'opacity-0 -translate-y-6'
              : 'opacity-100 translate-y-0'
          }`}
        >
          {/* Counter */}
          <div className="flex items-center gap-3 mb-6">
            <span className="text-violet-500 font-bold text-sm">{stepNumber}</span>
            <ArrowRight size={14} className="text-violet-500/50" />
          </div>

          {/* Question Label */}
          <h2 className="text-2xl sm:text-3xl font-bold text-white mb-8 leading-snug">
            {field.label}
            {field.required && <span className="text-violet-500 ml-1">*</span>}
          </h2>

          {/* Input */}
          {field.type === 'select' && field.options ? (
            <div className="space-y-3">
              {field.options.map(opt => (
                <button
                  key={opt}
                  onClick={() => {
                    setFormData(prev => ({ ...prev, [field.key]: opt }));
                    // Auto-advance after selection
                    setTimeout(() => handleNext(), 400);
                  }}
                  className={`w-full text-left px-6 py-4 rounded-xl border text-base font-medium transition-all duration-200 flex items-center gap-3 ${
                    value === opt
                      ? 'bg-violet-500/15 border-violet-500 text-violet-300'
                      : 'bg-white/[0.03] border-white/10 text-slate-300 hover:bg-white/[0.06] hover:border-white/20'
                  }`}
                >
                  <span className={`w-6 h-6 rounded-md border-2 flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                    value === opt ? 'border-violet-500 bg-violet-500 text-white' : 'border-white/20 text-white/40'
                  }`}>
                    {String.fromCharCode(65 + field.options!.indexOf(opt))}
                  </span>
                  {opt}
                </button>
              ))}
            </div>
          ) : field.type === 'textarea' ? (
            <textarea
              ref={inputRef as React.RefObject<HTMLTextAreaElement>}
              value={value}
              onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              rows={4}
              className="w-full bg-transparent border-b-2 border-white/20 focus:border-violet-500 text-white text-xl placeholder:text-slate-600 py-3 px-1 resize-none focus:outline-none transition-colors"
            />
          ) : (
            <input
              ref={inputRef as React.RefObject<HTMLInputElement>}
              type={field.type}
              value={value}
              onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
              placeholder={field.placeholder}
              className="w-full bg-transparent border-b-2 border-white/20 focus:border-violet-500 text-white text-xl sm:text-2xl placeholder:text-slate-600 py-3 px-1 focus:outline-none transition-colors"
            />
          )}

          {/* Action Button */}
          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className={`group px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all ${
                canAdvance()
                  ? 'bg-violet-600 hover:bg-violet-500 text-white shadow-[0_4px_20px_rgba(124,58,237,0.3)] hover:shadow-[0_4px_30px_rgba(124,58,237,0.5)] hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white/5 text-slate-600 cursor-not-allowed'
              }`}
            >
              {submitting ? (
                <>Enviando <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin ml-1" /></>
              ) : isLastStep ? (
                <>Enviar Inscrição <CheckCircle2 className="w-5 h-5" /></>
              ) : (
                <>OK <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>

            {field.type !== 'select' && (
              <span className="text-xs text-slate-600">
                Pressione <kbd className="px-1.5 py-0.5 bg-white/10 rounded text-slate-400 font-mono text-[10px]">Enter ↵</kbd>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
