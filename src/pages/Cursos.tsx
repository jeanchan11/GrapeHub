import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import SplitHeadline from '../components/SplitHeadline';
import { toast } from '@/src/lib/toast';
import { confirmDialog } from '@/src/lib/confirm';
import {
  Plus, Play, CheckCircle2, Circle, ChevronLeft, ChevronDown, ChevronRight,
  Trash2, Edit2, X, Upload, Loader2, BarChart3, Clock, GraduationCap,
  FileText, Users, Eye, EyeOff,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Aula {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  video_path: string | null;
  duration_seconds: number;
  materials: { name: string; url: string }[];
  order_index: number;
  watched_seconds?: number | null;
  last_position?: number | null;
  completed?: boolean | null;
}

interface Modulo {
  id: number;
  course_id: number;
  title: string;
  order_index: number;
  aulas: Aula[];
}

interface Curso {
  id: number;
  title: string;
  description: string | null;
  cover_url: string | null;
  area: string | null;
  status: 'rascunho' | 'publicado' | 'arquivado';
  total_aulas: number;
  duracao_total: number;
  aulas_concluidas: number;
  tempo_assistido: number;
}

interface LinhaRelatorio {
  colaborador_id: number;
  nome: string;
  cargo: string | null;
  email: string;
  aulas_concluidas: number;
  tempo_assistido: number;
  percentual: number;
  dias_para_concluir: number | null;
  ultimo_acesso: string | null;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const fmtDuracao = (seg: number): string => {
  const s = Math.max(0, Math.round(seg || 0));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  if (h > 0) return `${h}h ${String(m).padStart(2, '0')}min`;
  if (m > 0) return `${m}min`;
  return `${s}s`;
};

const fmtData = (iso: string | null): string =>
  iso ? new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' }) : '—';

const Barra: React.FC<{ pct: number; className?: string }> = ({ pct, className = '' }) => (
  <div className={`h-1.5 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden ${className}`}>
    <div
      className={`h-full rounded-full transition-all duration-500 ${pct >= 100 ? 'bg-emerald-500' : 'bg-violet-500'}`}
      style={{ width: `${Math.min(100, Math.max(0, pct))}%` }}
    />
  </div>
);

// ─── Player ──────────────────────────────────────────────────────────────────
// Conta só o tempo REALMENTE assistido: soma os avanços pequenos e contínuos do
// vídeo. Pular pra frente na barra gera um salto grande, que é descartado — sem
// isso qualquer um "concluiria" o curso arrastando o cursor até o fim.

const Player: React.FC<{
  aula: Aula;
  onProgresso: (aulaId: number, dados: { watched_seconds: number; completed: boolean }) => void;
  onDuracaoDetectada: (aulaId: number, segundos: number) => void;
  podeEditar: boolean;
}> = ({ aula, onProgresso, onDuracaoDetectada, podeEditar }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const ultimoTempo = useRef<number>(0);
  const acumulado = useRef<number>(0);   // segundos ainda não enviados ao servidor
  const enviando = useRef<boolean>(false);

  const enviar = useCallback(async (ended = false) => {
    const delta = acumulado.current;
    if (!ended && delta < 1) return;
    if (enviando.current) return;
    enviando.current = true;
    acumulado.current = 0;
    try {
      const r = await fetch(`/api/cursos/aulas/${aula.id}/progresso`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          delta_seconds: delta,
          position: videoRef.current?.currentTime || 0,
          ended,
        }),
      });
      if (r.ok) {
        const p = await r.json();
        onProgresso(aula.id, { watched_seconds: p.watched_seconds, completed: !!p.completed });
      }
    } catch {
      acumulado.current += delta; // devolve pra tentar no próximo ciclo
    } finally {
      enviando.current = false;
    }
  }, [aula.id, onProgresso]);

  // Retoma de onde parou e zera o contador ao trocar de aula.
  useEffect(() => {
    acumulado.current = 0;
    ultimoTempo.current = 0;
    const v = videoRef.current;
    if (v && aula.last_position && aula.last_position > 3) {
      const retomar = () => { v.currentTime = aula.last_position || 0; v.removeEventListener('loadedmetadata', retomar); };
      v.addEventListener('loadedmetadata', retomar);
    }
  }, [aula.id]);

  // Envia o que sobrou a cada 15s e ao sair da aula.
  useEffect(() => {
    const t = setInterval(() => { void enviar(); }, 15000);
    return () => { clearInterval(t); void enviar(); };
  }, [enviar]);

  const handleTimeUpdate = () => {
    const v = videoRef.current;
    if (!v || v.paused) return;
    const agora = v.currentTime;
    const delta = agora - ultimoTempo.current;
    // Avanço plausível de reprodução normal (inclui até 2x de velocidade).
    if (delta > 0 && delta < 2.5) acumulado.current += delta;
    ultimoTempo.current = agora;
  };

  if (!aula.video_url) {
    return (
      <div className="aspect-video rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col items-center justify-center gap-2">
        <Play size={28} className="text-slate-500" />
        <p className="text-sm text-slate-500">
          {podeEditar ? 'Esta aula ainda não tem vídeo. Edite a aula para enviar.' : 'Vídeo ainda não disponível.'}
        </p>
      </div>
    );
  }

  return (
    <video
      ref={videoRef}
      src={aula.video_url}
      controls
      controlsList="nodownload"
      className="w-full aspect-video rounded-2xl bg-black"
      onTimeUpdate={handleTimeUpdate}
      onSeeking={() => { ultimoTempo.current = videoRef.current?.currentTime || 0; }}
      onPause={() => { void enviar(); }}
      onEnded={() => { void enviar(true); }}
      onLoadedMetadata={(e) => {
        const d = Math.round((e.target as HTMLVideoElement).duration || 0);
        // A duração real do arquivo só é conhecida no navegador; grava uma vez.
        if (d > 0 && Math.abs(d - aula.duration_seconds) > 2) onDuracaoDetectada(aula.id, d);
      }}
    />
  );
};

// ─── Modal de aula (admin) ───────────────────────────────────────────────────

const AulaModal: React.FC<{
  aula: Partial<Aula> & { module_id: number };
  cursoId: number;
  onSalvar: (dados: any) => Promise<void>;
  onFechar: () => void;
}> = ({ aula, cursoId, onSalvar, onFechar }) => {
  const [title, setTitle] = useState(aula.title || '');
  const [description, setDescription] = useState(aula.description || '');
  const [videoUrl, setVideoUrl] = useState(aula.video_url || '');
  const [videoPath, setVideoPath] = useState(aula.video_path || '');
  const [duracao, setDuracao] = useState(aula.duration_seconds || 0);
  const [progresso, setProgresso] = useState<number | null>(null);
  const [salvando, setSalvando] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const enviarVideo = async (file: File) => {
    if (!file.type.startsWith('video/')) { toast.error('Selecione um arquivo de vídeo.'); return; }
    setProgresso(0);
    try {
      const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `cursos/${cursoId}/${Date.now()}-${safe}`;
      const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type });
      await new Promise<void>((resolve, reject) => {
        task.on('state_changed',
          (snap) => setProgresso(Math.round((snap.bytesTransferred / snap.totalBytes) * 100)),
          reject,
          () => resolve(),
        );
      });
      const url = await getDownloadURL(task.snapshot.ref);
      // Lê a duração no navegador antes de salvar — o servidor não abre o vídeo.
      const dur = await new Promise<number>((resolve) => {
        const v = document.createElement('video');
        v.preload = 'metadata';
        v.onloadedmetadata = () => resolve(Math.round(v.duration || 0));
        v.onerror = () => resolve(0);
        v.src = URL.createObjectURL(file);
      });
      setVideoUrl(url);
      setVideoPath(path);
      if (dur > 0) setDuracao(dur);
      toast.success('Vídeo enviado.');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar o vídeo.');
    } finally {
      setProgresso(null);
    }
  };

  const salvar = async () => {
    if (!title.trim()) { toast.error('Dê um título para a aula.'); return; }
    setSalvando(true);
    try {
      await onSalvar({
        title: title.trim(),
        description: description.trim() || null,
        video_url: videoUrl || null,
        video_path: videoPath || null,
        duration_seconds: duracao,
      });
      onFechar();
    } finally { setSalvando(false); }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onFechar}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-lg bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-dark-text">{aula.id ? 'Editar aula' : 'Nova aula'}</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-dark-text"><X size={18} /></button>
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Título</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} autoFocus
            className="w-full mt-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500/60" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Descrição</label>
          <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3}
            className="w-full mt-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text resize-none focus:outline-none focus:border-violet-500/60" />
        </div>

        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Vídeo</label>
          <input ref={fileRef} type="file" accept="video/*" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) void enviarVideo(f); e.target.value = ''; }} />
          {progresso !== null ? (
            <div className="mt-2 space-y-1.5">
              <Barra pct={progresso} />
              <p className="text-xs text-slate-500">Enviando… {progresso}%</p>
            </div>
          ) : videoUrl ? (
            <div className="mt-2 flex items-center gap-2">
              <span className="flex-1 text-xs text-emerald-400 font-semibold truncate">
                Vídeo carregado{duracao > 0 ? ` · ${fmtDuracao(duracao)}` : ''}
              </span>
              <button onClick={() => fileRef.current?.click()}
                className="px-3 py-1.5 rounded-lg text-xs font-bold border border-black/10 dark:border-white/10 text-slate-400 hover:text-dark-text">
                Trocar
              </button>
            </div>
          ) : (
            <button onClick={() => fileRef.current?.click()}
              className="mt-2 w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-sm font-bold text-slate-400 hover:text-dark-text hover:border-violet-500/50 transition-colors">
              <Upload size={15} /> Enviar arquivo de vídeo
            </button>
          )}
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button onClick={onFechar} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-dark-text">Cancelar</button>
          <button onClick={salvar} disabled={salvando || progresso !== null}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors">
            {salvando && <Loader2 size={14} className="animate-spin" />} Salvar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Relatório do gestor ─────────────────────────────────────────────────────

const Relatorio: React.FC<{ cursoId: number; onFechar: () => void }> = ({ cursoId, onFechar }) => {
  const [dados, setDados] = useState<{ total_aulas: number; duracao_total: number; colaboradores: LinhaRelatorio[] } | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    fetch(`/api/cursos/${cursoId}/relatorio`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setDados)
      .catch(() => toast.error('Falha ao carregar o relatório.'))
      .finally(() => setCarregando(false));
  }, [cursoId]);

  const concluidos = dados?.colaboradores.filter(c => c.percentual >= 100).length || 0;
  const naoIniciaram = dados?.colaboradores.filter(c => c.percentual === 0).length || 0;
  // Média de dias só entre quem terminou — incluir quem não terminou distorce.
  const mediaDias = useMemo(() => {
    const d = (dados?.colaboradores || []).map(c => c.dias_para_concluir).filter((x): x is number => x != null);
    return d.length ? Math.round(d.reduce((s, x) => s + x, 0) / d.length) : null;
  }, [dados]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onFechar}>
      <motion.div initial={{ opacity: 0, scale: 0.96 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-black text-dark-text">Acompanhamento da turma</h3>
          <button onClick={onFechar} className="text-slate-400 hover:text-dark-text"><X size={18} /></button>
        </div>

        {carregando ? (
          <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
        ) : !dados ? null : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              {[
                ['Concluíram', `${concluidos}/${dados.colaboradores.length}`, 'text-emerald-400'],
                ['Não iniciaram', String(naoIniciaram), naoIniciaram > 0 ? 'text-amber-400' : 'text-slate-400'],
                ['Média p/ concluir', mediaDias != null ? `${mediaDias} dias` : '—', 'text-violet-400'],
                ['Duração do curso', fmtDuracao(dados.duracao_total), 'text-blue-400'],
              ].map(([label, valor, cor]) => (
                <div key={label} className="bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-3">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</p>
                  <p className={`text-lg font-black mt-0.5 ${cor}`}>{valor}</p>
                </div>
              ))}
            </div>

            <div className="border border-black/10 dark:border-white/10 rounded-xl overflow-hidden">
              <div className="grid grid-cols-[1fr_110px_90px_100px_90px] px-4 py-2.5 bg-black/5 dark:bg-white/5 border-b border-black/10 dark:border-white/10">
                {['Colaborador', 'Progresso', 'Aulas', 'Tempo', 'Último acesso'].map((h, i) => (
                  <span key={h} className={`text-[10px] font-bold text-slate-500 uppercase tracking-wider ${i === 0 ? '' : 'text-center'}`}>{h}</span>
                ))}
              </div>
              {dados.colaboradores.map((c) => (
                <div key={c.colaborador_id}
                  className="grid grid-cols-[1fr_110px_90px_100px_90px] px-4 py-2.5 items-center border-b border-black/5 dark:border-white/5 last:border-0">
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-dark-text truncate">{c.nome}</p>
                    <p className="text-[11px] text-slate-500 truncate">{c.cargo || '—'}</p>
                  </div>
                  <div className="px-2">
                    <Barra pct={c.percentual} />
                    <p className={`text-[11px] font-bold text-center mt-1 ${c.percentual >= 100 ? 'text-emerald-400' : c.percentual === 0 ? 'text-slate-500' : 'text-violet-400'}`}>
                      {c.percentual}%
                    </p>
                  </div>
                  <span className="text-xs text-slate-400 text-center">{c.aulas_concluidas}/{dados.total_aulas}</span>
                  <span className="text-xs text-slate-400 text-center">{fmtDuracao(c.tempo_assistido)}</span>
                  <span className="text-xs text-slate-500 text-center">{fmtData(c.ultimo_acesso)}</span>
                </div>
              ))}
              {dados.colaboradores.length === 0 && (
                <p className="px-4 py-8 text-center text-sm text-slate-500">
                  Nenhum colaborador efetivado com login vinculado.
                </p>
              )}
            </div>
          </>
        )}
      </motion.div>
    </div>
  );
};

// ─── Página ──────────────────────────────────────────────────────────────────

const Cursos: React.FC = () => {
  const [cursos, setCursos] = useState<Curso[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [carregando, setCarregando] = useState(true);

  // Curso aberto
  const [cursoAtivo, setCursoAtivo] = useState<Curso | null>(null);
  const [modulos, setModulos] = useState<Modulo[]>([]);
  const [aulaAtiva, setAulaAtiva] = useState<Aula | null>(null);
  const [recolhidos, setRecolhidos] = useState<Set<number>>(new Set());

  const [modalAula, setModalAula] = useState<(Partial<Aula> & { module_id: number }) | null>(null);
  const [verRelatorio, setVerRelatorio] = useState(false);

  // ── Carregamento ──
  const carregarCatalogo = useCallback(async () => {
    setCarregando(true);
    try {
      const r = await fetch('/api/cursos');
      if (r.ok) {
        const d = await r.json();
        setCursos(d.cursos || []);
        setIsAdmin(!!d.is_admin);
      }
    } catch { toast.error('Falha ao carregar os cursos.'); }
    finally { setCarregando(false); }
  }, []);

  useEffect(() => { void carregarCatalogo(); }, [carregarCatalogo]);

  const abrirCurso = async (curso: Curso) => {
    setCursoAtivo(curso);
    setModulos([]);
    setAulaAtiva(null);
    try {
      const r = await fetch(`/api/cursos/${curso.id}`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      setModulos(d.modulos || []);
      // Abre direto na primeira aula não concluída — o colaborador continua de onde parou.
      const todas: Aula[] = (d.modulos || []).flatMap((m: Modulo) => m.aulas);
      setAulaAtiva(todas.find(a => !a.completed) || todas[0] || null);
    } catch { toast.error('Falha ao abrir o curso.'); }
  };

  const voltar = () => { setCursoAtivo(null); setAulaAtiva(null); void carregarCatalogo(); };

  // ── Progresso ──
  const aplicarProgresso = useCallback((aulaId: number, dados: { watched_seconds: number; completed: boolean }) => {
    setModulos(prev => prev.map(m => ({
      ...m,
      aulas: m.aulas.map(a => a.id === aulaId ? { ...a, ...dados } : a),
    })));
    setAulaAtiva(prev => prev && prev.id === aulaId ? { ...prev, ...dados } : prev);
  }, []);

  const gravarDuracao = useCallback(async (aulaId: number, segundos: number) => {
    if (!isAdmin) return; // só quem administra corrige o cadastro
    setModulos(prev => prev.map(m => ({
      ...m, aulas: m.aulas.map(a => a.id === aulaId ? { ...a, duration_seconds: segundos } : a),
    })));
    await fetch(`/api/cursos/aulas/${aulaId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ duration_seconds: segundos }),
    }).catch(() => {});
  }, [isAdmin]);

  // ── CRUD ──
  const criarCurso = async () => {
    const title = window.prompt('Nome do curso:');
    if (!title?.trim()) return;
    const r = await fetch('/api/cursos', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (r.ok) { toast.success('Curso criado como rascunho.'); void carregarCatalogo(); }
    else toast.error((await r.json().catch(() => ({}))).error || 'Falha ao criar curso.');
  };

  const alternarPublicacao = async () => {
    if (!cursoAtivo) return;
    const novo = cursoAtivo.status === 'publicado' ? 'rascunho' : 'publicado';
    const r = await fetch(`/api/cursos/${cursoAtivo.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status: novo }),
    });
    if (r.ok) {
      setCursoAtivo({ ...cursoAtivo, status: novo as Curso['status'] });
      toast.success(novo === 'publicado' ? 'Curso publicado para a equipe.' : 'Curso voltou a rascunho.');
    }
  };

  const excluirCurso = async () => {
    if (!cursoAtivo) return;
    if (!(await confirmDialog({ message: `Excluir "${cursoAtivo.title}" e todas as aulas? O progresso da equipe some junto.`, danger: true }))) return;
    const r = await fetch(`/api/cursos/${cursoAtivo.id}`, { method: 'DELETE' });
    if (r.ok) { toast.success('Curso excluído.'); voltar(); }
  };

  const criarModulo = async () => {
    if (!cursoAtivo) return;
    const title = window.prompt('Nome do módulo:');
    if (!title?.trim()) return;
    const r = await fetch(`/api/cursos/${cursoAtivo.id}/modulos`, {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: title.trim() }),
    });
    if (!r.ok) { toast.error('Falha ao criar módulo.'); return; }
    const mod = await r.json();
    setModulos(prev => [...prev, { ...mod, aulas: [] }]);
  };

  const excluirModulo = async (m: Modulo) => {
    if (!(await confirmDialog({ message: `Excluir o módulo "${m.title}" e suas aulas?`, danger: true }))) return;
    const r = await fetch(`/api/cursos/modulos/${m.id}`, { method: 'DELETE' });
    if (r.ok) {
      setModulos(prev => prev.filter(x => x.id !== m.id));
      setAulaAtiva(prev => prev && m.aulas.some(a => a.id === prev.id) ? null : prev);
    }
  };

  const salvarAula = async (dados: any) => {
    if (!modalAula) return;
    const editando = !!modalAula.id;
    const url = editando ? `/api/cursos/aulas/${modalAula.id}` : `/api/cursos/modulos/${modalAula.module_id}/aulas`;
    const r = await fetch(url, {
      method: editando ? 'PUT' : 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(dados),
    });
    if (!r.ok) { toast.error('Falha ao salvar a aula.'); return; }
    const aula: Aula = await r.json();
    setModulos(prev => prev.map(m => m.id !== modalAula.module_id ? m : {
      ...m,
      aulas: editando ? m.aulas.map(a => a.id === aula.id ? { ...a, ...aula } : a) : [...m.aulas, aula],
    }));
    setAulaAtiva(prev => editando && prev?.id === aula.id ? { ...prev, ...aula } : prev || aula);
    toast.success('Aula salva.');
  };

  const excluirAula = async (aula: Aula) => {
    if (!(await confirmDialog({ message: `Excluir a aula "${aula.title}"?`, danger: true }))) return;
    const r = await fetch(`/api/cursos/aulas/${aula.id}`, { method: 'DELETE' });
    if (!r.ok) return;
    // O arquivo no Storage continuaria ocupando espaço e cobrando; apaga junto.
    if (aula.video_path) { deleteObject(ref(storage, aula.video_path)).catch(() => {}); }
    setModulos(prev => prev.map(m => ({ ...m, aulas: m.aulas.filter(a => a.id !== aula.id) })));
    setAulaAtiva(prev => prev?.id === aula.id ? null : prev);
  };

  // ── Derivados ──
  const todasAulas = useMemo(() => modulos.flatMap(m => m.aulas), [modulos]);
  const pctCurso = todasAulas.length
    ? Math.round((todasAulas.filter(a => a.completed).length / todasAulas.length) * 100)
    : 0;

  // ── Catálogo ──
  if (!cursoAtivo) {
    return (
      <div className="min-h-screen bg-dark-bg">
        <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
          <SplitHeadline text="Central de " highlight="Treinamentos"
            subtitle="Trilhas de formação da equipe"
            subtitleClassName="text-sm text-gray-500 dark:text-gray-400 mt-1" />
          {isAdmin && (
            <button onClick={criarCurso}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
              <Plus size={15} /> Novo curso
            </button>
          )}
        </div>

        <div className="px-6 pb-10">
          {carregando ? (
            <div className="py-20 flex justify-center"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
          ) : cursos.length === 0 ? (
            <div className="py-20 flex flex-col items-center gap-3 text-center">
              <GraduationCap size={34} className="text-slate-600" />
              <p className="text-sm text-slate-500 max-w-sm">
                {isAdmin
                  ? 'Nenhum curso ainda. Crie o primeiro e monte a trilha de ramp-up da equipe.'
                  : 'Nenhum treinamento liberado para você no momento.'}
              </p>
            </div>
          ) : (
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {cursos.map(c => {
                const pct = c.total_aulas > 0 ? Math.round((c.aulas_concluidas / c.total_aulas) * 100) : 0;
                return (
                  <motion.button key={c.id} onClick={() => abrirCurso(c)}
                    whileHover={{ y: -3 }}
                    className="text-left bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-5 hover:border-violet-500/40 transition-colors">
                    <div className="flex items-start justify-between gap-2 mb-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-600/15 flex items-center justify-center shrink-0">
                        <GraduationCap size={18} className="text-violet-400" />
                      </div>
                      {c.status === 'rascunho' && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-400 bg-amber-500/10 px-2 py-1 rounded-lg">Rascunho</span>
                      )}
                      {pct >= 100 && (
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded-lg">Concluído</span>
                      )}
                    </div>
                    <h3 className="text-base font-black text-dark-text leading-snug">{c.title}</h3>
                    {c.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{c.description}</p>}
                    <div className="flex items-center gap-3 mt-3 text-[11px] text-slate-500">
                      <span className="flex items-center gap-1"><Play size={11} /> {c.total_aulas} aulas</span>
                      <span className="flex items-center gap-1"><Clock size={11} /> {fmtDuracao(c.duracao_total)}</span>
                    </div>
                    <div className="mt-3">
                      <Barra pct={pct} />
                      <p className="text-[11px] font-bold text-slate-400 mt-1.5">
                        {c.aulas_concluidas} de {c.total_aulas} · {pct}%
                      </p>
                    </div>
                  </motion.button>
                );
              })}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ── Curso aberto ──
  return (
    <div className="min-h-screen bg-dark-bg">
      <div className="px-6 pt-6 pb-4 flex items-start justify-between gap-4 flex-wrap">
        <div className="flex items-start gap-3 min-w-0">
          <button onClick={voltar}
            className="mt-1 p-2 rounded-xl border border-black/10 dark:border-white/10 text-slate-400 hover:text-dark-text transition-colors">
            <ChevronLeft size={16} />
          </button>
          <div className="min-w-0">
            <h1 className="text-2xl font-black text-dark-text truncate">{cursoAtivo.title}</h1>
            <div className="flex items-center gap-3 mt-1">
              <Barra pct={pctCurso} className="w-32" />
              <span className="text-xs font-bold text-slate-400">
                {todasAulas.filter(a => a.completed).length}/{todasAulas.length} aulas · {pctCurso}%
              </span>
            </div>
          </div>
        </div>

        {isAdmin && (
          <div className="flex items-center gap-2 flex-wrap">
            <button onClick={() => setVerRelatorio(true)}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 text-slate-400 hover:text-dark-text text-xs font-bold transition-colors">
              <BarChart3 size={14} /> Turma
            </button>
            <button onClick={alternarPublicacao}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors ${
                cursoAtivo.status === 'publicado'
                  ? 'border border-emerald-500/40 text-emerald-400 hover:bg-emerald-500/10'
                  : 'bg-violet-600 hover:bg-violet-500 text-white'
              }`}>
              {cursoAtivo.status === 'publicado' ? <><Eye size={14} /> Publicado</> : <><EyeOff size={14} /> Publicar</>}
            </button>
            <button onClick={criarModulo}
              className="flex items-center gap-2 px-3.5 py-2 rounded-xl border border-black/10 dark:border-white/10 text-slate-400 hover:text-dark-text text-xs font-bold transition-colors">
              <Plus size={14} /> Módulo
            </button>
            <button onClick={excluirCurso}
              className="p-2 rounded-xl border border-black/10 dark:border-white/10 text-slate-500 hover:text-rose-400 transition-colors">
              <Trash2 size={14} />
            </button>
          </div>
        )}
      </div>

      <div className="px-6 pb-10 grid lg:grid-cols-[1fr_340px] gap-5 items-start">
        {/* Player */}
        <div className="space-y-3">
          {aulaAtiva ? (
            <>
              <Player aula={aulaAtiva} onProgresso={aplicarProgresso}
                onDuracaoDetectada={gravarDuracao} podeEditar={isAdmin} />
              <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-5">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <h2 className="text-lg font-black text-dark-text">{aulaAtiva.title}</h2>
                    <div className="flex items-center gap-3 mt-1 text-[11px] text-slate-500">
                      {aulaAtiva.duration_seconds > 0 && (
                        <span className="flex items-center gap-1"><Clock size={11} /> {fmtDuracao(aulaAtiva.duration_seconds)}</span>
                      )}
                      {aulaAtiva.completed
                        ? <span className="flex items-center gap-1 text-emerald-400 font-bold"><CheckCircle2 size={11} /> Concluída</span>
                        : (aulaAtiva.watched_seconds || 0) > 0 && <span>Você assistiu {fmtDuracao(aulaAtiva.watched_seconds || 0)}</span>}
                    </div>
                  </div>
                  {isAdmin && (
                    <button onClick={() => setModalAula(aulaAtiva)}
                      className="p-2 rounded-lg text-slate-500 hover:text-violet-400 transition-colors shrink-0">
                      <Edit2 size={14} />
                    </button>
                  )}
                </div>
                {aulaAtiva.description && (
                  <p className="text-sm text-slate-400 mt-3 whitespace-pre-wrap leading-relaxed">{aulaAtiva.description}</p>
                )}
              </div>
            </>
          ) : (
            <div className="aspect-video rounded-2xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex flex-col items-center justify-center gap-2">
              <FileText size={28} className="text-slate-500" />
              <p className="text-sm text-slate-500">
                {isAdmin ? 'Crie um módulo e a primeira aula para começar.' : 'Este curso ainda não tem aulas.'}
              </p>
            </div>
          )}
        </div>

        {/* Índice */}
        <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-3 space-y-1.5 lg:max-h-[calc(100vh-180px)] lg:overflow-y-auto">
          {modulos.map(m => {
            const fechado = recolhidos.has(m.id);
            const feitas = m.aulas.filter(a => a.completed).length;
            return (
              <div key={m.id}>
                <div className="flex items-center gap-1 px-2 py-2">
                  <button onClick={() => setRecolhidos(prev => {
                    const n = new Set(prev); n.has(m.id) ? n.delete(m.id) : n.add(m.id); return n;
                  })} className="flex items-center gap-1.5 flex-1 min-w-0 text-left">
                    {fechado ? <ChevronRight size={13} className="text-slate-500 shrink-0" /> : <ChevronDown size={13} className="text-slate-500 shrink-0" />}
                    <span className="text-xs font-black text-dark-text uppercase tracking-wide truncate">{m.title}</span>
                    <span className="text-[10px] text-slate-500 shrink-0">{feitas}/{m.aulas.length}</span>
                  </button>
                  {isAdmin && (
                    <>
                      <button onClick={() => setModalAula({ module_id: m.id })}
                        className="p-1 text-slate-500 hover:text-violet-400 transition-colors"><Plus size={13} /></button>
                      <button onClick={() => excluirModulo(m)}
                        className="p-1 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={12} /></button>
                    </>
                  )}
                </div>

                {!fechado && m.aulas.map(a => {
                  const ativa = aulaAtiva?.id === a.id;
                  return (
                    <div key={a.id} className="flex items-center gap-1 group">
                      <button onClick={() => setAulaAtiva(a)}
                        className={`flex-1 flex items-center gap-2.5 min-w-0 px-2.5 py-2 rounded-xl text-left transition-colors ${
                          ativa ? 'bg-violet-600/15 border border-violet-500/30' : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
                        }`}>
                        {a.completed
                          ? <CheckCircle2 size={14} className="text-emerald-400 shrink-0" />
                          : <Circle size={14} className={`shrink-0 ${ativa ? 'text-violet-400' : 'text-slate-600'}`} />}
                        <span className={`text-xs truncate ${ativa ? 'font-bold text-dark-text' : 'text-slate-400'}`}>{a.title}</span>
                        {a.duration_seconds > 0 && (
                          <span className="text-[10px] text-slate-500 ml-auto shrink-0">{fmtDuracao(a.duration_seconds)}</span>
                        )}
                      </button>
                      {isAdmin && (
                        <button onClick={() => excluirAula(a)}
                          className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={11} /></button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })}
          {modulos.length === 0 && (
            <p className="px-3 py-8 text-center text-xs text-slate-500">
              {isAdmin ? 'Nenhum módulo. Clique em "Módulo" acima.' : 'Curso em montagem.'}
            </p>
          )}
        </div>
      </div>

      <AnimatePresence>
        {modalAula && (
          <AulaModal aula={modalAula} cursoId={cursoAtivo.id}
            onSalvar={salvarAula} onFechar={() => setModalAula(null)} />
        )}
        {verRelatorio && <Relatorio cursoId={cursoAtivo.id} onFechar={() => setVerRelatorio(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Cursos;
