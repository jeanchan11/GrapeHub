import React, { useState, useEffect } from 'react';
import {
  ArrowRight, ArrowLeft, CheckCircle2, Palette, Check,
  Factory, UsersRound, Briefcase, Scale, Receipt, Building2, ShieldCheck, UserCheck, MoreHorizontal,
  Sparkles, RefreshCw, BadgeCheck, HelpCircle,
  Pen, CreditCard, Smartphone, Mail, Folder, Package, MailOpen, FileText,
  User, Users, Building,
  Type, Signature, ImageIcon, Award,
  Minus, LayoutGrid, Gem,
  Shapes, Gavel, CircleDashed,
  Link, Ban, Globe, Phone, MapPin, AtSign, BookOpen, MessageSquare,
} from 'lucide-react';
import LoadingSpinner from '../components/LoadingSpinner';

/* ─── Types ─────────────────────────────────── */
interface BriefingData {
  id: number; title: string; task_id: number | null; task_name: string | null; submitted_at: string | null;
}

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8 | 9 | 10;

interface FormData {
  razao_social: string; nome_fantasia: string; cidade_uf: string; telefone: string; email: string;
  tipo_projeto: string; possui_nome: string; nome_escritorio: string;
  itens_projeto: string[];
  areas_atuacao: string[]; area_outra: string; publico_alvo: string;
  formato_logo: string; tipografia: string;
  composicao_visual: string; elemento_juridico: string;
  tom_marca: string; cor_primaria: string; cor_secundaria: string;
  referencia_1: string; referencia_2: string; referencia_3: string; o_que_evitar: string;
  concorrente_1_nome: string; concorrente_1_site: string;
  concorrente_2_nome: string; concorrente_2_site: string;
  observacoes: string;
}

const INITIAL: FormData = {
  razao_social: '', nome_fantasia: '', cidade_uf: '', telefone: '', email: '',
  tipo_projeto: '', possui_nome: '', nome_escritorio: '',
  itens_projeto: [],
  areas_atuacao: [], area_outra: '', publico_alvo: '',
  formato_logo: '', tipografia: '',
  composicao_visual: '', elemento_juridico: '',
  tom_marca: '', cor_primaria: '', cor_secundaria: '',
  referencia_1: '', referencia_2: '', referencia_3: '', o_que_evitar: '',
  concorrente_1_nome: '', concorrente_1_site: '', concorrente_2_nome: '', concorrente_2_site: '',
  observacoes: '',
};

const TOTAL_STEPS = 10;

const TOM_OPTIONS = [
  { id: 'azul_marinho',  label: 'Azul-marinho',  hex: '#1B2A4A' },
  { id: 'verde_sobrio',  label: 'Verde sóbrio',   hex: '#14533C' },
  { id: 'vinho',         label: 'Vinho / bordô',  hex: '#5C1A2B' },
  { id: 'dourado',       label: 'Dourado / bege', hex: '#9A7B33' },
  { id: 'preto_branco',  label: 'Preto & branco', hex: '#1A1A1A' },
  { id: 'cinza_grafite', label: 'Cinza grafite',  hex: '#4A4A4A' },
];

const BG = 'min-h-screen bg-[#09090f] flex flex-col relative overflow-hidden font-sans';
const GLOW_L = 'absolute top-1/4 -left-48 w-96 h-96 bg-violet-600/8 rounded-full blur-[120px] pointer-events-none';
const GLOW_R = 'absolute bottom-1/4 -right-48 w-96 h-96 bg-fuchsia-600/8 rounded-full blur-[120px] pointer-events-none';

/* ─── UI Atoms ─── */
function ProgressBar({ step }: { step: number }) {
  return (
    <div className="fixed top-0 left-0 right-0 z-50">
      <div className="h-[3px] bg-white/5">
        <div className="h-full bg-gradient-to-r from-violet-500 to-purple-400 transition-all duration-500 ease-out"
          style={{ width: `${(step / TOTAL_STEPS) * 100}%` }} />
      </div>
      {step > 0 && (
        <div className="absolute right-4 top-3 text-[10px] font-bold text-slate-500 tracking-widest uppercase font-mono">
          Etapa {step} de {TOTAL_STEPS}
        </div>
      )}
    </div>
  );
}

function NavBar({ onBack, onNext, canNext, isLast, submitting }: {
  onBack: () => void; onNext: () => void; canNext: boolean; isLast: boolean; submitting: boolean;
}) {
  return (
    <div className="flex items-center justify-between px-6 py-5 relative z-10 mt-8">
      <button onClick={onBack} className="flex items-center gap-2 text-sm text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl border border-white/5">
        <ArrowLeft size={15} /> Voltar
      </button>
      <button onClick={onNext} disabled={!canNext || submitting}
        className={`flex items-center gap-2 px-6 py-2.5 rounded-xl font-bold text-sm transition-all ${canNext ? 'bg-violet-600 hover:bg-violet-700 text-white shadow-lg hover:shadow-violet-600/20 hover:scale-[1.02] active:scale-[0.98]' : 'bg-white/5 text-slate-600 cursor-not-allowed border border-white/5'}`}>
        {submitting
          ? <><span>Enviando</span><div className="w-4 h-4 rounded-full border-2 border-white/30 border-t-white animate-spin" /></>
          : isLast ? <><span>Enviar Briefing</span><CheckCircle2 size={16} /></>
          : <><span>Próximo</span><ArrowRight size={15} /></>}
      </button>
    </div>
  );
}

function StepTitle({ number, title, subtitle }: { number: number; title: string; subtitle?: string }) {
  return (
    <div className="mb-8">
      <span className="text-[10px] font-black text-violet-500 tracking-[0.3em] uppercase block mb-2">Etapa {number} de {TOTAL_STEPS}</span>
      <h2 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight leading-snug">{title}</h2>
      {subtitle && <p className="text-slate-500 text-sm mt-2">{subtitle}</p>}
    </div>
  );
}

function TextField({ label, value, onChange, placeholder, type = 'text', required, icon }: {
  label: string; value: string; onChange: (v: string) => void;
  placeholder?: string; type?: string; required?: boolean; icon?: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
        {icon && <span className="text-slate-500">{icon}</span>}
        {label}{required && <span className="text-violet-500 ml-0.5">*</span>}
      </label>
      <input type={type} value={value} onChange={e => onChange(e.target.value)} placeholder={placeholder}
        className="w-full bg-white/[0.03] border border-white/10 focus:border-violet-500/60 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 outline-none transition-all" />
    </div>
  );
}

function IconCard({ icon, label, sub, selected, onClick }: {
  icon: React.ReactNode; label: string; sub?: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 flex items-center gap-3 ${selected ? 'bg-violet-500/10 border-violet-500 shadow-[0_0_20px_rgba(139,92,246,0.08)]' : 'bg-white/[0.05] border-transparent hover:bg-white/[0.08]'}`}>
      <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 transition-all ${selected ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-slate-500'}`}>
        {icon}
      </div>
      <div className="flex-1 min-w-0">
        <div className={`font-semibold text-sm ${selected ? 'text-violet-200' : 'text-slate-300'}`}>{label}</div>
        {sub && <div className="text-xs text-slate-500 mt-0.5">{sub}</div>}
      </div>
      {selected && <Check size={14} className="text-violet-400 shrink-0" />}
    </button>
  );
}

function IconPill({ icon, label, selected, onClick }: {
  icon: React.ReactNode; label: string; selected: boolean; onClick: () => void;
}) {
  return (
    <button onClick={onClick}
      className={`flex items-center gap-2 px-4 py-2.5 rounded-xl border font-semibold text-sm transition-all duration-200 ${selected ? 'bg-violet-500/15 border-violet-500 text-violet-200 shadow-[0_0_16px_rgba(139,92,246,0.1)]' : 'bg-white/[0.05] border-transparent text-slate-400 hover:bg-white/[0.08]'}`}>
      <span className={selected ? 'text-violet-400' : 'text-slate-500'}>{icon}</span>
      {label}
      {selected && <Check size={12} className="text-violet-400 shrink-0" />}
    </button>
  );
}

/* ─── STEP 1 — Dados do cliente ─── */
function Step1({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <StepTitle number={1} title="Informações do cliente" subtitle="Preencha os dados do escritório." />
      <div className="space-y-4">
        <TextField label="Razão social"  icon={<Building size={12} />}  value={data.razao_social}  onChange={v => onChange('razao_social', v)}  placeholder="Razão Social (opcional)" />
        <TextField label="Nome fantasia" icon={<BookOpen size={12} />}  value={data.nome_fantasia} onChange={v => onChange('nome_fantasia', v)} placeholder="Nome do escritório" required />
        <TextField label="Cidade / UF"  icon={<MapPin size={12} />}    value={data.cidade_uf}     onChange={v => onChange('cidade_uf', v)}     placeholder="Ex: São Paulo, SP" required />
        <TextField label="Telefone"     icon={<Phone size={12} />}     value={data.telefone}      onChange={v => onChange('telefone', v)}      placeholder="(11) 99999-9999" type="tel" required />
        <TextField label="E-mail"       icon={<AtSign size={12} />}    value={data.email}         onChange={v => onChange('email', v)}         placeholder="contato@escritorio.com" type="email" required />
      </div>
    </>
  );
}

/* ─── STEP 2 — Projeto ─── */
function Step2({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <StepTitle number={2} title="Sobre o projeto" />
      <div className="space-y-8">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tipo de projeto <span className="text-violet-500">*</span></p>
          <div className="space-y-3">
            <IconCard icon={<Sparkles size={18} />}  label="Criação de identidade visual"  sub="Novo projeto do zero"           selected={data.tipo_projeto === 'criacao'}  onClick={() => onChange('tipo_projeto', 'criacao')} />
            <IconCard icon={<RefreshCw size={18} />} label="Redesign de identidade visual" sub="Atualização de marca existente" selected={data.tipo_projeto === 'redesign'} onClick={() => onChange('tipo_projeto', 'redesign')} />
          </div>
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Já possui nome definido? <span className="text-violet-500">*</span></p>
          <div className="space-y-3">
            <IconCard icon={<BadgeCheck size={18} />}  label="Sim" sub="Já temos o nome definido" selected={data.possui_nome === 'sim'} onClick={() => onChange('possui_nome', 'sim')} />
            <IconCard icon={<HelpCircle size={18} />}  label="Não" sub="Ainda será definido"      selected={data.possui_nome === 'nao'} onClick={() => onChange('possui_nome', 'nao')} />
          </div>
        </div>
        {data.possui_nome === 'sim' && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-300">
            <TextField label="Nome do escritório" icon={<BookOpen size={12} />} value={data.nome_escritorio} onChange={v => onChange('nome_escritorio', v)} placeholder="Nome definido" />
          </div>
        )}
      </div>
    </>
  );
}

/* ─── STEP 3 — Itens ─── */
const ITEM_ICONS: Record<string, React.ReactNode> = {
  logotipo:         <Pen size={15} />,
  paleta_cores:     <Palette size={15} />,
  cartao_visita:    <CreditCard size={15} />,
  cartao_digital:   <Smartphone size={15} />,
  assinatura_email: <Mail size={15} />,
  pasta_a4:         <Folder size={15} />,
  envelope_a4:      <Package size={15} />,
  envelope_carta:   <MailOpen size={15} />,
  papel_timbrado:   <FileText size={15} />,
};
const ITEM_OPTS = [
  { id: 'logotipo',         label: 'Logotipo' },
  { id: 'paleta_cores',     label: 'Paleta de cores' },
  { id: 'cartao_visita',    label: 'Cartão de visita' },
  { id: 'cartao_digital',   label: 'Cartão digital interativo' },
  { id: 'assinatura_email', label: 'Assinatura de e-mail' },
  { id: 'pasta_a4',         label: 'Pasta A4' },
  { id: 'envelope_a4',      label: 'Envelope A4' },
  { id: 'envelope_carta',   label: 'Envelope carta' },
  { id: 'papel_timbrado',   label: 'Papel timbrado' },
];

function Step3({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string[]) => void }) {
  const toggle = (id: string) => {
    onChange('itens_projeto', data.itens_projeto.includes(id)
      ? data.itens_projeto.filter(v => v !== id)
      : [...data.itens_projeto, id]);
  };
  return (
    <>
      <StepTitle number={3} title="Itens do projeto" subtitle="Marque tudo que faz parte deste projeto." />
      <div className="flex flex-wrap gap-2">
        {ITEM_OPTS.map(opt => (
          <IconPill key={opt.id} icon={ITEM_ICONS[opt.id]} label={opt.label}
            selected={data.itens_projeto.includes(opt.id)} onClick={() => toggle(opt.id)} />
        ))}
      </div>
      {data.itens_projeto.length > 0 && (
        <p className="text-xs text-violet-400 font-medium mt-4">
          {data.itens_projeto.length} {data.itens_projeto.length === 1 ? 'item selecionado' : 'itens selecionados'}
        </p>
      )}
    </>
  );
}

/* ─── STEP 4 — Características ─── */
const AREA_ICONS: Record<string, React.ReactNode> = {
  trabalhista:    <Factory size={15} />,
  familia:        <UsersRound size={15} />,
  empresarial:    <Briefcase size={15} />,
  criminal:       <Scale size={15} />,
  tributario:     <Receipt size={15} />,
  imobiliario:    <Building2 size={15} />,
  previdenciario: <ShieldCheck size={15} />,
  consumidor:     <UserCheck size={15} />,
  outra:          <MoreHorizontal size={15} />,
};
const AREA_OPTS = [
  { id: 'trabalhista',    label: 'Trabalhista' },
  { id: 'familia',        label: 'Família e sucessões' },
  { id: 'empresarial',    label: 'Empresarial / contratual' },
  { id: 'criminal',       label: 'Criminal' },
  { id: 'tributario',     label: 'Tributário' },
  { id: 'imobiliario',    label: 'Imobiliário' },
  { id: 'previdenciario', label: 'Previdenciário' },
  { id: 'consumidor',     label: 'Direito do consumidor' },
  { id: 'outra',          label: 'Outra área' },
];

function Step4({ data, onStr, onArr }: { data: FormData; onStr: (k: keyof FormData, v: string) => void; onArr: (k: keyof FormData, v: string[]) => void }) {
  const toggleArea = (id: string) => {
    onArr('areas_atuacao', data.areas_atuacao.includes(id)
      ? data.areas_atuacao.filter(v => v !== id)
      : [...data.areas_atuacao, id]);
  };
  return (
    <>
      <StepTitle number={4} title="Características do escritório" />
      <div className="space-y-8">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Áreas de atuação <span className="text-violet-500">*</span></p>
          <div className="flex flex-wrap gap-2">
            {AREA_OPTS.map(opt => (
              <IconPill key={opt.id} icon={AREA_ICONS[opt.id]} label={opt.label}
                selected={data.areas_atuacao.includes(opt.id)} onClick={() => toggleArea(opt.id)} />
            ))}
          </div>
          {data.areas_atuacao.includes('outra') && (
            <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
              <TextField label="Especifique a área" icon={<Pen size={12} />} value={data.area_outra} onChange={v => onStr('area_outra', v)} placeholder="Ex: Direito Ambiental" />
            </div>
          )}
        </div>
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Atende principalmente quem? <span className="text-violet-500">*</span></p>
          <div className="space-y-3">
            <IconCard icon={<User size={18} />}     label="Pessoas físicas" sub="Clientes individuais"       selected={data.publico_alvo === 'pf'}    onClick={() => onStr('publico_alvo', 'pf')} />
            <IconCard icon={<Building size={18} />}  label="Empresas (B2B)" sub="Clientes corporativos"     selected={data.publico_alvo === 'b2b'}   onClick={() => onStr('publico_alvo', 'b2b')} />
            <IconCard icon={<Users size={18} />}     label="Ambos"          sub="Pessoas físicas e empresas" selected={data.publico_alvo === 'ambos'} onClick={() => onStr('publico_alvo', 'ambos')} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── STEP 5 — Formato + Tipografia ─── */
const TIPO_FONT: Record<string, string> = {
  serifa:     'font-serif',
  sem_serifa: 'font-sans',
  caixa_alta: 'uppercase tracking-[0.2em] font-sans text-xs',
  italico:    'italic',
};

function Step5({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <StepTitle number={5} title="Estilo do logotipo" subtitle="Formato e tipografia." />
      <div className="space-y-8">
        {/* Formato preferido */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Formato preferido <span className="text-violet-500">*</span></p>
          <div className="space-y-3">
            <IconCard icon={<Type size={18} />}      label="Só texto"        sub="Nome do escritório"   selected={data.formato_logo === 'so_texto'}     onClick={() => onChange('formato_logo', 'so_texto')} />
            <IconCard icon={<Signature size={18} />} label="Inicial + texto" sub="Letra / monograma"    selected={data.formato_logo === 'inicial_texto'} onClick={() => onChange('formato_logo', 'inicial_texto')} />
            <IconCard icon={<ImageIcon size={18} />} label="Símbolo + texto" sub="Ícone ao lado"        selected={data.formato_logo === 'simbolo_texto'} onClick={() => onChange('formato_logo', 'simbolo_texto')} />
            <IconCard icon={<Award size={18} />}     label="Brasão / selo"   sub="Clássico, institucional" selected={data.formato_logo === 'brasao'}    onClick={() => onChange('formato_logo', 'brasao')} />
          </div>
        </div>
        {/* Tipografia */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Estilo de tipografia <span className="text-violet-500">*</span></p>
          <div className="space-y-3">
            {[
              { id: 'serifa',     label: 'Serifa clássica',     sub: 'Tradicional, autoridade' },
              { id: 'sem_serifa', label: 'Sem serifa',           sub: 'Moderno, limpo' },
              { id: 'caixa_alta', label: 'CAIXA ALTA ESPAÇADA', sub: 'Sofisticado, premium' },
              { id: 'italico',    label: 'Itálico / manuscrita', sub: 'Pessoal, humanizado' },
            ].map(opt => {
              const sel = data.tipografia === opt.id;
              return (
                <button key={opt.id} onClick={() => onChange('tipografia', opt.id)}
                  className={`w-full text-left px-5 py-4 rounded-xl border transition-all duration-200 flex items-center gap-3 ${sel ? 'bg-violet-500/10 border-violet-500' : 'bg-white/[0.05] border-transparent hover:bg-white/[0.08]'}`}>
                  <div className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 text-base font-bold transition-all ${sel ? 'bg-violet-500/20 text-violet-400' : 'bg-white/5 text-slate-500'} ${TIPO_FONT[opt.id]}`}>
                    Aa
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className={`text-sm font-semibold ${sel ? 'text-violet-200' : 'text-slate-300'} ${TIPO_FONT[opt.id]}`}>{opt.label}</div>
                    <div className="text-xs text-slate-500 mt-0.5 font-sans normal-case tracking-normal not-italic">{opt.sub}</div>
                  </div>
                  {sel && <Check size={14} className="text-violet-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── STEP 6 — Composição + Elemento jurídico ─── */
function Step6({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <StepTitle number={6} title="Estilo do logotipo" subtitle="Composição e referências visuais." />
      <div className="space-y-8">
        {/* Composição visual */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Composição visual <span className="text-violet-500">*</span></p>
          <div className="space-y-3">
            <IconCard icon={<Minus size={18} />}      label="Minimalista"   sub="Poucos elementos, limpo"   selected={data.composicao_visual === 'minimalista'}  onClick={() => onChange('composicao_visual', 'minimalista')} />
            <IconCard icon={<LayoutGrid size={18} />} label="Estruturado"   sub="Organizado, profissional"  selected={data.composicao_visual === 'estruturado'}   onClick={() => onChange('composicao_visual', 'estruturado')} />
            <IconCard icon={<Gem size={18} />}        label="Com detalhes"  sub="Ornamentos, elementos extras" selected={data.composicao_visual === 'com_detalhes'} onClick={() => onChange('composicao_visual', 'com_detalhes')} />
          </div>
        </div>
        {/* Elemento jurídico */}
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Elemento simbólico jurídico? <span className="text-violet-500">*</span></p>
          <div className="space-y-3">
            <IconCard icon={<Shapes size={18} />}       label="Não, algo abstrato"        sub="" selected={data.elemento_juridico === 'abstrato'}   onClick={() => onChange('elemento_juridico', 'abstrato')} />
            <IconCard icon={<Scale size={18} />}        label="Sim, de forma sutil"       sub="" selected={data.elemento_juridico === 'sutil'}       onClick={() => onChange('elemento_juridico', 'sutil')} />
            <IconCard icon={<Gavel size={18} />}        label="Sim, claramente jurídico"  sub="" selected={data.elemento_juridico === 'claramente'}  onClick={() => onChange('elemento_juridico', 'claramente')} />
            <IconCard icon={<CircleDashed size={18} />} label="Indiferente"               sub="" selected={data.elemento_juridico === 'indiferente'} onClick={() => onChange('elemento_juridico', 'indiferente')} />
          </div>
        </div>
      </div>
    </>
  );
}

/* ─── STEP 7 — Paleta de cores ─── */
function Step7({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <StepTitle number={7} title="Paleta de cores" subtitle="Escolha um ponto de partida — o HEX exato pode ser ajustado depois." />
      <div className="space-y-8">
        <div>
          <p className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3">Tom que mais representa a marca</p>
          <div className="space-y-2">
            {TOM_OPTIONS.map(opt => {
              const sel = data.tom_marca === opt.id;
              return (
                <button key={opt.id} onClick={() => onChange('tom_marca', opt.id)}
                  className={`w-full text-left px-5 py-3.5 rounded-xl border transition-all duration-200 flex items-center gap-3 ${sel ? 'bg-violet-500/10 border-violet-500' : 'bg-white/[0.05] border-transparent hover:bg-white/[0.08]'}`}>
                  <div className="w-7 h-7 rounded-lg shrink-0 border border-white/10 shadow-inner" style={{ backgroundColor: opt.hex }} />
                  <span className={`font-semibold text-sm flex-1 ${sel ? 'text-violet-200' : 'text-slate-300'}`}>{opt.label}</span>
                  <span className="text-[10px] font-mono text-slate-600">{opt.hex}</span>
                  {sel && <Check size={14} className="text-violet-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(['cor_primaria', 'cor_secundaria'] as const).map((key, i) => {
            const val = data[key];
            const isValidHex = /^#[0-9A-Fa-f]{6}$/.test(val);
            const pickerColor = isValidHex ? val : (i === 0 ? '#7c3aed' : '#a855f7');
            return (
              <div key={key}>
                <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
                  <Palette size={12} className="text-slate-500" />
                  {i === 0 ? 'Cor primária' : 'Cor secundária'} — opcional
                </label>
                <div className="flex items-center gap-2">
                  {/* Swatch clicável que abre color picker */}
                  <label className="shrink-0 cursor-pointer relative group" title="Abrir seletor de cores">
                    <div
                      className="w-11 h-11 rounded-xl border-2 border-white/10 group-hover:border-violet-500/50 transition-all flex items-center justify-center overflow-hidden"
                      style={{ backgroundColor: isValidHex ? val : '#1a1a2e' }}
                    >
                      {!isValidHex && <Palette size={14} className="text-slate-600" />}
                    </div>
                    <input
                      type="color"
                      value={pickerColor}
                      onChange={e => onChange(key, e.target.value)}
                      className="absolute inset-0 opacity-0 w-full h-full cursor-pointer"
                    />
                  </label>
                  {/* Campo HEX */}
                  <input
                    type="text"
                    value={val}
                    onChange={e => onChange(key, e.target.value)}
                    placeholder="#000000"
                    maxLength={7}
                    className="flex-1 bg-white/[0.05] border border-transparent focus:border-violet-500/60 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 outline-none transition-all font-mono"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

/* ─── STEP 8 — Referências ─── */
function Step8({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <StepTitle number={8} title="Referências" subtitle="Marcas ou escritórios que admira — não precisam ser da área jurídica." />
      <div className="space-y-4">
        <TextField label="Referência 1" icon={<Link size={12} />} value={data.referencia_1} onChange={v => onChange('referencia_1', v)} placeholder="Nome da marca / escritório" />
        <TextField label="Referência 2" icon={<Link size={12} />} value={data.referencia_2} onChange={v => onChange('referencia_2', v)} placeholder="Nome da marca / escritório" />
        <TextField label="Referência 3" icon={<Link size={12} />} value={data.referencia_3} onChange={v => onChange('referencia_3', v)} placeholder="Nome da marca / escritório" />
        <div className="pt-2">
          <label className="text-xs font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5 mb-2">
            <Ban size={12} className="text-slate-500" /> O que evitar
          </label>
          <input type="text" value={data.o_que_evitar} onChange={e => onChange('o_que_evitar', e.target.value)}
            placeholder="Ex: balança da justiça, dourado excessivo…"
            className="w-full bg-white/[0.03] border border-white/10 focus:border-violet-500/60 rounded-xl px-4 py-3 text-white text-sm placeholder-slate-600 outline-none transition-all" />
        </div>
      </div>
    </>
  );
}

/* ─── STEP 9 — Concorrentes ─── */
function Step9({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <StepTitle number={9} title="Concorrentes" subtitle="Escritórios concorrentes para análise e diferenciação." />
      <div className="space-y-6">
        {([
          { label: 'Concorrente 1', nameKey: 'concorrente_1_nome', siteKey: 'concorrente_1_site' },
          { label: 'Concorrente 2', nameKey: 'concorrente_2_nome', siteKey: 'concorrente_2_site' },
        ] as const).map(({ label, nameKey, siteKey }) => (
          <div key={label} className="bg-white/[0.02] border border-white/8 rounded-2xl p-5 space-y-4">
            <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">{label}</p>
            <TextField label="Nome" icon={<Building2 size={12} />} value={data[nameKey]} onChange={v => onChange(nameKey, v)} placeholder="Nome do escritório" />
            <TextField label="Site" icon={<Globe size={12} />}     value={data[siteKey]} onChange={v => onChange(siteKey, v)} placeholder="https://" />
          </div>
        ))}
      </div>
    </>
  );
}

/* ─── STEP 10 — Observações ─── */
function Step10({ data, onChange }: { data: FormData; onChange: (k: keyof FormData, v: string) => void }) {
  return (
    <>
      <StepTitle
        number={10}
        title="Alguma observação?"
        subtitle="Conte o que quiser — quanto mais contexto, melhor o resultado."
      />
      <div className="space-y-3">
        <label className="flex items-center gap-2 text-xs font-bold text-slate-400 uppercase tracking-widest">
          <MessageSquare size={13} className="text-slate-500" />
          Informações adicionais — opcional
        </label>
        <textarea
          value={data.observacoes}
          onChange={e => onChange('observacoes', e.target.value)}
          placeholder="Ex: temos um slogan já definido, queremos algo que transmita modernidade e confiança, não gostamos de fontes serifadas..."
          rows={6}
          maxLength={1000}
          className="w-full bg-white/[0.05] border border-transparent focus:border-violet-500/60 rounded-2xl px-5 py-4 text-white text-sm placeholder-slate-600 outline-none transition-all resize-none leading-relaxed"
        />
        <div className="flex justify-end">
          <span className="text-[10px] text-slate-600 font-mono">{data.observacoes.length}/1000</span>
        </div>
      </div>
    </>
  );
}

/* ─── Validation ─── */
function validateStep(step: StepId, data: FormData): string | null {
  if (step === 1) {
    if (!data.nome_fantasia.trim()) return 'Preencha o Nome Fantasia.';
    if (!data.cidade_uf.trim()) return 'Preencha Cidade / UF.';
    if (!data.telefone.trim()) return 'Preencha o Telefone.';
    if (!data.email.trim()) return 'Preencha o E-mail.';
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return 'E-mail inválido.';
  }
  if (step === 2) {
    if (!data.tipo_projeto) return 'Selecione o tipo de projeto.';
    if (!data.possui_nome) return 'Responda se já possui nome.';
  }
  if (step === 3 && data.itens_projeto.length === 0) return 'Selecione ao menos 1 item.';
  if (step === 4) {
    if (data.areas_atuacao.length === 0) return 'Selecione ao menos 1 área.';
    if (!data.publico_alvo) return 'Selecione o público-alvo.';
  }
  if (step === 5) {
    if (!data.formato_logo) return 'Selecione o formato do logotipo.';
    if (!data.tipografia) return 'Selecione o estilo de tipografia.';
  }
  if (step === 6) {
    if (!data.composicao_visual) return 'Selecione a composição visual.';
    if (!data.elemento_juridico) return 'Responda sobre o elemento jurídico.';
  }
  return null;
}

/* ─── Main Component ─── */
export default function BriefingForm() {
  const urlParams = new URLSearchParams(window.location.search);
  const briefingId = urlParams.get('briefing');

  const [briefing, setBriefing] = useState<BriefingData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState(false);
  const [loadError, setLoadError] = useState('');
  const [validationError, setValidationError] = useState('');
  const [currentStep, setCurrentStep] = useState<0 | StepId>(0);
  const [data, setData] = useState<FormData>(INITIAL);

  useEffect(() => {
    if (!briefingId) { setLoading(false); return; }
    fetch(`/api/briefings/public/${briefingId}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) { if (d.submitted_at) setLoadError('Este briefing já foi preenchido.'); setBriefing(d); }
        else setLoadError('Briefing não encontrado.');
      })
      .catch(() => setLoadError('Erro ao conectar.'))
      .finally(() => setLoading(false));
  }, [briefingId]);

  const setStr = (k: keyof FormData, v: string) => { setData(p => ({ ...p, [k]: v })); setValidationError(''); };
  const setArr = (k: keyof FormData, v: string[]) => { setData(p => ({ ...p, [k]: v })); setValidationError(''); };

  const canAdvance = () => currentStep === 0 || validateStep(currentStep as StepId, data) === null;

  const handleNext = async () => {
    if (currentStep === 0) { setCurrentStep(1); return; }
    const err = validateStep(currentStep as StepId, data);
    if (err) { setValidationError(err); return; }
    setValidationError('');
    if (currentStep < TOTAL_STEPS) { setCurrentStep((currentStep + 1) as StepId); }
    else { await handleSubmit(); }
  };

  const handleBack = () => {
    setValidationError('');
    if (currentStep <= 1) { setCurrentStep(0); return; }
    setCurrentStep((currentStep - 1) as StepId);
  };

  const handleSubmit = async () => {
    if (!briefingId) return;
    setSubmitting(true);
    try {
      const res = await fetch(`/api/briefings/public/${briefingId}/submit`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ form_data: data }),
      });
      if (res.ok) setSuccess(true);
      else setValidationError('Erro ao enviar. Tente novamente.');
    } catch { setValidationError('Erro na conexão. Tente novamente.'); }
    finally { setSubmitting(false); }
  };

  /* ─── Error/loading states ─── */
  if (!briefingId) return (
    <div className={BG}><div className={GLOW_L} /><div className={GLOW_R} />
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-[#11111b] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
          <Palette className="w-12 h-12 text-violet-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Página Inválida</h1>
          <p className="text-slate-400 text-sm">O link requer o identificador do briefing. Verifique o link recebido.</p>
        </div>
      </div>
    </div>
  );

  if (loading) return (
    <div className={BG}><div className="flex-1 flex items-center justify-center">
      <LoadingSpinner size="lg" />
    </div></div>
  );

  if (loadError || !briefing) return (
    <div className={BG}><div className={GLOW_L} /><div className={GLOW_R} />
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="bg-[#11111b] border border-white/10 rounded-2xl p-10 max-w-md w-full text-center">
          <Palette className="w-12 h-12 text-rose-500 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">{loadError.includes('preenchido') ? 'Briefing Já Enviado' : 'Briefing Inativo'}</h1>
          <p className="text-slate-400 text-sm">{loadError || 'Não foi possível encontrar o briefing.'}</p>
        </div>
      </div>
    </div>
  );

  if (success) return (
    <div className={BG}><div className={GLOW_L} /><div className={GLOW_R} />
      <div className="flex-1 flex items-center justify-center p-6 relative z-10 text-center">
        <div className="max-w-lg w-full">
          <div className="relative inline-block mb-8">
            <div className="absolute inset-0 bg-emerald-500/20 rounded-full blur-2xl scale-150" />
            <CheckCircle2 className="w-20 h-20 text-emerald-400 relative" />
          </div>
          <h1 className="text-4xl font-extrabold text-white mb-4 tracking-tight">Briefing Enviado!</h1>
          <p className="text-slate-400 text-base leading-relaxed max-w-md mx-auto">
            Suas respostas foram registradas com sucesso.<br />
            Nossa equipe utilizará estas informações para desenvolver sua identidade visual.
          </p>
        </div>
      </div>
    </div>
  );

  /* ─── Welcome ─── */
  if (currentStep === 0) return (
    <div className={BG}><div className={GLOW_L} /><div className={GLOW_R} />
      <ProgressBar step={0} />
      <div className="flex-1 flex items-center justify-center p-6 relative z-10">
        <div className="max-w-xl w-full text-center">
          <p className="text-xs font-bold text-violet-400 tracking-[0.3em] uppercase mb-10">GRAPE MÍDIA <span className="text-white/20 mx-2">|</span> Briefing Identidade Visual</p>
          <div className="relative inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-violet-950/40 border border-violet-500/20 shadow-[0_0_50px_rgba(139,92,246,0.15)] mb-8">
            <Palette className="w-6 h-6 text-violet-400" />
          </div>
          <h1 className="text-4xl sm:text-5xl font-black text-white tracking-tight leading-tight">BRIEFING</h1>
          <p className="text-slate-400 text-lg mt-2">Identidade Visual</p>
          {briefing.task_name && (
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-violet-500/10 border border-violet-500/20 rounded-full mt-6 mb-2">
              <Palette size={14} className="text-violet-400" />
              <span className="text-violet-300 text-xs font-semibold">{briefing.task_name}</span>
            </div>
          )}
          <div className="mt-8">
            <button onClick={() => setCurrentStep(1)}
              className="group bg-violet-600 hover:bg-violet-700 text-white font-bold px-8 py-3.5 rounded-xl transition-all shadow-lg hover:shadow-violet-600/20 flex items-center justify-center gap-2 mx-auto hover:scale-[1.02] active:scale-[0.98]">
              Começar <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
          <span className="text-slate-600 text-xs mt-4 block">Leva aproximadamente 5 minutos</span>
        </div>
      </div>
    </div>
  );

  /* ─── Steps 1–9 ─── */
  return (
    <div className={BG}><div className={GLOW_L} /><div className={GLOW_R} />
      <ProgressBar step={currentStep} />
      <div className="relative z-10 flex flex-col min-h-screen">
        <NavBar onBack={handleBack} onNext={handleNext} canNext={canAdvance()} isLast={currentStep === TOTAL_STEPS} submitting={submitting} />
        <div className="flex-1 overflow-y-auto px-6 pb-8">
          <div className="max-w-xl mx-auto pt-4">
            {currentStep === 1 && <Step1 data={data} onChange={setStr} />}
            {currentStep === 2 && <Step2 data={data} onChange={setStr} />}
            {currentStep === 3 && <Step3 data={data} onChange={setArr} />}
            {currentStep === 4 && <Step4 data={data} onStr={setStr} onArr={setArr} />}
            {currentStep === 5 && <Step5 data={data} onChange={setStr} />}
            {currentStep === 6 && <Step6 data={data} onChange={setStr} />}
            {currentStep === 7 && <Step7 data={data} onChange={setStr} />}
            {currentStep === 8 && <Step8 data={data} onChange={setStr} />}
            {currentStep === 9 && <Step9 data={data} onChange={setStr} />}
            {currentStep === 10 && <Step10 data={data} onChange={setStr} />}
            {validationError && (
              <div className="mt-6 flex items-center gap-2 px-4 py-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm font-medium animate-in fade-in slide-in-from-bottom-2 duration-300">
                <span className="shrink-0">⚠</span> {validationError}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
