import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import SplitHeadline from '../components/SplitHeadline';
import EstudioConfig from './EstudioConfig';
import MediaLightbox, { LbFile } from '../components/MediaLightbox';
import EsferaDeParticulas from '../components/EsferaDeParticulas';
import { useAuth } from '../contexts/AuthContext';
import { toast } from '@/src/lib/toast';
import {
  Sparkles, X, Check, ChevronRight, ChevronLeft, Loader2, Play, Pause,
  Wand2, UserSquare2, Mic, Film, Building2, Download, RefreshCw, Clapperboard, Settings, Coins, Waves, Users,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// FRONT COM DADOS DE MENTIRA. Nada aqui chama MiniMax, HeyGen ou Claude ainda —
// os botões simulam com timer para o fluxo poder ser navegado e criticado antes
// de encostar em API paga. Trocar `MOCK_*` e as funções `simular*` pelo backend.
// ─────────────────────────────────────────────────────────────────────────────

interface Projeto { id: string; partner: string; client_ref: string | null; }

interface TipoRoteiroApi { id: string; slug: string; name: string; descricao: string | null; }
/** Cama de som cadastrada nas Configurações; entra por baixo da locução. */
interface AmbienciaApi { id: string; name: string; url: string; volume_padrao: string | number; }
interface AvatarApi {
  id: string; avatar_id: string; name: string; preview_url: string | null;
  client_ref: string | null; cor: string; voice_name: string | null; voice_id: string | null;
}

// Modelos de TTS da MiniMax. O HD é o de narração; o turbo custa menos e responde
// mais rápido, mas foi pensado para atendimento, não para locução de anúncio.
const MODELOS_TTS = [
  { id: 'speech-2.8-hd',    nome: 'speech-2.8-hd',    desc: 'Narração · maior qualidade' },
  { id: 'speech-2.8-turbo', nome: 'speech-2.8-turbo', desc: 'Mais rápido e mais barato' },
] as const;

// Limite por request do MiniMax (o editor deles mostra "x / 5.000 characters").
const LIMITE_CARACTERES = 5000;

// Engines do avatar no HeyGen. O IV é o padrão da API quando o campo é omitido.
// O custo por minuto muda entre elas — medimos US$ 2,33/min no IV; III e V ainda
// não foram medidos aqui.
const ENGINES = [
  { id: 'avatar_iii', nome: 'Avatar III', desc: 'Engine anterior, mais simples' },
  { id: 'avatar_iv',  nome: 'Avatar IV',  desc: 'Padrão do HeyGen' },
  { id: 'avatar_v',   nome: 'Avatar V',   desc: 'Animação mais elaborada' },
] as const;

const FORMATOS = [
  { id: '9:16', label: '9:16', desc: 'Reels e Stories', w: 1080, h: 1920 },
  { id: '1:1',  label: '1:1',  desc: 'Feed quadrado',  w: 1080, h: 1080 },
  { id: '16:9', label: '16:9', desc: 'YouTube',        w: 1920, h: 1080 },
];

const PASSOS = [
  { n: 1, titulo: 'Copy',   icone: Wand2 },
  { n: 2, titulo: 'Avatar', icone: UserSquare2 },
  { n: 3, titulo: 'Áudio',  icone: Mic },
  { n: 4, titulo: 'Vídeo',  icone: Film },
];

const espera = (ms: number) => new Promise(r => setTimeout(r, ms));

// ─── Editor de roteiro com as pausas destacadas ──────────────────────────────
// <textarea> não pinta trecho nenhum, então o texto é desenhado numa camada
// ATRÁS, com as marcações <#x#> em pílula, e o textarea fica por cima com a
// fonte transparente. Assim o cursor, a seleção, o desfazer e o "inserir no
// cursor" continuam sendo os nativos — nada de contenteditable.
const RE_PAUSA = /(<#\d*\.?\d+#>)/g;
// Separada e SEM /g: `test()` em regex global avança o lastIndex e alterna o
// resultado a cada chamada — o destaque piscaria linha sim, linha não.
const EH_PAUSA = /^<#\d*\.?\d+#>$/;

const EditorRoteiro = React.forwardRef<HTMLTextAreaElement, {
  valor: string;
  onChange: (v: string) => void;
  linhas?: number;
  placeholder?: string;
}>(({ valor, onChange, linhas = 14, placeholder }, ref) => {
  const fundoRef = React.useRef<HTMLDivElement>(null);

  // As duas camadas precisam rolar juntas, senão o destaque descola do texto.
  const sincronizar = (el: HTMLTextAreaElement) => {
    if (fundoRef.current) {
      fundoRef.current.scrollTop = el.scrollTop;
      fundoRef.current.scrollLeft = el.scrollLeft;
    }
  };

  // Mesmas métricas nos dois lados: qualquer diferença desalinha o destaque.
  const metricas = 'px-3 py-2.5 text-sm leading-relaxed font-sans whitespace-pre-wrap break-words';

  // A marcação é apagada INTEIRA, como um bloco. Sem isso, cada backspace come
  // um caractere e a pausa passa por estados quebrados — "<#0.5#", "<#0.5" — que
  // deixam de ser reconhecidos e parecem bug na tela.
  const FIM_PAUSA = /<#\d*\.?\d+#>$/;
  const INICIO_PAUSA = /^<#\d*\.?\d+#>/;

  const aoTeclar = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    const el = e.currentTarget;
    if (el.selectionStart !== el.selectionEnd) return;   // com seleção, o normal já resolve
    const pos = el.selectionStart;

    if (e.key === 'Backspace') {
      const antes = valor.slice(0, pos);
      const m = antes.match(FIM_PAUSA);
      if (!m) return;
      e.preventDefault();
      const novoPos = pos - m[0].length;
      onChange(valor.slice(0, novoPos) + valor.slice(pos));
      requestAnimationFrame(() => el.setSelectionRange(novoPos, novoPos));
      return;
    }

    if (e.key === 'Delete') {
      const depois = valor.slice(pos);
      const m = depois.match(INICIO_PAUSA);
      if (!m) return;
      e.preventDefault();
      onChange(valor.slice(0, pos) + valor.slice(pos + m[0].length));
      requestAnimationFrame(() => el.setSelectionRange(pos, pos));
    }
  };

  return (
    <div className="relative">
      <div
        ref={fundoRef}
        aria-hidden
        className={`absolute inset-0 overflow-hidden rounded-t-xl border border-black/10 dark:border-white/10 text-dark-text pointer-events-none ${metricas}`}
      >
        {valor.split(RE_PAUSA).map((parte, i) =>
          EH_PAUSA.test(parte) ? (
            <span key={i} className="rounded-md bg-violet-500/15 text-violet-400 font-medium px-1 py-0.5">
              {parte}
            </span>
          ) : (
            <React.Fragment key={i}>{parte}</React.Fragment>
          )
        )}
        {/* linha extra: sem ela a última quebra some e o fundo encurta */}
        {'\n'}
      </div>

      <textarea
        ref={ref}
        value={valor}
        onChange={e => onChange(e.target.value)}
        onScroll={e => sincronizar(e.currentTarget)}
        onKeyDown={aoTeclar}
        rows={linhas}
        placeholder={placeholder}
        spellCheck={false}
        className={`relative w-full bg-transparent text-transparent caret-violet-500 placeholder-slate-600
                    border border-black/10 dark:border-white/10 rounded-t-xl resize-none
                    focus:outline-none focus:border-violet-500/60 selection:bg-violet-500/30 ${metricas}`}
      />
    </div>
  );
});
EditorRoteiro.displayName = 'EditorRoteiro';

// ─── Trilha de passos ────────────────────────────────────────────────────────

const Trilha: React.FC<{ atual: number }> = ({ atual }) => (
  <div className="flex items-center gap-1 sm:gap-2">
    {PASSOS.map((p, i) => {
      const Icone = p.icone;
      const feito = atual > p.n;
      const ativo = atual === p.n;
      return (
        <React.Fragment key={p.n}>
          <div className={`flex items-center gap-2 px-2.5 py-1.5 rounded-xl transition-colors ${
            ativo ? 'bg-violet-600/15 border border-violet-500/40' : 'border border-transparent'}`}>
            <div className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 ${
              feito ? 'bg-emerald-500/20 text-emerald-400'
                    : ativo ? 'bg-violet-600 text-white' : 'bg-white/5 text-slate-600'}`}>
              {feito ? <Check size={12} /> : <Icone size={12} />}
            </div>
            <span className={`text-xs font-bold hidden sm:block ${
              ativo ? 'text-dark-text' : feito ? 'text-emerald-400' : 'text-slate-600'}`}>{p.titulo}</span>
          </div>
          {i < PASSOS.length - 1 && <div className={`h-px flex-1 min-w-[10px] ${feito ? 'bg-emerald-500/40' : 'bg-white/10'}`} />}
        </React.Fragment>
      );
    })}
  </div>
);

// ─── Modal do fluxo ──────────────────────────────────────────────────────────

const ModalGeracao: React.FC<{
  projetos: Projeto[];
  tipos: TipoRoteiroApi[];
  avatares: AvatarApi[];
  ambiencias: AmbienciaApi[];
  onFechar: () => void;
}> = ({ projetos, tipos, avatares: catalogoAvatares, ambiencias, onFechar }) => {
  const [passo, setPasso] = useState(1);

  // passo 1 — copy
  const [projetoId, setProjetoId] = useState('');
  const [tipoRoteiro, setTipoRoteiro] = useState<string>(tipos[0]?.slug || '');
  const [briefing, setBriefing] = useState('');
  const [copy, setCopy] = useState('');
  const [gerandoCopy, setGerandoCopy] = useState(false);

  // passo 2 — avatar
  const [avatarId, setAvatarId] = useState('');

  // passo 3 — áudio. O roteiro de locução começa como a copy e ganha as marcações
  // de pausa; a copy original fica intacta para o caso de recomeçar.
  const [roteiroLocucao, setRoteiroLocucao] = useState('');
  const [velocidade, setVelocidade] = useState(1);
  const [pitch, setPitch] = useState(0);
  const [volume, setVolume] = useState(1);
  const [modeloTts, setModeloTts] = useState<string>('speech-2.8-hd');
  // Som ambiente: '' = sem cama. O volume começa no padrão cadastrado para o som
  // escolhido, e pode ser ajustado por vídeo sem mexer no catálogo.
  const [ambienteId, setAmbienteId] = useState('');
  const [ambienteVol, setAmbienteVol] = useState(0.25);
  const [audioJob, setAudioJob] = useState<
    { id: string; audio_url: string; mix_url: string | null; duration_ms: number | null } | null>(null);
  const [gerandoAudio, setGerandoAudio] = useState(false);
  const [tocando, setTocando] = useState(false);
  const textareaRef = React.useRef<HTMLTextAreaElement>(null);
  const playerRef = React.useRef<HTMLAudioElement>(null);

  const audioPronto = !!audioJob;
  // Mexer no roteiro ou nos controles invalida o áudio já gerado: o que está no
  // player deixaria de corresponder ao texto na tela.
  const setAudioPronto = (v: boolean) => { if (!v) setAudioJob(null); };

  // passo 4 — vídeo
  const [formato, setFormato] = useState('9:16');
  const [engine, setEngine] = useState<string>('avatar_iv');
  const [tituloVideo, setTituloVideo] = useState('');
  const [enviando, setEnviando] = useState(false);

  const projeto = projetos.find(p => p.id === projetoId);
  const avatar = catalogoAvatares.find(a => a.id === avatarId);

  // Com projeto escolhido, o avatar e a voz daquele cliente sobem para o topo —
  // é o guard-rail de marca: usar a cara de outro cliente tem que ser esforço.
  // O avatar do cliente daquele projeto sobe para o topo. O vínculo é pelo
  // clients.id que o projeto carrega, não pelo nome.
  const avatares = useMemo(() => {
    const ref = projeto?.client_ref;
    return [...catalogoAvatares].sort((a, b) => {
      const aDono = ref && a.client_ref === ref ? 0 : 1;
      const bDono = ref && b.client_ref === ref ? 0 : 1;
      return aDono - bDono;
    });
  }, [projeto, catalogoAvatares]);
  const ehDeOutroCliente = (clientRef: string | null) =>
    !!clientRef && !!projeto?.client_ref && clientRef !== projeto.client_ref;


  const gerarCopy = async () => {
    if (!projetoId) { toast.error('Escolha o projeto primeiro.'); return; }
    if (!briefing.trim()) { toast.error('Descreva o que o anúncio precisa dizer.'); return; }
    setGerandoCopy(true);
    try {
      const r = await fetch('/api/estudio/copy', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ project_id: projetoId, copy_type: tipoRoteiro, briefing: briefing.trim() }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao gerar a copy.');
      setCopy(d.copy);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao gerar a copy.');
    } finally {
      setGerandoCopy(false);
    }
  };

  // Insere a marcação na posição do cursor, como no editor do MiniMax.
  const inserirNoCursor = (marcacao: string) => {
    const el = textareaRef.current;
    if (!el) return;
    const ini = el.selectionStart ?? roteiroLocucao.length;
    const fim = el.selectionEnd ?? ini;
    const novo = roteiroLocucao.slice(0, ini) + marcacao + roteiroLocucao.slice(fim);
    setRoteiroLocucao(novo);
    setAudioPronto(false);
    requestAnimationFrame(() => {
      el.focus();
      el.setSelectionRange(ini + marcacao.length, ini + marcacao.length);
    });
  };

  const gerarAudio = async () => {
    if (!roteiroLocucao.trim()) { toast.error('O roteiro está vazio.'); return; }
    if (roteiroLocucao.length > LIMITE_CARACTERES) {
      toast.error(`O roteiro tem ${roteiroLocucao.length} caracteres; o limite por geração é ${LIMITE_CARACTERES}.`);
      return;
    }
    setGerandoAudio(true);
    setAudioJob(null);
    try {
      const r = await fetch('/api/estudio/audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          project_id: projetoId,
          avatar_id: avatarId,
          script: roteiroLocucao,
          copy_type: tipoRoteiro,
          briefing,
          speed: velocidade,
          pitch,
          volume,
          model: modeloTts,
          ambience_id: ambienteId || null,
          ambience_vol: ambienteVol,
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao gerar o áudio.');
      setAudioJob({ id: d.id, audio_url: d.audio_url, mix_url: d.mix_url || null, duration_ms: d.duration_ms });
      // A locução já foi paga e está pronta; só a cama faltou. Avisar é melhor
      // que entregar em silêncio um áudio diferente do que foi pedido.
      if (d.ambience_falhou) toast.error('O áudio saiu, mas o som ambiente não pôde ser mixado.');
    } catch (e: any) {
      toast.error(e.message || 'Falha ao gerar o áudio.');
    } finally {
      setGerandoAudio(false);
    }
  };

  const gerarVideo = async () => {
    if (!audioJob) { toast.error('Gere o áudio antes.'); return; }
    if (!tituloVideo.trim()) { toast.error('Dê um nome ao vídeo.'); return; }
    setEnviando(true);
    try {
      const r = await fetch('/api/estudio/videos', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          audio_job_id: audioJob.id,
          avatar_id: avatar?.avatar_id,
          titulo: tituloVideo.trim(),
          aspect_ratio: formato,
          engine,
          resolution: '1080p',
        }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao gerar o vídeo.');
      toast.success('Vídeo em geração. Ele aparece na aba Criativos do projeto quando ficar pronto.');
      onFechar();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao gerar o vídeo.');
    } finally {
      setEnviando(false);
    }
  };

  const podeAvancar =
    passo === 1 ? !!projetoId && !!copy.trim() :
    passo === 2 ? !!avatarId :
    passo === 3 ? audioPronto : true;

  const avancar = () => {
    // Ao entrar no passo de áudio, a copy aprovada vira a base do roteiro de
    // locução. Só na primeira vez — voltar e avançar não apaga as pausas já postas.
    if (passo === 2 && !roteiroLocucao.trim()) setRoteiroLocucao(copy);
    setPasso(p => p + 1);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-3xl bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}>

        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center gap-4">
          <div className="flex-1 min-w-0"><Trilha atual={passo} /></div>
          <button onClick={onFechar} className="text-slate-400 hover:text-dark-text shrink-0"><X size={18} /></button>
        </div>

        <div className="p-6 overflow-y-auto flex-1">
          {/* ── 1. COPY ── */}
          {passo === 1 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-dark-text">Copy do anúncio</h3>
                <p className="text-xs text-slate-500 mt-0.5">Escreva o roteiro ou peça para a IA escrever. Em qualquer caso, você ajusta antes de seguir.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Projeto</label>
                <select value={projetoId} onChange={e => setProjetoId(e.target.value)}
                  className="w-full mt-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/60">
                  <option value="">Selecione o projeto…</option>
                  {projetos.map(p => <option key={p.id} value={p.id}>{p.partner}</option>)}
                </select>
                <p className="mt-1.5 text-[10px] text-slate-500 italic">* O vídeo pronto vai para a página deste projeto.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tipo de roteiro</label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mt-1">
                  {tipos.map(t => (
                    <button key={t.id} onClick={() => { setTipoRoteiro(t.slug); setCopy(''); }}
                      className={`text-left rounded-xl border p-3 transition-colors ${
                        tipoRoteiro === t.slug ? 'border-violet-500 bg-violet-600/10' : 'border-black/10 dark:border-white/10 hover:border-violet-500/40'}`}>
                      <p className="text-xs font-bold text-dark-text">{t.name}</p>
                      <p className="text-[10px] text-slate-500 mt-0.5 leading-snug">{t.descricao}</p>
                    </button>
                  ))}
                  {tipos.length === 0 && (
                    <p className="text-xs text-amber-400 sm:col-span-2">
                      Nenhum tipo de roteiro cadastrado. Configure em Configurações → Tipos de copy.
                    </p>
                  )}
                </div>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">O que o anúncio precisa dizer <span className="text-slate-600 normal-case font-medium">(só para a IA)</span></label>
                <textarea value={briefing} onChange={e => setBriefing(e.target.value)} rows={3}
                  placeholder="Ex.: anúncio para quem teve benefício negado pelo INSS, tom direto, CTA para WhatsApp"
                  className="w-full mt-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 resize-none focus:outline-none focus:border-violet-500/60" />
              </div>

              <button onClick={gerarCopy} disabled={gerandoCopy}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {gerandoCopy ? <><Loader2 size={15} className="animate-spin" /> Escrevendo…</> : <><Sparkles size={15} /> {copy ? 'Gerar outra versão' : 'Gerar copy com IA'}</>}
              </button>

              {/* Sempre visível: dá para escrever o roteiro à mão e seguir sem a IA. */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Roteiro</label>
                  <span className="text-[10px] text-slate-500">{copy.length} caracteres</span>
                </div>
                <textarea value={copy} onChange={e => setCopy(e.target.value)} rows={9}
                  placeholder="Escreva o roteiro aqui, ou use o botão acima para a IA escrever e depois ajuste."
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 resize-none focus:outline-none focus:border-violet-500/60" />
              </div>
            </div>
          )}

          {/* ── 2. AVATAR ── */}
          {passo === 2 && (
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-black text-dark-text">Quem apresenta</h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  {projeto ? <>Avatares de <span className="font-bold text-violet-400">{projeto.partner}</span> aparecem primeiro.</> : 'Escolha o avatar.'}
                </p>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {avatares.map(a => {
                  const outro = ehDeOutroCliente(a.client_ref);
                  const sel = avatarId === a.id;
                  return (
                    <button key={a.id}
                      onClick={() => {
                        if (outro && !window.confirm('Este avatar pertence a outro cliente. Usar mesmo assim?')) return;
                        setAvatarId(a.id);
                      }}
                      className={`text-left rounded-2xl border p-3 transition-colors ${
                        sel ? 'border-violet-500 bg-violet-600/10' : 'border-black/10 dark:border-white/10 hover:border-violet-500/40'}`}>
                      <div className="aspect-[3/4] rounded-xl mb-2 flex items-center justify-center overflow-hidden"
                        style={{ background: `linear-gradient(160deg, ${a.cor}33, ${a.cor}11)` }}>
                        {a.preview_url
                          ? <img src={a.preview_url} alt={a.name} className="w-full h-full object-cover" />
                          : <UserSquare2 size={28} style={{ color: a.cor }} />}
                      </div>
                      <p className="text-xs font-bold text-dark-text truncate">{a.name}</p>
                      <p className={`text-[10px] truncate ${outro ? 'text-amber-400' : 'text-slate-500'}`}>
                        {a.client_ref ? (outro ? 'Outro cliente' : 'Deste cliente') : 'Genérico'}
                      </p>
                      <p className="text-[10px] text-slate-600 truncate flex items-center gap-1 mt-0.5">
                        <Mic size={9} className="shrink-0" /> {a.voice_name}
                      </p>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* ── 3. ÁUDIO ── */}
          {passo === 3 && (
            <div className="space-y-4">
              {/* Cabeçalho com o seletor de modelo, como no editor da MiniMax. */}
              <div className="flex items-center justify-between gap-4 flex-wrap">
                <div>
                  <h3 className="text-lg font-black text-dark-text">Locução</h3>
                  <p className="text-xs text-slate-500 mt-0.5">Ajuste as pausas e ouça antes de gastar crédito de vídeo.</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Modelo</span>
                  <select value={modeloTts} onChange={e => { setModeloTts(e.target.value); setAudioPronto(false); }}
                    className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-dark-text focus:outline-none focus:border-violet-500/60">
                    {MODELOS_TTS.map(m => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </select>
                </div>
              </div>

              {/* Editor à esquerda, painel de ajustes à direita. */}
              <div className="grid grid-cols-1 lg:grid-cols-[1fr_230px] gap-4 items-start">
                <div>
                  <EditorRoteiro
                    ref={textareaRef}
                    valor={roteiroLocucao}
                    onChange={v => { setRoteiroLocucao(v); setAudioPronto(false); }}
                    placeholder="O roteiro aprovado entra aqui. Use as pausas para dar respiro à locução."
                  />
                  <div className="flex items-center gap-2 flex-wrap px-3 py-2 rounded-b-xl bg-black/10 dark:bg-white/[0.03] border border-t-0 border-black/10 dark:border-white/10">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Pausa</span>
                    {[0.25, 0.5, 1].map(seg => (
                      <button key={seg} onClick={() => inserirNoCursor(`<#${seg}#>`)}
                        className="px-2 py-1 rounded-lg text-[11px] font-bold bg-violet-500/10 text-violet-400 hover:bg-violet-500/20 transition-colors">
                        &lt;#{seg}#&gt;
                      </button>
                    ))}
                    <button onClick={() => { setRoteiroLocucao(''); setAudioPronto(false); }}
                      className="ml-auto text-[10px] font-bold text-slate-500 hover:text-rose-400 transition-colors" title="Limpar">
                      Limpar
                    </button>
                    <span className={`text-[10px] font-bold ${roteiroLocucao.length > LIMITE_CARACTERES ? 'text-rose-400' : 'text-slate-500'}`}>
                      {roteiroLocucao.length.toLocaleString('pt-BR')} / {LIMITE_CARACTERES.toLocaleString('pt-BR')}
                    </span>
                  </div>
                  <p className="mt-1.5 text-[10px] text-slate-500 italic">
                    * A pausa entra onde o cursor estiver. Editar aqui não altera a copy do passo 1.
                  </p>
                </div>

                {/* Painel de ajustes: voz fixa do avatar + os três controles. */}
                <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-4">
                  {avatar && (
                    <div>
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Voz</p>
                      <div className="flex items-center gap-2 p-2 rounded-xl bg-black/5 dark:bg-white/5">
                        <div className="w-8 h-8 rounded-lg overflow-hidden bg-violet-600/15 flex items-center justify-center shrink-0">
                          {avatar.preview_url
                            ? <img src={avatar.preview_url} alt={avatar.name} className="w-full h-full object-cover" />
                            : <Mic size={14} className="text-violet-400" />}
                        </div>
                        <div className="min-w-0">
                          <p className="text-xs font-bold text-dark-text truncate">{avatar.voice_name}</p>
                          <p className="text-[10px] text-slate-500 truncate">{avatar.name}</p>
                        </div>
                      </div>
                    </div>
                  )}

                  {([
                    ['Velocidade', velocidade, setVelocidade, 0.5, 2, 0.01, (v: number) => v.toFixed(2)],
                    ['Pitch', pitch, setPitch, -12, 12, 1, (v: number) => String(v)],
                    ['Volume', volume, setVolume, 0.1, 2, 0.01, (v: number) => v.toFixed(2)],
                  ] as const).map(([rotulo, valor, setar, min, max, step, fmt]) => (
                    <div key={rotulo}>
                      <div className="flex items-center justify-between mb-1">
                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{rotulo}</label>
                        <span className="text-[11px] font-bold text-dark-text bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                          {fmt(valor as number)}
                        </span>
                      </div>
                      <input type="range" min={min} max={max} step={step} value={valor as number}
                        onChange={e => { (setar as any)(parseFloat(e.target.value)); setAudioPronto(false); }}
                        className="w-full accent-violet-500" />
                    </div>
                  ))}

                  {/* Som ambiente. A MiniMax não gera cama de som — o arquivo é do
                      catálogo e a mixagem é nossa, no servidor. */}
                  <div className="pt-3 border-t border-black/10 dark:border-white/10">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                      <Waves size={10} /> Som ambiente
                    </label>
                    <select value={ambienteId}
                      onChange={e => {
                        const id = e.target.value;
                        setAmbienteId(id);
                        // Assume o volume cadastrado para o som escolhido; quem
                        // cadastrou já sabe em que nível aquela cama funciona.
                        const escolhido = ambiencias.find(a => a.id === id);
                        if (escolhido) setAmbienteVol(Number(escolhido.volume_padrao ?? 0.25));
                        setAudioPronto(false);
                      }}
                      className="w-full mt-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-xs font-bold text-dark-text focus:outline-none focus:border-violet-500/60">
                      <option value="">Sem ambiente</option>
                      {ambiencias.map(a => <option key={a.id} value={a.id}>{a.name}</option>)}
                    </select>

                    {ambienteId && (
                      <div className="mt-2">
                        <div className="flex items-center justify-between mb-1">
                          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                            Volume do ambiente
                          </label>
                          <span className="text-[11px] font-bold text-dark-text bg-black/5 dark:bg-white/5 px-2 py-0.5 rounded-md">
                            {ambienteVol.toFixed(2)}
                          </span>
                        </div>
                        <input type="range" min={0} max={1} step={0.01} value={ambienteVol}
                          onChange={e => { setAmbienteVol(parseFloat(e.target.value)); setAudioPronto(false); }}
                          className="w-full accent-violet-500" />
                        {ambienteVol > 0.35 && (
                          <p className="mt-1 text-[10px] text-amber-400">Acima de 0,35 a locução perde nitidez.</p>
                        )}
                      </div>
                    )}

                    {ambiencias.length === 0 && (
                      <p className="mt-1 text-[10px] text-slate-500 italic">
                        Nenhum som cadastrado ainda — Configurações › Som ambiente.
                      </p>
                    )}
                  </div>
                </div>
              </div>

              <button onClick={gerarAudio} disabled={gerandoAudio}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors">
                {gerandoAudio ? <><Loader2 size={15} className="animate-spin" /> Gerando áudio…</> : <><Mic size={15} /> {audioPronto ? 'Regerar áudio' : 'Gerar áudio'}</>}
              </button>

              {/* Barra do player, no rodapé, como a da MiniMax. */}
              {audioJob && (
                <div className="flex items-center gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
                  <button
                    onClick={() => {
                      const el = playerRef.current;
                      if (!el) return;
                      if (el.paused) { void el.play(); } else { el.pause(); }
                    }}
                    className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center text-white shrink-0">
                    {tocando ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
                  </button>
                  <div className="flex-1 min-w-0">
                    <p className="text-[11px] font-bold text-dark-text truncate">
                      {avatar?.voice_name}: {roteiroLocucao.slice(0, 48)}…
                    </p>
                    <audio
                      ref={playerRef}
                      // O mixado é o áudio final; a voz limpa continua salva para
                      // o HeyGen, que precisa dela para o lip sync.
                      src={audioJob.mix_url || audioJob.audio_url}
                      controls
                      className="w-full h-8 mt-1"
                      onPlay={() => setTocando(true)}
                      onPause={() => setTocando(false)}
                      onEnded={() => setTocando(false)}
                    />
                  </div>
                  <a href={audioJob.mix_url || audioJob.audio_url} download
                    className="p-2 text-slate-400 hover:text-emerald-400 transition-colors shrink-0" title="Baixar o mp3">
                    <Download size={16} />
                  </a>
                </div>
              )}
            </div>
          )}

          {/* ── 4. VÍDEO ── */}
          {passo === 4 && (
            <div className="space-y-5">
              <div>
                <h3 className="text-lg font-black text-dark-text">Formato e confirmação</h3>
                <p className="text-xs text-slate-500 mt-0.5">A partir daqui consome crédito de vídeo do HeyGen.</p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                  Nome do vídeo <span className="text-rose-400">*</span>
                </label>
                <input value={tituloVideo} onChange={e => setTituloVideo(e.target.value)} autoFocus maxLength={120}
                  placeholder="Ex.: Aposentadoria negada — Nicole — set/26"
                  className="w-full mt-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/60" />
                <p className="mt-1 text-[10px] text-slate-500 italic">
                  * É com este nome que o criativo aparece na aba Criativos do projeto.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Engine do avatar</label>
                <div className="grid grid-cols-3 gap-2 mt-1">
                  {ENGINES.map(e => (
                    <button key={e.id} onClick={() => setEngine(e.id)}
                      className={`rounded-xl border p-2.5 text-center transition-colors ${
                        engine === e.id ? 'border-violet-500 bg-violet-600/10' : 'border-black/10 dark:border-white/10 hover:border-violet-500/40'}`}>
                      <p className="text-xs font-black text-dark-text">{e.nome}</p>
                      <p className="text-[10px] text-slate-500 leading-snug mt-0.5">{e.desc}</p>
                    </button>
                  ))}
                </div>
                <p className="mt-1 text-[10px] text-amber-400/80 italic">
                  * O custo por minuto muda entre as engines. Medimos US$ 2,33/min no Avatar IV.
                </p>
              </div>

              <div className="grid grid-cols-3 gap-3">
                {FORMATOS.map(f => (
                  <button key={f.id} onClick={() => setFormato(f.id)}
                    className={`rounded-2xl border p-4 text-center transition-colors ${
                      formato === f.id ? 'border-violet-500 bg-violet-600/10' : 'border-black/10 dark:border-white/10 hover:border-violet-500/40'}`}>
                    <div className="mx-auto mb-2 border-2 border-current rounded"
                      style={{ width: f.id === '16:9' ? 40 : f.id === '1:1' ? 28 : 20, height: f.id === '16:9' ? 22 : f.id === '1:1' ? 28 : 34,
                               color: formato === f.id ? '#8b5cf6' : '#475569' }} />
                    <p className="text-sm font-black text-dark-text">{f.label}</p>
                    <p className="text-[10px] text-slate-500">{f.desc}</p>
                  </button>
                ))}
              </div>

              <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-2">
                {[
                  ['Nome', tituloVideo.trim() || '—'],
                  ['Engine', ENGINES.find(e => e.id === engine)?.nome || '—'],
                  ['Projeto', projeto?.partner || '—'],
                  ['Roteiro', tipos.find(t => t.slug === tipoRoteiro)?.name || '—'],
                  ['Avatar', avatar?.name || '—'],
                  ['Voz', avatar?.voice_name || '—'],
                  ['Velocidade', `${velocidade.toFixed(2)}×`],
                  ['Tamanho', `${roteiroLocucao.length} caracteres`],
                ].map(([k, v]) => (
                  <div key={k} className="flex items-center justify-between gap-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{k}</span>
                    <span className="text-xs font-bold text-dark-text truncate">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        <div className="p-5 border-t border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
          <button onClick={() => passo > 1 ? setPasso(p => p - 1) : onFechar()}
            className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-dark-text transition-colors">
            <ChevronLeft size={15} /> {passo > 1 ? 'Voltar' : 'Cancelar'}
          </button>
          {passo < 4 ? (
            <button onClick={avancar} disabled={!podeAvancar}
              className="flex items-center gap-1.5 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors">
              Continuar <ChevronRight size={15} />
            </button>
          ) : (
            <button onClick={gerarVideo} disabled={enviando || !tituloVideo.trim()}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold transition-colors">
              {enviando ? <Loader2 size={15} className="animate-spin" /> : <Film size={15} />} Gerar vídeo
            </button>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── Fila de vídeos ──────────────────────────────────────────────────────────

interface VideoJob {
  id: string; status: 'pending' | 'processing' | 'done' | 'failed';
  avatar_name: string | null; projeto: string | null; script: string | null;
  /** Nome de quem gerou (vem do join com users; cai para o e-mail se não achar). */
  autor: string | null;
  video_url: string | null; thumbnail_url: string | null; error: string | null;
  width: number; height: number; duration_ms: number | null; created_at: string;
}

// O HeyGen não devolve percentual — o /v3/videos/{id} só diz "processing". Então
// a barra é uma ESTIMATIVA por tempo decorrido, calibrada pela duração do áudio,
// e trava em 95% até a conclusão real chegar. Melhor uma régua honesta e presa
// no fim do que um número inventado que chega a 100% com o vídeo ainda cozinhando.
function progressoEstimado(job: VideoJob): number {
  const decorrido = (Date.now() - new Date(job.created_at).getTime()) / 1000;
  const audio = (job.duration_ms || 30000) / 1000;
  const esperado = 45 + audio * 2.5;
  return Math.min(95, Math.round((decorrido / esperado) * 100));
}

const fmtDuracao = (ms: number | null) => {
  if (!ms) return '';
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
};

const CardVideo: React.FC<{ job: VideoJob; onAbrir: () => void }> = ({ job, onAbrir }) => {
  const [, forcar] = useState(0);
  // Redesenha a cada segundo só enquanto processa, para a barra andar.
  useEffect(() => {
    if (job.status !== 'processing' && job.status !== 'pending') return;
    const t = setInterval(() => forcar(n => n + 1), 1000);
    return () => clearInterval(t);
  }, [job.status]);

  const processando = job.status === 'processing' || job.status === 'pending';
  const pct = processando ? progressoEstimado(job) : 100;
  const vertical = job.height > job.width;

  return (
    <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl overflow-hidden">
      <div className={`relative bg-black/40 ${vertical ? 'aspect-[9/16]' : 'aspect-video'}`}>
        {job.status === 'done' && job.video_url ? (
          // Sem `controls`: o clique abre o player grande, como no HeyGen. Os
          // controles minúsculos dentro de um card de 9:16 eram inúteis.
          <button onClick={onAbrir} className="w-full h-full group/v relative block">
            <video src={job.video_url} poster={job.thumbnail_url || undefined} muted preload="metadata"
              className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-black/25 group-hover/v:bg-black/45 transition-colors flex items-center justify-center">
              <div className="w-12 h-12 rounded-full bg-white/90 flex items-center justify-center shadow-lg
                              group-hover/v:scale-110 transition-transform">
                <Play size={20} className="text-slate-900 ml-1" />
              </div>
            </div>
          </button>
        ) : job.status === 'failed' ? (
          <div className="w-full h-full flex flex-col items-center justify-center gap-2 p-4 text-center">
            <X size={22} className="text-rose-400" />
            <p className="text-[11px] text-rose-400 font-bold">Falhou</p>
          </div>
        ) : (
          // Fundo preto sempre, nos dois temas: as partículas violeta só têm
          // contraste no escuro, e o card de geração fica com a mesma cara do
          // vídeo pronto (que também é preto por baixo do quadro).
          <div className="w-full h-full relative overflow-hidden bg-[#08070d]">
            {/* Névoa desfocada: dois borrões grandes em blur, que a respiração
                das partículas atravessa. É o que tira o "preto chapado". */}
            <div className="absolute -inset-8 blur-3xl opacity-70">
              <div className="absolute inset-x-0 top-1/4 h-1/2 bg-violet-700/40 rounded-full" />
              <div className="absolute left-1/4 bottom-0 w-1/2 h-1/3 bg-fuchsia-700/30 rounded-full" />
            </div>
            {/* brilho percorrendo o card, como o placeholder do HeyGen */}
            <div className="absolute inset-0 -translate-x-full animate-[brilho_1.8s_infinite]
                            bg-gradient-to-r from-transparent via-white/10 to-transparent" />
            {/* Nuvem de partículas em anel — o mesmo desenho do Alfred pensando.
                Fica por baixo do número, ocupando o card inteiro. */}
            <div className="absolute inset-0 text-violet-300">
              <EsferaDeParticulas estado="anel" quantidade={900} />
            </div>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-3xl font-black text-white drop-shadow-lg">{pct}%</p>
              <p className="text-[10px] font-bold tracking-wide text-violet-200/80 mt-0.5">
                gerando
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="p-3">
        <p className="text-xs font-bold text-dark-text truncate">{job.projeto || 'Projeto'}</p>
        <p className="text-[10px] text-slate-500 truncate">
          {job.avatar_name}{job.duration_ms ? ` · ${fmtDuracao(job.duration_ms)}` : ''}
        </p>
        {/* Quem gerou. A fila do superadmin/diretor mistura os heads, então sem
            isto não dá para saber de quem é o vídeo. */}
        {job.autor && (
          <p className="text-[10px] text-slate-500 truncate flex items-center gap-1 mt-0.5" title={job.autor}>
            <UserSquare2 size={10} className="shrink-0 text-slate-500" /> {job.autor}
          </p>
        )}

        {processando && (
          <>
            <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
              <div className="h-full bg-violet-500 rounded-full transition-all duration-1000" style={{ width: `${pct}%` }} />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">Gerando no HeyGen · estimativa</p>
          </>
        )}
        {job.status === 'done' && (
          <a href={job.video_url || '#'} download
            className="mt-2 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-lg bg-black/5 dark:bg-white/5 hover:bg-violet-600 hover:text-white text-[11px] font-bold text-slate-400 transition-colors">
            <Download size={12} /> Baixar
          </a>
        )}
        {job.status === 'failed' && job.error && (
          <p className="text-[10px] text-rose-400 mt-2 line-clamp-2" title={job.error}>{job.error}</p>
        )}
      </div>
    </div>
  );
};

// ─── Indicador de créditos ───────────────────────────────────────────────────
// Quem manda na operação (superadmin e diretor operacional) vê o saldo da CONTA
// no HeyGen; o head vê só a fatia dele. MOCK: os números viram fetch quando o
// backend de cotas existir.

const fmtBRL = (v: number) =>
  v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL', maximumFractionDigits: 2 });

// Períodos prontos. O teto é mensal, então "mês" é o único recorte em que a
// porcentagem significa alguma coisa — o backend só devolve `pct` nesse caso.
function periodos() {
  const hoje = new Date();
  const iso = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  const primeiro = (ano: number, mes: number) => iso(new Date(ano, mes, 1));
  const ultimo = (ano: number, mes: number) => iso(new Date(ano, mes + 1, 0));
  const y = hoje.getFullYear(), m = hoje.getMonth();
  const mesPassado = new Date(y, m - 1, 1);
  return [
    { id: 'mes',      rotulo: 'Este mês',        de: primeiro(y, m), ate: iso(hoje) },
    { id: 'anterior', rotulo: 'Mês passado',     de: primeiro(mesPassado.getFullYear(), mesPassado.getMonth()),
                                                 ate: ultimo(mesPassado.getFullYear(), mesPassado.getMonth()) },
    { id: 'ano',      rotulo: 'Este ano',        de: `${y}-01-01`, ate: iso(hoje) },
  ];
}

interface Gastos {
  visao: 'conta' | 'pessoal';
  periodo: { de: string; ate: string; mes_inteiro: boolean };
  usd: number; brl: number; videos: number;
  teto_brl: number; pct: number | null; cambio: number;
  por_pessoa: {
    email: string; nome: string; usd: number; brl: number; videos: number;
    segundos: number; modo: 'valor' | 'videos' | null; limite: number;
  }[];
}

const IndicadorGastos: React.FC<{ visaoDaConta: boolean; recarregar: number }> = ({ visaoDaConta, recarregar }) => {
  const opcoes = useMemo(() => periodos(), []);
  const [idPeriodo, setIdPeriodo] = useState('mes');
  const [custom, setCustom] = useState<{ de: string; ate: string } | null>(null);
  const [dados, setDados] = useState<Gastos | null>(null);
  const [abrirDetalhe, setAbrirDetalhe] = useState(false);

  const faixa = custom || opcoes.find(o => o.id === idPeriodo) || opcoes[0];

  useEffect(() => {
    fetch(`/api/estudio/gastos?de=${faixa.de}&ate=${faixa.ate}`)
      .then(r => r.ok ? r.json() : null)
      .then(d => setDados(d))
      .catch(() => {});
  }, [faixa.de, faixa.ate, recarregar]);

  const pct = dados?.pct ?? null;
  // A escala é de GASTO, não de saldo: verde enquanto sobra, vermelho quando
  // passou. Invertida em relação à barra de crédito que existia aqui antes.
  const cor = pct === null ? 'text-dark-text' : pct >= 100 ? 'text-rose-400' : pct >= 80 ? 'text-amber-400' : 'text-emerald-400';
  const barra = pct === null ? 'bg-violet-500' : pct >= 100 ? 'bg-rose-500' : pct >= 80 ? 'bg-amber-500' : 'bg-emerald-500';

  return (
    <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl px-4 py-3 min-w-[260px] relative">
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <Coins size={13} className="text-slate-500 shrink-0" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest truncate">
            {visaoDaConta ? 'Gasto da conta' : 'Seu gasto'}
          </span>
        </div>
        <select
          value={custom ? 'custom' : idPeriodo}
          onChange={e => {
            if (e.target.value === 'custom') { setCustom({ de: faixa.de, ate: faixa.ate }); return; }
            setCustom(null); setIdPeriodo(e.target.value);
          }}
          className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-1.5 py-0.5 text-[10px] font-bold text-slate-400 focus:outline-none focus:border-violet-500/60">
          {opcoes.map(o => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
          <option value="custom">Escolher datas…</option>
        </select>
      </div>

      {custom && (
        <div className="flex items-center gap-1 mt-2">
          <input type="date" value={custom.de} max={custom.ate}
            onChange={e => setCustom({ ...custom, de: e.target.value })}
            className="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-dark-text focus:outline-none" />
          <span className="text-[10px] text-slate-500">até</span>
          <input type="date" value={custom.ate} min={custom.de}
            onChange={e => setCustom({ ...custom, ate: e.target.value })}
            className="flex-1 min-w-0 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-1.5 py-1 text-[10px] text-dark-text focus:outline-none" />
        </div>
      )}

      <p className="mt-1.5 leading-none">
        <span className={`text-2xl font-black ${cor}`}>{fmtBRL(dados?.brl || 0)}</span>
        {!!dados?.teto_brl && dados.periodo.mes_inteiro && (
          <span className="text-sm font-bold text-slate-500"> / {fmtBRL(dados.teto_brl)}</span>
        )}
      </p>

      {pct !== null && (
        <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
          <div className={`h-full rounded-full transition-all ${barra}`} style={{ width: `${Math.min(100, pct)}%` }} />
        </div>
      )}

      {/* Rodapé numa linha só: os números à esquerda, o botão à direita. Em
          linhas separadas o card ficava mais alto que o bloco do título e
          empurrava o cabeçalho inteiro para baixo. */}
      <div className="mt-1.5 flex items-center justify-between gap-2">
        <p className="text-[10px] text-slate-500 truncate">
          {pct !== null && <><b className={cor}>{pct}%</b> do teto · </>}
          {dados?.videos || 0} vídeo{(dados?.videos || 0) === 1 ? '' : 's'}
          {dados ? ` · US$ ${dados.usd.toFixed(2)}` : ''}
        </p>
        {/* Quebra por pessoa: só faz sentido para quem vê a conta inteira. */}
        {visaoDaConta && (
          <button onClick={() => setAbrirDetalhe(true)}
            className="flex items-center gap-1 px-2 py-1 rounded-lg shrink-0
                       bg-black/5 dark:bg-white/5 hover:bg-violet-600 hover:text-white
                       text-[10px] font-bold text-slate-400 transition-colors">
            <Users size={11} /> Por pessoa
          </button>
        )}
      </div>

      <AnimatePresence>
        {abrirDetalhe && dados && (
          <ModalGastoPorPessoa
            dados={dados}
            opcoes={opcoes}
            idPeriodo={custom ? 'custom' : idPeriodo}
            onPeriodo={id => {
              if (id === 'custom') { setCustom({ de: faixa.de, ate: faixa.ate }); return; }
              setCustom(null); setIdPeriodo(id);
            }}
            custom={custom}
            onCustom={setCustom}
            onFechar={() => setAbrirDetalhe(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// ─── Popup: quem gastou o quê ────────────────────────────────────────────────
// Só quem enxerga a conta inteira (superadmin e diretor operacional) chega aqui.

const ModalGastoPorPessoa: React.FC<{
  dados: Gastos;
  opcoes: { id: string; rotulo: string; de: string; ate: string }[];
  idPeriodo: string;
  onPeriodo: (id: string) => void;
  custom: { de: string; ate: string } | null;
  onCustom: (v: { de: string; ate: string }) => void;
  onFechar: () => void;
}> = ({ dados, opcoes, idPeriodo, onPeriodo, custom, onCustom, onFechar }) => {
  const maior = Math.max(1, ...dados.por_pessoa.map(p => p.brl));
  const dia = (iso: string) => iso.split('-').reverse().join('/');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.97 }}
        className="w-full max-w-2xl bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl flex flex-col max-h-[85vh]"
        onClick={e => e.stopPropagation()}>

        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-start justify-between gap-4">
          <div className="min-w-0">
            <h3 className="text-lg font-black text-dark-text">Gasto por pessoa</h3>
            <p className="text-xs text-slate-500 mt-0.5">
              {dia(dados.periodo.de)} a {dia(dados.periodo.ate)} · {fmtBRL(dados.brl)} no total
              {' '}· US$ {dados.usd.toFixed(2)} a {dados.cambio.toFixed(2)}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <select value={idPeriodo} onChange={e => onPeriodo(e.target.value)}
              className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-2 py-1.5 text-[11px] font-bold text-dark-text focus:outline-none focus:border-violet-500/60">
              {opcoes.map(o => <option key={o.id} value={o.id}>{o.rotulo}</option>)}
              <option value="custom">Escolher datas…</option>
            </select>
            <button onClick={onFechar} className="text-slate-400 hover:text-dark-text"><X size={18} /></button>
          </div>
        </div>

        {custom && (
          <div className="px-5 pt-3 flex items-center gap-2">
            <input type="date" value={custom.de} max={custom.ate}
              onChange={e => onCustom({ ...custom, de: e.target.value })}
              className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-dark-text focus:outline-none" />
            <span className="text-xs text-slate-500">até</span>
            <input type="date" value={custom.ate} min={custom.de}
              onChange={e => onCustom({ ...custom, ate: e.target.value })}
              className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-2 py-1.5 text-xs text-dark-text focus:outline-none" />
          </div>
        )}

        <div className="p-5 overflow-y-auto space-y-3">
          {dados.por_pessoa.length === 0 ? (
            <p className="text-sm text-slate-500 text-center py-10">Nenhum vídeo gerado neste período.</p>
          ) : dados.por_pessoa.map(p => {
            // Barra relativa a quem mais gastou — compara as pessoas entre si.
            // Quando a pessoa tem teto em reais, a régua passa a ser o teto dela.
            const temTeto = p.modo === 'valor' && p.limite > 0;
            const pct = temTeto
              ? Math.min(100, (p.brl / p.limite) * 100)
              : (p.brl / maior) * 100;
            const estourou = temTeto && p.brl > p.limite;
            const min = Math.floor(p.segundos / 60);
            const seg = p.segundos % 60;

            return (
              <div key={p.email} className="rounded-xl border border-black/10 dark:border-white/10 p-3">
                <div className="flex items-baseline justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-dark-text truncate">{p.nome}</p>
                    <p className="text-[10px] text-slate-500 truncate">
                      {p.videos} vídeo{p.videos === 1 ? '' : 's'}
                      {p.segundos > 0 && ` · ${min > 0 ? `${min}m ` : ''}${seg}s de render`}
                      {' '}· US$ {p.usd.toFixed(2)}
                    </p>
                  </div>
                  <p className={`text-base font-black shrink-0 ${estourou ? 'text-rose-400' : 'text-dark-text'}`}>
                    {fmtBRL(p.brl)}
                    {temTeto && <span className="text-[11px] font-bold text-slate-500"> / {fmtBRL(p.limite)}</span>}
                  </p>
                </div>
                <div className="mt-2 h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                  <div className={`h-full rounded-full transition-all ${estourou ? 'bg-rose-500' : temTeto ? 'bg-emerald-500' : 'bg-violet-500'}`}
                    style={{ width: `${pct}%` }} />
                </div>
                {p.modo === 'videos' && p.limite > 0 && (
                  <p className="mt-1 text-[10px] text-slate-500">
                    Teto em quantidade: {p.videos} de {p.limite} vídeos.
                  </p>
                )}
              </div>
            );
          })}
        </div>

        <div className="px-5 py-3 border-t border-black/10 dark:border-white/10">
          <p className="text-[10px] text-slate-500">
            O teto de cada pessoa e o da conta ficam em <b>Configurações › Gastos</b>. Ao bater no teto,
            a geração é barrada antes de enviar ao HeyGen — que cobra no envio, não na conclusão.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Página ──────────────────────────────────────────────────────────────────

const Estudio: React.FC = () => {
  const { userData } = useAuth();
  const [projetos, setProjetos] = useState<Projeto[]>([]);
  const [tipos, setTipos] = useState<TipoRoteiroApi[]>([]);
  const [avatares, setAvatares] = useState<AvatarApi[]>([]);
  const [ambiencias, setAmbiencias] = useState<AmbienciaApi[]>([]);
  const [aberto, setAberto] = useState(false);
  const [config, setConfig] = useState(false);
  const [fila, setFila] = useState<VideoJob[]>([]);
  const [lightbox, setLightbox] = useState<number | null>(null);

  // O lightbox navega entre os vídeos prontos; os que ainda processam ficam fora.
  const prontos = useMemo(() => fila.filter(j => j.status === 'done' && j.video_url), [fila]);
  const arquivosLb: LbFile[] = prontos.map(j => ({
    name: `${j.projeto || 'Projeto'} — ${j.avatar_name || 'avatar'}.mp4`,
    url: j.video_url as string,
    type: 'video/mp4',
  }));

  // Card de mentira só para ver a animação de geração, atrás de um sinalizador
  // na URL (?demo=estudio). Vive no estado do front e NUNCA vai para o banco —
  // dado de exemplo solto em componente já virou cliente de verdade aqui antes.
  const cardDeDemonstracao = useMemo<VideoJob | null>(() => {
    if (typeof window === 'undefined') return null;
    if (new URLSearchParams(window.location.search).get('demo') !== 'estudio') return null;
    return {
      id: 'demo', status: 'processing',
      avatar_name: 'Demonstração', projeto: 'Exemplo · animação', script: null,
      autor: userData?.name || 'Você',
      video_url: null, thumbnail_url: null, error: null,
      width: 720, height: 1280, duration_ms: 30000,
      // Dois minutos atrás: a estimativa já começa com a barra andada, em vez
      // de ficar em 0% enquanto se olha.
      created_at: new Date(Date.now() - 120000).toISOString(),
    };
  }, [userData?.name]);

  const filaExibida = useMemo(
    () => (cardDeDemonstracao ? [cardDeDemonstracao, ...fila] : fila),
    [cardDeDemonstracao, fila],
  );

  const carregarFila = useCallback(async () => {
    try {
      const r = await fetch('/api/estudio/videos');
      if (r.ok) setFila(await r.json());
    } catch { /* silencioso: é polling de fundo */ }
  }, []);

  useEffect(() => { void carregarFila(); }, [carregarFila]);

  // Enquanto houver vídeo processando, recarrega a cada 10s. Sem nada na fila,
  // para de bater no servidor.
  useEffect(() => {
    const processando = fila.some(j => j.status === 'processing' || j.status === 'pending');
    if (!processando) return;
    const t = setInterval(() => { void carregarFila(); }, 10000);
    return () => clearInterval(t);
  }, [fila, carregarFila]);

  // Catálogo (tipos de copy, vozes, avatares) e cotas são configuração de
  // operação — só o super admin mexe.
  const ehSuperadmin = userData?.role === 'superadmin';
  // Jean (superadmin) e Adriano (diretor-operacional) enxergam o saldo da conta
  // inteira; head vê o próprio teto.
  const veSaldoDaConta = ehSuperadmin || userData?.role === 'diretor-operacional';

  useEffect(() => {
    fetch('/api/projects')
      .then(r => r.ok ? r.json() : [])
      .then((d: any[]) => setProjetos(
        (Array.isArray(d) ? d : [])
          .map(p => ({ id: String(p.id), partner: p.partner, client_ref: p.activeClientId || null }))
          .sort((a, b) => a.partner.localeCompare(b.partner, 'pt-BR'))
      ))
      .catch(() => {});

    // Catálogo: só entram avatares ativos e COM voz — sem voz não há como gerar.
    fetch('/api/estudio/catalogo')
      .then(r => r.ok ? r.json() : { tipos: [], avatares: [] })
      .then(d => { setTipos(d.tipos || []); setAvatares(d.avatares || []); setAmbiencias(d.ambiencias || []); })
      .catch(() => {});
  }, []);

  return (
    <div className="min-h-screen bg-dark-bg">
      <style>{`@keyframes brilho { 100% { transform: translateX(100%); } }`}</style>
      <div className="px-6 pt-6 pb-4 flex items-center justify-between gap-4 flex-wrap">
        <SplitHeadline text="Estúdio de " highlight="Vídeo"
          subtitle="Copy, locução e avatar para os anúncios dos clientes"
          subtitleClassName="text-sm text-gray-500 dark:text-gray-400 mt-1" />
        <div className="flex items-center gap-3 flex-wrap">
        <IndicadorGastos visaoDaConta={veSaldoDaConta} recarregar={fila.length} />
        {ehSuperadmin && (
          <button onClick={() => setConfig(true)}
            className="flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-black/10 dark:border-white/10 text-slate-400 hover:text-dark-text hover:border-violet-500/40 text-sm font-bold transition-colors">
            <Settings size={15} /> Configurações
          </button>
        )}
        </div>
      </div>

      <div className="px-6 pb-10 space-y-6">
        {/* Botão único e grande: é a ação da página inteira. */}
        <motion.button whileHover={{ y: -2 }} whileTap={{ scale: 0.995 }} onClick={() => setAberto(true)}
          className="w-full rounded-3xl p-10 sm:p-14 flex flex-col items-center justify-center gap-4 text-center transition-colors
                     bg-gradient-to-br from-violet-600 to-fuchsia-600 hover:from-violet-500 hover:to-fuchsia-500 shadow-2xl shadow-violet-900/30">
          <div className="w-16 h-16 rounded-2xl bg-white/15 flex items-center justify-center">
            <Sparkles size={30} className="text-white" />
          </div>
          <span className="text-2xl sm:text-3xl font-black text-white">Gerar vídeo com IA</span>
          <span className="text-sm text-white/70 max-w-md">
            Copy → avatar → locução → vídeo. O resultado vai direto para a página do projeto.
          </span>
        </motion.button>

        {filaExibida.length === 0 ? (
          <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-12 flex flex-col items-center gap-3 text-center">
            <Clapperboard size={30} className="text-slate-600" />
            <p className="text-sm font-bold text-dark-text">Nenhum vídeo gerado ainda</p>
            <p className="text-xs text-slate-500 max-w-md">
              Os vídeos aparecem aqui enquanto processam e, quando ficam prontos, vão para a aba Criativos do projeto.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
            {filaExibida.map(job => (
              <CardVideo key={job.id} job={job}
                onAbrir={() => setLightbox(prontos.findIndex(p => p.id === job.id))} />
            ))}
          </div>
        )}
      </div>

      <AnimatePresence>
        {aberto && <ModalGeracao projetos={projetos} tipos={tipos} avatares={avatares} ambiencias={ambiencias}
          onFechar={() => { setAberto(false); void carregarFila(); }} />}
        {config && <EstudioConfig onFechar={() => setConfig(false)} />}
      </AnimatePresence>

      {lightbox !== null && lightbox >= 0 && arquivosLb[lightbox] && (
        <MediaLightbox files={arquivosLb} index={lightbox}
          onClose={() => setLightbox(null)} onIndex={i => setLightbox(i)} />
      )}
    </div>
  );
};

export default Estudio;
