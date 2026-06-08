import React, { useState, useEffect, useRef } from 'react';
import { ArrowRight, ArrowLeft, CheckCircle2, Palette, Check } from 'lucide-react';

/* ─── Types ─────────────────────────────────── */
interface BriefingData {
  id: number;
  title: string;
  task_id: number | null;
  task_name: string | null;
  submitted_at: string | null;
}

type FieldType = 'text' | 'tel' | 'textarea' | 'radio' | 'multi-select';

interface FormField {
  key: string;
  label: string;
  type: FieldType;
  placeholder?: string;
  required?: boolean;
  options?: string[];
  section?: string;
  sectionNumber?: string;
  condition?: { key: string; value: string };
}

/* ─── Form Definition ───────────────────────── */
const FORM_STEPS: FormField[] = [
  // Section 01
  { key: '_section_01', label: 'Informações do Cliente', type: 'text', section: '01', sectionNumber: '01' },
  { key: 'razao_social', label: 'Qual é a Razão Social?', type: 'text', placeholder: 'Razão Social da empresa', required: true },
  { key: 'nome_fantasia', label: 'Qual é o Nome Fantasia?', type: 'text', placeholder: 'Nome Fantasia', required: true },
  { key: 'endereco', label: 'Qual é o endereço?', type: 'text', placeholder: 'Endereço completo' },
  { key: 'cidade_uf', label: 'Qual Cidade e UF?', type: 'text', placeholder: 'Ex: São Paulo, SP', required: true },
  { key: 'telefone', label: 'Qual é o telefone?', type: 'tel', placeholder: '(11) 99999-9999', required: true },
  { key: 'email', label: 'Qual é o e-mail?', type: 'text', placeholder: 'email@exemplo.com', required: true },

  // Section 02
  { key: '_section_02', label: 'Informações do Projeto', type: 'text', section: '02', sectionNumber: '02' },
  { key: 'tipo_projeto', label: 'Tipo de projeto', type: 'radio', options: ['Criação de Identidade Visual', 'Redesign de Identidade Visual'], required: true },
  { key: 'possui_nome', label: 'O projeto/empresa já possui nome?', type: 'radio', options: ['Sim', 'Não'], required: true },
  { key: 'nome_projeto', label: 'Se sim, qual o nome?', type: 'text', placeholder: 'Nome do projeto/empresa', condition: { key: 'possui_nome', value: 'Sim' } },

  // Section 03
  { key: '_section_03', label: 'Itens Desejados', type: 'text', section: '03', sectionNumber: '03' },
  { key: 'itens_desejados', label: 'Selecione todos os itens que fazem parte deste projeto:', type: 'multi-select', options: ['Cartão de Visita', 'Cartão de Visita Digital Interativo', 'Assinatura de E-mail', 'Pasta A4', 'Envelope A4', 'Envelope Carta', 'Papel Timbrado', 'Logotipo', 'Paleta de Cores'], required: true },

  // Section 04
  { key: '_section_04', label: 'Características da Empresa', type: 'text', section: '04', sectionNumber: '04' },
  { key: 'areas_atuacao', label: 'Áreas de atuação do escritório (pode escolher mais de uma):', type: 'multi-select', options: ['Trabalhista', 'Família e Sucessões', 'Empresarial / Contratual', 'Criminal', 'Tributário', 'Imobiliário', 'Previdenciário', 'Direito do Consumidor', 'Outra área'], required: true },
  { key: 'publico_alvo', label: 'O escritório atende principalmente quem?', type: 'radio', options: ['Pessoas Físicas', 'Empresas (B2B)', 'Ambos'], required: true },

  // Section 05
  { key: '_section_05', label: 'Estilo do Logotipo', type: 'text', section: '05', sectionNumber: '05' },
  { key: 'formato_logo', label: 'Qual formato de logotipo prefere?', type: 'radio', options: ['Só Texto — Nome do escritório', 'Inicial + Texto — Letra / monograma', 'Símbolo + Texto — Ícone ao lado', 'Brasão / Selo — Clássico, institucional'], required: true },
  { key: 'tipografia', label: 'Qual estilo de tipografia combina com o escritório?', type: 'radio', options: ['Serifa Clássica — Tradicional, autoridade', 'Sem Serifa — Moderno, limpo', 'Caixa Alta Espaçada — Sofisticado, premium', 'Itálico / Manuscrita — Pessoal, humanizado'], required: true },
  { key: 'composicao_visual', label: 'Como deve ser a composição visual geral do logo?', type: 'radio', options: ['Minimalista — poucos elementos, limpo', 'Estruturado — organizado, profissional', 'Com detalhes — ornamentos, elementos extras'], required: true },
  { key: 'elemento_juridico', label: 'O logo deve conter algum elemento simbólico jurídico?', type: 'radio', options: ['Não, prefiro algo abstrato', 'Sim, mas de forma sutil', 'Sim, claramente jurídico', 'Indiferente'], required: true },

  // Section 06
  { key: '_section_06', label: 'Paleta de Cores', type: 'text', section: '06', sectionNumber: '06' },
  { key: 'cor_primaria', label: 'Cor Primária — Informe o código HEX, RGB ou descreva a cor desejada', type: 'text', placeholder: 'Ex: #7c3aed, azul marinho, verde esmeralda...' },
  { key: 'cor_secundaria', label: 'Cor Secundária — Informe o código HEX, RGB ou descreva a cor desejada', type: 'text', placeholder: 'Ex: #f59e0b, dourado, cinza claro...' },

  // Section 07
  { key: '_section_07', label: 'Referências para Construção', type: 'text', section: '07', sectionNumber: '07' },
  { key: 'referencia_1', label: 'Referência 1 — Nome de empresa ou marca que tem como referência', type: 'text', placeholder: 'Nome da empresa/marca' },
  { key: 'referencia_2', label: 'Referência 2 — Nome de empresa ou marca que tem como referência', type: 'text', placeholder: 'Nome da empresa/marca' },
  { key: 'referencia_3', label: 'Referência 3 — Nome de empresa ou marca que tem como referência', type: 'text', placeholder: 'Nome da empresa/marca' },

  // Section 08
  { key: '_section_08', label: 'Concorrentes', type: 'text', section: '08', sectionNumber: '08' },
  { key: 'concorrente_1_nome', label: 'Concorrente 1 — Nome', type: 'text', placeholder: 'Nome do concorrente' },
  { key: 'concorrente_1_site', label: 'Concorrente 1 — Link do site', type: 'text', placeholder: 'https://...' },
  { key: 'concorrente_1_diferencial', label: 'Concorrente 1 — Diferencial', type: 'textarea', placeholder: 'O que diferencia este concorrente?' },
  { key: 'concorrente_2_nome', label: 'Concorrente 2 — Nome', type: 'text', placeholder: 'Nome do concorrente' },
  { key: 'concorrente_2_site', label: 'Concorrente 2 — Link do site', type: 'text', placeholder: 'https://...' },
  { key: 'concorrente_2_diferencial', label: 'Concorrente 2 — Diferencial', type: 'textarea', placeholder: 'O que diferencia este concorrente?' },
];

/* ─── Component ─────────────────────────────── */
export default function BriefingForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const briefingId = urlParams.get('briefing');

  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [currentStep, setCurrentStep] = useState(-1);
  const [direction, setDirection] = useState<'next' | 'prev'>('next');
  const [animating, setAnimating] = useState(false);
  const [formData, setFormData] = useState<Record<string, string | string[]>>({});

  const inputRef = useRef<HTMLInputElement | HTMLTextAreaElement>(null);

  // Build active steps (filter conditional fields & section headers get special treatment)
  const activeSteps = React.useMemo(() => {
    return FORM_STEPS.filter(f => {
      if (f.condition) {
        return formData[f.condition.key] === f.condition.value;
      }
      return true;
    });
  }, [formData]);

  // Init form data
  useEffect(() => {
    const init: Record<string, string | string[]> = {};
    FORM_STEPS.forEach(f => {
      if (!f.key.startsWith('_section_')) {
        init[f.key] = f.type === 'multi-select' ? [] : '';
      }
    });
    setFormData(init);
  }, []);

  // Fetch briefing info
  useEffect(() => {
    if (!briefingId) { setLoading(false); return; }
    fetch(`/api/briefings/public/${briefingId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          if (data.submitted_at) {
            setError('Este briefing já foi preenchido.');
          }
          setBriefing(data);
        } else {
          setError('Briefing não encontrado.');
        }
      })
      .catch(() => setError('Erro ao conectar.'))
      .finally(() => setLoading(false));
  }, [briefingId]);

  // Focus input on step change
  useEffect(() => {
    if (currentStep >= 0) {
      setTimeout(() => inputRef.current?.focus(), 350);
    }
  }, [currentStep]);

  const currentField = currentStep >= 0 ? activeSteps[currentStep] : null;
  const totalSteps = activeSteps.length;
  const progress = currentStep >= 0 ? ((currentStep + 1) / totalSteps) * 100 : 0;
  const isSection = currentField?.key.startsWith('_section_');

  // Auto-advance section headers
  useEffect(() => {
    if (isSection && currentStep >= 0) {
      const timer = setTimeout(() => {
        if (currentStep < totalSteps - 1) goTo(currentStep + 1, 'next');
      }, 1800);
      return () => clearTimeout(timer);
    }
  }, [currentStep, isSection, totalSteps]);

  const canAdvance = () => {
    if (!currentField || isSection) return true;
    if (currentField.required) {
      const val = formData[currentField.key];
      if (Array.isArray(val)) return val.length > 0;
      return !!(val as string)?.trim();
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
    if (e.key === 'Enter' && currentField?.type !== 'textarea' && currentField?.type !== 'multi-select') {
      e.preventDefault();
      handleNext();
    }
  };

  const handleSubmit = async () => {
    if (!briefingId) return;
    setSubmitting(true);
    // Remove section keys
    const payload: Record<string, string | string[]> = {};
    for (const [k, v] of Object.entries(formData)) {
      if (!k.startsWith('_section_')) payload[k] = v;
    }
    try {
      const res = await fetch(`/api/briefings/public/${briefingId}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_data: payload }),
      });
      if (res.ok) setSuccess(true);
      else alert('Erro ao enviar. Tente novamente.');
    } catch {
      alert('Erro na conexão.');
    } finally {
      setSubmitting(false);
    }
  };

  const toggleMultiSelect = (key: string, option: string) => {
    setFormData(prev => {
      const arr = Array.isArray(prev[key]) ? [...(prev[key] as string[])] : [];
      const idx = arr.indexOf(option);
      if (idx >= 0) arr.splice(idx, 1);
      else arr.push(option);
      return { ...prev, [key]: arr };
    });
  };

  /* ─── Render States ───────────────────────── */
  if (!briefingId) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="bg-[#11111b] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center relative z-10">
          <Palette className="w-12 h-12 text-violet-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Página Inválida</h1>
          <p className="text-slate-400 text-sm">O link requer o identificador do briefing. Verifique o link recebido.</p>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center relative overflow-hidden">
        <div className="w-8 h-8 rounded-full border-2 border-violet-500/30 border-t-violet-500 animate-spin" />
      </div>
    );
  }

  if (error || !briefing) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden font-sans">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="bg-[#11111b] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center relative z-10">
          <Palette className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">{error.includes('preenchido') ? 'Briefing Já Enviado' : 'Briefing Inativo'}</h1>
          <p className="text-slate-400 text-sm">{error || 'Não foi possível encontrar o briefing.'}</p>
        </div>
      </div>
    );
  }

  if (success) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center p-6 relative overflow-hidden">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="text-center max-w-lg w-full relative z-10 font-sans">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150" />
            <CheckCircle2 className="w-20 h-20 text-emerald-400 relative" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Briefing Enviado!</h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
            Suas respostas foram registradas com sucesso.
            <br />Nossa equipe utilizará estas informações para desenvolver sua identidade visual.
          </p>
        </div>
      </div>
    );
  }

  /* ─── Welcome Screen ──────────────────────── */
  if (currentStep === -1) {
    return (
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans">
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
          <div className="h-full bg-violet-500 transition-all duration-500 ease-out" style={{ width: '0%' }} />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className="max-w-xl w-full text-center">
            {/* Branding */}
            <p className="text-xs font-bold text-violet-400 tracking-[0.3em] uppercase mb-10">
              GRAPE MÍDIA <span className="text-white/20 mx-2">|</span> Briefing Identidade Visual
            </p>

            <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-950/40 border border-violet-500/20 text-violet-400 shadow-[0_0_50px_rgba(139,92,246,0.15)] mb-8">
              <Palette className="w-6 h-6 text-violet-400" />
            </div>

            <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight max-w-xl mx-auto">
              BRIEFING
            </h1>
            <p className="text-slate-400 text-lg mt-2 font-normal">Identidade Visual</p>

            {briefing.task_name && (
              <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mt-6 mb-6">
                <Palette size={14} className="text-violet-400" />
                <span className="text-violet-300 text-xs font-semibold">{briefing.task_name}</span>
              </div>
            )}

            <div className="mt-6">
              <button
                onClick={() => goTo(0, 'next')}
                className="group bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-violet-600/20 flex items-center justify-center gap-2 mx-auto hover:scale-[1.02] active:scale-[0.98]"
              >
                Começar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            <span className="text-slate-500 text-xs mt-4 font-normal block">
              Leva aproximadamente 5 minutos
            </span>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Section Intro ───────────────────────── */
  if (isSection) {
    return (
      <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans" onClick={() => handleNext()}>
        <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
        <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

        <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
          <div className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out" style={{ width: `${progress}%` }} />
        </div>

        <div className="flex-1 flex items-center justify-center p-6 relative z-10">
          <div className={`text-center transition-all duration-300 ease-out ${animating ? 'opacity-0 translate-y-6' : 'opacity-100 translate-y-0'}`}>
            <span className="text-violet-400 font-extrabold text-sm tracking-widest uppercase mb-4 block">
              Seção {currentField!.sectionNumber}
            </span>
            <h2 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {currentField!.label}
            </h2>
            <p className="text-slate-500 text-xs mt-4">Clique ou aguarde para continuar</p>
          </div>
        </div>
      </div>
    );
  }

  /* ─── Question Screen ─────────────────────── */
  const field = currentField!;
  const value = formData[field.key];
  const stepNumber = activeSteps.slice(0, currentStep + 1).filter(s => !s.key.startsWith('_section_')).length;
  const totalQuestions = activeSteps.filter(s => !s.key.startsWith('_section_')).length;
  const isLastStep = currentStep === totalSteps - 1;

  return (
    <div className="min-h-screen bg-black flex flex-col relative overflow-hidden font-sans" onKeyDown={handleKeyDown}>
      <div className="absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/10 rounded-full blur-[120px] pointer-events-none" />

      {/* Progress bar */}
      <div className="fixed top-0 left-0 right-0 h-1 bg-white/5 z-50">
        <div
          className="h-full bg-gradient-to-r from-violet-500 to-indigo-500 transition-all duration-500 ease-out"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Nav */}
      <div className="flex items-center justify-between px-8 py-6 relative z-10">
        <button
          onClick={handlePrev}
          className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5"
        >
          <ArrowLeft size={16} /> Voltar
        </button>
        <span className="text-xs text-slate-400 font-semibold bg-white/5 px-3 py-1.5 rounded-xl border border-white/5 font-mono">
          {stepNumber} / {totalQuestions}
        </span>
      </div>

      {/* Content */}
      <div className="flex-1 flex items-center justify-center px-8 pb-20 relative z-10">
        <div
          className={`max-w-2xl w-full transition-all duration-300 ease-out ${
            animating
              ? direction === 'next' ? 'opacity-0 translate-y-6' : 'opacity-0 -translate-y-6'
              : 'opacity-100 translate-y-0'
          }`}
        >
          <div className="flex items-center gap-3 mb-6">
            <span className="text-violet-400 font-extrabold text-sm tracking-widest uppercase">Questão {stepNumber}</span>
            <ArrowRight size={14} className="text-violet-500/40" />
          </div>

          <h2 className="text-3xl sm:text-4xl font-extrabold text-white mb-8 tracking-tight leading-snug">
            {field.label}
            {field.required && <span className="text-violet-500 ml-1.5">*</span>}
          </h2>

          <div className="relative">
            {/* Radio options */}
            {field.type === 'radio' && field.options ? (
              <div className="space-y-3">
                {field.options.map((opt, i) => (
                  <button
                    key={opt}
                    onClick={() => {
                      setFormData(prev => ({ ...prev, [field.key]: opt }));
                      setTimeout(() => handleNext(), 400);
                    }}
                    className={`w-full text-left px-6 py-4 rounded-xl border text-base font-semibold transition-all duration-200 flex items-center gap-3 ${
                      value === opt
                        ? 'bg-violet-500/10 border-violet-500 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                        : 'bg-white/[0.01] border-white/10 text-slate-300 hover:bg-white/[0.03] hover:border-white/20'
                    }`}
                  >
                    <span className={`w-6 h-6 rounded-md border flex items-center justify-center text-xs font-bold shrink-0 transition-colors ${
                      value === opt ? 'border-violet-500 bg-violet-500 text-white' : 'border-white/20 text-white/40'
                    }`}>
                      {String.fromCharCode(65 + i)}
                    </span>
                    {opt}
                  </button>
                ))}
              </div>

            ) : field.type === 'multi-select' && field.options ? (
              <div className="space-y-3">
                {field.options.map(opt => {
                  const selected = Array.isArray(value) && value.includes(opt);
                  return (
                    <button
                      key={opt}
                      onClick={() => toggleMultiSelect(field.key, opt)}
                      className={`w-full text-left px-6 py-4 rounded-xl border text-base font-semibold transition-all duration-200 flex items-center gap-3 ${
                        selected
                          ? 'bg-violet-500/10 border-violet-500 text-violet-300 shadow-[0_0_20px_rgba(139,92,246,0.1)]'
                          : 'bg-white/[0.01] border-white/10 text-slate-300 hover:bg-white/[0.03] hover:border-white/20'
                      }`}
                    >
                      <span className={`w-6 h-6 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                        selected ? 'border-violet-500 bg-violet-500 text-white' : 'border-white/20'
                      }`}>
                        {selected && <Check size={14} />}
                      </span>
                      {opt}
                    </button>
                  );
                })}
                {Array.isArray(value) && value.length > 0 && (
                  <div className="text-xs text-violet-400 font-medium mt-2">
                    {value.length} {value.length === 1 ? 'item selecionado' : 'itens selecionados'}
                  </div>
                )}
              </div>

            ) : field.type === 'textarea' ? (
              <textarea
                ref={inputRef as React.RefObject<HTMLTextAreaElement>}
                value={(value as string) || ''}
                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                rows={3}
                className="w-full bg-transparent border-b border-white/10 focus:border-violet-500 text-white text-xl sm:text-2xl py-4 focus:outline-none transition-all duration-300 resize-none placeholder:text-slate-700"
              />
            ) : (
              <input
                ref={inputRef as React.RefObject<HTMLInputElement>}
                type={field.type === 'tel' ? 'tel' : 'text'}
                value={(value as string) || ''}
                onChange={e => setFormData(prev => ({ ...prev, [field.key]: e.target.value }))}
                placeholder={field.placeholder}
                className="w-full bg-transparent border-b border-white/10 focus:border-violet-500 text-white text-2xl sm:text-3xl py-4 focus:outline-none transition-all duration-300 placeholder:text-slate-700"
              />
            )}
          </div>

          {/* Next button */}
          <div className="mt-10 flex items-center gap-5">
            <button
              onClick={handleNext}
              disabled={!canAdvance() || submitting}
              className={`group px-8 py-3.5 rounded-xl font-bold text-base flex items-center gap-2 transition-all ${
                canAdvance()
                  ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-violet-600/20 hover:scale-[1.02] active:scale-[0.98]'
                  : 'bg-white/5 text-slate-500 cursor-not-allowed border border-white/5'
              }`}
            >
              {submitting ? (
                <>Enviando <div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin ml-1" /></>
              ) : isLastStep ? (
                <>Enviar Briefing <CheckCircle2 className="w-5 h-5" /></>
              ) : (
                <>OK <ArrowRight className="w-5 h-5 group-hover:translate-x-0.5 transition-transform" /></>
              )}
            </button>

            {field.type !== 'radio' && field.type !== 'multi-select' && (
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
