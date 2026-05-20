import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Briefcase, Upload, File } from 'lucide-react';

interface FormField {
  key: string;
  label: string;
  type: 'text' | 'number' | 'textarea' | 'select' | 'tel' | 'date' | 'file';
  placeholder?: string;
  required?: boolean;
  options?: string[];
  accept?: string;
}

const FORM_STEPS: FormField[] = [
  { key: 'nome', label: 'Qual é o seu nome completo?', type: 'text', placeholder: 'Digite seu nome completo', required: true },
  { key: 'idade', label: 'Qual é a sua idade?', type: 'number', placeholder: 'Ex: 25', required: true },
  { key: 'data_nascimento', label: 'Qual é a sua data de nascimento?', type: 'date', required: true },
  { key: 'endereco_cnpj', label: 'Endereço Completo - Cartão CNPJ', type: 'textarea', placeholder: 'Rua, Número, Bairro, Cidade - Estado, CEP', required: true },
  { key: 'endereco_pf', label: 'Endereço Completo - Residência Pessoa Física', type: 'textarea', placeholder: 'Rua, Número, Bairro, Cidade - Estado, CEP', required: true },
  { key: 'telefone_profissional', label: 'Telefone - Profissional', type: 'tel', placeholder: '(11) 99999-9999', required: true },
  { key: 'telefone_pessoal', label: 'Telefone - Pessoal', type: 'tel', placeholder: '(11) 99999-9999', required: true },
  { key: 'emergencia_1', label: 'Contato de Emergência #1 (Nome + Telefone)', type: 'text', placeholder: 'Ex: Maria (Mãe) - (11) 99999-9999', required: true },
  { key: 'emergencia_2', label: 'Contato de Emergência #2 (Nome + Telefone)', type: 'text', placeholder: 'Ex: João (Irmão) - (11) 99999-9999' },
  { key: 'chave_pix', label: 'Chave PIX do CNPJ', type: 'text', placeholder: 'CNPJ, E-mail ou Telefone', required: true },
  { key: 'cartao_cnpj', label: 'Anexar Cartão CNPJ', type: 'file', accept: '.pdf,.png,.jpg,.jpeg', required: true },
  { key: 'documento_rg', label: 'Anexar CNH ou RG do Titular da Empresa', type: 'file', accept: '.pdf,.png,.jpg,.jpeg', required: true },
];

export default function CollaboratorOnboardingForm() {
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [currentStep, setCurrentStep] = useState(-1);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>(null);

  const steps = FORM_STEPS;
  const [formData, setFormData] = useState<Record<string, any>>({});

  useEffect(() => {
    if (currentStep >= 0 && steps[currentStep].type !== 'file') {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [currentStep, steps]);

  const currentField = currentStep >= 0 ? steps[currentStep] : null;
  const totalSteps = steps.length;
  const progress = currentStep >= 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;

  const canAdvance = () => {
    if (!currentField) return true;
    const val = formData[currentField.key];
    if (currentField.required && (!val || (typeof val === 'string' && !val.trim()))) return false;
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

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, key: string) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      setFormData(prev => ({
        ...prev,
        [key]: {
          name: file.name,
          type: file.type,
          data: base64
        }
      }));
    };
    reader.readAsDataURL(file);
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    const payload = { ...formData };
    const nome = payload.nome;

    try {
      const res = await fetch('/api/public/collaborators', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: nome,
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

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="text-center max-w-lg w-full relative z-10">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150" />
            <CheckCircle2 className="w-20 h-20 text-emerald-400 relative" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Informações Enviadas!</h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
            Seus dados foram registrados com sucesso no sistema da Grape Mídia.
            <br />Seja muito bem-vindo(a) ao time!
          </p>
        </div>
      </div>
    );
  }

  if (currentStep === -1) {
    return (
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans">
        {/* Glow Effects */}
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
          <div className="h-full bg-violet-500 transition-all duration-500 ease-out" style={{ width: '0%' }} />
        </div>
        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="max-w-xl w-full text-center">
            {/* Layers Icon Frame */}
            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-950/40 border border-violet-500/20 text-violet-400 shadow-[0_0_50px_rgba(139,92,246,0.15)] mb-8">
              <Briefcase className="w-6 h-6 text-violet-400" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-xl mx-auto">
              Onboarding de Colaboradores
            </h1>
            <p className="text-slate-400 text-sm sm:text-base max-w-md mx-auto mt-4 font-normal leading-relaxed">
              Precisamos de algumas informações essenciais para finalizar a sua integração com o time Grape Mídia.
            </p>
            <div>
              <button onClick={() => goTo(0, 'next')} className="group bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-violet-600/20 flex items-center justify-center gap-2 mx-auto mt-8 hover:scale-[1.02] active:scale-[0.98]">
                Começar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>
            <span className="text-slate-500 text-xs mt-4 font-normal block">
              Leva aproximadamente 4 minutos
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
      {/* Glow Effects */}
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
      </div>
      
      <div className="flex items-center justify-between px-8 py-6 relative z-10">
        <button onClick={handlePrev} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5">
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-xs text-slate-400 font-semibold bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 font-mono">{stepNumber} / {totalSteps}</span>
      </div>

      <div className="flex-1 flex items-center justify-center px-8 pb-20 relative z-10">
        <div className={`max-w-2xl w-full transition-all duration-300 ease-out ${animating ? (direction === 'next' ? 'opacity-0 translate-y-6' : 'opacity-0 -translate-y-6') : 'opacity-100 translate-y-0'}`}>
          <div className="flex items-center gap-3 mb-6">
            <span className="text-violet-400 font-extrabold text-sm tracking-widest uppercase">Passo {stepNumber}</span>
            <ArrowRight size={14} className="text-violet-500/40" />
          </div>
          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 tracking-tight leading-snug">
            {field.label}
            {field.required && <span className="text-violet-500 ml-1.5">*</span>}
          </h2>

          <div className="relative">
            {field.type === 'file' ? (
              <div className="space-y-4">
                <label className="flex flex-col items-center justify-center w-full h-44 bg-white/[0.01] hover:bg-white/[0.03] border border-dashed border-white/10 hover:border-violet-500/50 rounded-2xl cursor-pointer transition-all group relative overflow-hidden">
                  <input type="file" className="hidden" accept={field.accept} onChange={(e) => handleFileUpload(e, field.key)} />
                  <div className="flex flex-col items-center justify-center pt-5 pb-6 text-center px-4">
                    <Upload className="w-10 h-10 text-slate-500 group-hover:text-violet-400 mb-4 transition-colors" />
                    <p className="mb-1 text-base text-slate-400"><span className="font-semibold text-white">Clique para fazer upload</span> ou arraste</p>
                    <p className="text-xs text-slate-500">Arquivos aceitos: {field.accept}</p>
                  </div>
                </label>
                {value && value.name && (
                  <div className="flex items-center gap-3 p-4 bg-violet-500/5 border border-violet-500/10 rounded-xl text-violet-300">
                    <File className="w-6 h-6 text-violet-400 shrink-0" />
                    <span className="text-sm font-medium truncate">{value.name}</span>
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 ml-auto shrink-0" />
                  </div>
                )}
              </div>
            ) : field.type === 'textarea' ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={value || ''}
                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={3}
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

          <div className="mt-10 flex items-center gap-5">
            <button
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className={`group px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all ${canAdvance() ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-violet-600/20 hover:scale-[1.02] active:scale-[0.98]' : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'}`}
            >
              {submitting ? (
                <>Enviando <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin ml-1" /></>
              ) : isLastStep ? (
                <>Enviar <CheckCircle2 className="w-5 h-5" /></>
              ) : (
                <>OK <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>
            {field.type !== 'file' && field.type !== 'select' && (
              <span className="text-xs text-slate-500 font-medium">
                pressione <kbd className="px-2 py-1 bg-white/5 border border-white/5 rounded text-slate-400 font-mono text-[10px] uppercase shadow-sm">Enter ↵</kbd>
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

