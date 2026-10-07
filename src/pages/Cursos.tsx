import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import SplitHeadline from '../components/SplitHeadline';
import { toast } from '@/src/lib/toast';
import { confirmDialog } from '@/src/lib/confirm';
import { useAuth } from '../contexts/AuthContext';
import { DndContext, closestCenter, PointerSensor, KeyboardSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { SortableContext, verticalListSortingStrategy, useSortable, arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import confetti from 'canvas-confetti';
import {
  Plus, Play, CheckCircle2, Circle, ChevronLeft, ChevronDown, ChevronRight,
  Trash2, Edit2, X, Upload, Loader2, BarChart3, Clock, GraduationCap,
  FileText, Users, Eye, EyeOff, MessageSquare, Send, AlignLeft, Hand, Undo2, GripVertical,
  Paperclip, Download, FileImage, FileVideo, FileAudio, FileArchive, FileSpreadsheet, Sparkles, ArrowRight, BookOpen, Trophy,
} from 'lucide-react';

// ─── Tipos ───────────────────────────────────────────────────────────────────

// Anexo da aula (qualquer tipo). `path` = caminho no Storage, para apagar junto.
interface Material { name: string; url: string; path?: string; size?: number; type?: string }

interface Aula {
  id: number;
  module_id: number;
  title: string;
  description: string | null;
  video_url: string | null;
  video_path: string | null;
  duration_seconds: number;
  materials: Material[];
  order_index: number;
  watched_seconds?: number | null;
  last_position?: number | null;
  completed?: boolean | null;
  completed_via?: 'assistiu' | 'manual' | null;
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
  concluidas_manual?: number;
  aulas?: {
    lesson_id: number; titulo: string; modulo: string;
    concluida: boolean; via: 'assistiu' | 'manual' | null; em: string | null;
    marcado_por: string | null; assistido: number;
  }[];
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
  const [aberto, setAberto] = useState<number | null>(null);
  const [agindo, setAgindo] = useState<string | null>(null);

  const carregar = useCallback(() => {
    return fetch(`/api/cursos/${cursoId}/relatorio`)
      .then(r => r.ok ? r.json() : Promise.reject())
      .then(setDados)
      .catch(() => toast.error('Falha ao carregar o relatório.'))
      .finally(() => setCarregando(false));
  }, [cursoId]);
  useEffect(() => { void carregar(); }, [carregar]);

  // Conclusão manual: para quem viu a aula fora do player. Fica registrado quem marcou.
  const marcar = async (c: LinhaRelatorio, lessonId: number, titulo: string) => {
    const ok = await confirmDialog({
      title: 'Marcar como concluída',
      message: `Marcar "${titulo}" como concluída para ${c.nome}? Fica registrado que foi marcada por você, não assistida no player.`,
      confirmText: 'Marcar',
    });
    if (!ok) return;
    setAgindo(`${c.email}|${lessonId}`);
    try {
      const r = await fetch(`/api/cursos/aulas/${lessonId}/concluir`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_email: c.email }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error);
      await carregar();
    } catch (e: any) { toast.error(e.message || 'Falha ao marcar.'); }
    finally { setAgindo(null); }
  };
  const desmarcar = async (c: LinhaRelatorio, lessonId: number) => {
    if (!(await confirmDialog({ message: `Desfazer a conclusão manual de ${c.nome} nesta aula?`, danger: true, confirmText: 'Desfazer' }))) return;
    setAgindo(`${c.email}|${lessonId}`);
    try {
      const r = await fetch(`/api/cursos/aulas/${lessonId}/concluir?user_email=${encodeURIComponent(c.email)}`, { method: 'DELETE' });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error);
      await carregar();
    } catch (e: any) { toast.error(e.message || 'Falha ao desfazer.'); }
    finally { setAgindo(null); }
  };

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
                <div key={c.colaborador_id} className="border-b border-black/5 dark:border-white/5 last:border-0">
                <div onClick={() => setAberto(a => a === c.colaborador_id ? null : c.colaborador_id)}
                  className="grid grid-cols-[1fr_110px_90px_100px_90px] px-4 py-2.5 items-center cursor-pointer hover:bg-black/[0.02] dark:hover:bg-white/[0.02]">
                  <div className="min-w-0 flex items-center gap-2">
                    {aberto === c.colaborador_id ? <ChevronDown size={13} className="text-slate-500 shrink-0" /> : <ChevronRight size={13} className="text-slate-500 shrink-0" />}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-dark-text truncate">{c.nome}</p>
                      <p className="text-[11px] text-slate-500 truncate">
                        {c.cargo || '—'}
                        {(c.concluidas_manual || 0) > 0 && <span className="text-amber-500"> · {c.concluidas_manual} marcada{c.concluidas_manual! > 1 ? 's' : ''} à mão</span>}
                      </p>
                    </div>
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
                {/* Aula a aula: assistiu no player × marcada pelo gestor */}
                {aberto === c.colaborador_id && (
                  <div className="px-4 pb-3 pl-10 space-y-1">
                    {(c.aulas || []).map(a => {
                      const chave = `${c.email}|${a.lesson_id}`;
                      return (
                        <div key={a.lesson_id} className="flex items-center gap-3 px-3 py-2 rounded-lg bg-black/[0.03] dark:bg-white/[0.03]">
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold text-dark-text truncate">{a.titulo}</p>
                            <p className="text-[10px] text-slate-500 truncate">{a.modulo}</p>
                          </div>
                          {a.via === 'assistiu' ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-500 shrink-0">
                              <CheckCircle2 size={12} /> Assistiu · {fmtData(a.em)}
                            </span>
                          ) : a.via === 'manual' ? (
                            <span className="flex items-center gap-1 text-[11px] font-bold text-amber-500 shrink-0" title="Concluída à mão no painel da turma">
                              <Hand size={12} /> Marcada por {String(a.marcado_por || '—').split(' ')[0]} · {fmtData(a.em)}
                            </span>
                          ) : (
                            <span className="text-[11px] text-slate-500 shrink-0">
                              {a.assistido > 0 ? `Assistiu ${fmtDuracao(a.assistido)}` : 'Não começou'}
                            </span>
                          )}
                          {a.via === 'manual' ? (
                            <button onClick={() => desmarcar(c, a.lesson_id)} disabled={agindo === chave} title="Desfazer conclusão manual"
                              className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 disabled:opacity-40"><Undo2 size={13} /></button>
                          ) : !a.concluida ? (
                            <button onClick={() => marcar(c, a.lesson_id, a.titulo)} disabled={agindo === chave}
                              className="flex items-center gap-1 px-2.5 py-1 rounded-md border border-black/10 dark:border-white/10 text-[11px] font-bold text-slate-400 hover:text-violet-400 hover:border-violet-500/40 disabled:opacity-40">
                              {agindo === chave ? <Loader2 size={11} className="animate-spin" /> : <CheckCircle2 size={11} />} Marcar concluída
                            </button>
                          ) : <span className="w-[26px]" />}
                        </div>
                      );
                    })}
                  </div>
                )}
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

// ─── Celebração ao concluir a aula ───────────────────────────────────────────
// Confete (canvas-confetti) + check que se desenha + atalho para a próxima aula.
// Dispara na passagem de "não concluída" → "concluída", pelo player ou pelo botão.
const soltarConfete = () => {
  const cores = ['#8b5cf6', '#a78bfa', '#10b981', '#f59e0b', '#ec4899'];
  const base = { spread: 70, startVelocity: 45, ticks: 220, gravity: 1.1, colors: cores, zIndex: 100002 };
  confetti({ ...base, particleCount: 90, origin: { x: 0.5, y: 0.55 } });
  setTimeout(() => confetti({ ...base, particleCount: 45, angle: 60, origin: { x: 0.1, y: 0.7 } }), 150);
  setTimeout(() => confetti({ ...base, particleCount: 45, angle: 120, origin: { x: 0.9, y: 0.7 } }), 300);
};

const CelebracaoAula: React.FC<{
  titulo: string; proxima: Aula | null; ultimoDoCurso: boolean;
  onProxima: () => void; onFechar: () => void;
}> = ({ titulo, proxima, ultimoDoCurso, onProxima, onFechar }) => {
  useEffect(() => {
    soltarConfete();
    const k = (e: KeyboardEvent) => { if (e.key === 'Escape') onFechar(); };
    window.addEventListener('keydown', k);
    const t = setTimeout(onFechar, proxima ? 9000 : 6000);
    return () => { window.removeEventListener('keydown', k); clearTimeout(t); };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <motion.div className="fixed inset-0 z-[9995] flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm"
      initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={onFechar}>
      <motion.div onClick={e => e.stopPropagation()}
        initial={{ scale: 0.7, y: 30, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="relative w-full max-w-sm overflow-hidden rounded-3xl bg-dark-card border border-black/10 dark:border-white/10 shadow-2xl p-8 text-center">
        <div className="absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-64 rounded-full bg-emerald-500/20 blur-3xl pointer-events-none" />

        {/* Check que se desenha, com anel pulsando */}
        <div className="relative mx-auto w-24 h-24">
          <motion.span className="absolute inset-0 rounded-full bg-emerald-500/20"
            initial={{ scale: 0.6, opacity: 0 }} animate={{ scale: [0.6, 1.35, 1.15], opacity: [0, 0.8, 0] }}
            transition={{ duration: 1.4, delay: 0.25, repeat: 1 }} />
          <motion.svg viewBox="0 0 96 96" className="relative w-24 h-24"
            initial={{ rotate: -90 }} animate={{ rotate: 0 }} transition={{ duration: 0.6, ease: 'easeOut' }}>
            <motion.circle cx="48" cy="48" r="42" fill="none" stroke="#10b981" strokeWidth="6" strokeLinecap="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.6, ease: 'easeInOut' }} />
            <motion.path d="M30 49 L43 62 L67 36" fill="none" stroke="#10b981" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round"
              initial={{ pathLength: 0 }} animate={{ pathLength: 1 }} transition={{ duration: 0.45, delay: 0.5, ease: 'easeOut' }} />
          </motion.svg>
        </div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.7 }}>
          <p className="text-[11px] font-black text-emerald-500 uppercase tracking-widest mt-5">
            {ultimoDoCurso ? 'Curso concluído!' : 'Aula concluída!'}
          </p>
          <h3 className="text-xl font-black text-dark-text mt-1 leading-snug">{titulo}</h3>
          <p className="text-sm text-slate-500 mt-2">
            {ultimoDoCurso ? 'Você terminou todas as aulas deste curso. 🎉' : 'Mandou bem — segue o ritmo.'}
          </p>

          <div className="flex flex-col gap-2 mt-6">
            {proxima && (
              <button onClick={onProxima}
                className="flex items-center justify-center gap-2 w-full py-3 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold transition-colors">
                Próxima aula: <span className="truncate max-w-[160px]">{proxima.title}</span> <ArrowRight size={15} />
              </button>
            )}
            <button onClick={onFechar} className="w-full py-2.5 rounded-xl text-sm font-bold text-slate-500 hover:text-dark-text">
              {proxima ? 'Ficar nesta aula' : 'Fechar'}
            </button>
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
};

// ─── Linha do índice (arrastável para o gestor) ──────────────────────────────
const LinhaAula: React.FC<{
  aula: Aula; ativa: boolean; podeEditar: boolean;
  onAbrir: () => void; onExcluir: () => void;
}> = ({ aula: a, ativa, podeEditar, onAbrir, onExcluir }) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: a.id, disabled: !podeEditar });
  return (
    <div ref={setNodeRef}
      style={{ transform: CSS.Transform.toString(transform), transition, zIndex: isDragging ? 10 : undefined, position: 'relative' }}
      className={`flex items-center gap-0.5 group ${isDragging ? 'opacity-80' : ''}`}>
      {podeEditar && (
        // Alça: arrastar só por aqui, para o clique na aula continuar abrindo a aula
        <span {...attributes} {...listeners} title="Arraste para reordenar"
          className="p-1 -ml-1 text-slate-400 hover:text-violet-400 cursor-grab active:cursor-grabbing opacity-40 group-hover:opacity-100 touch-none">
          <GripVertical size={13} />
        </span>
      )}
      <button onClick={onAbrir}
        className={`flex-1 flex items-center gap-2.5 min-w-0 px-2.5 py-2 rounded-xl text-left transition-colors ${
          ativa ? 'bg-violet-600/15 border border-violet-500/30' : 'hover:bg-black/5 dark:hover:bg-white/5 border border-transparent'
        } ${isDragging ? 'bg-dark-card shadow-lg border-violet-500/40' : ''}`}>
        {a.completed
          ? <motion.span key="ok" initial={{ scale: 0, rotate: -45 }} animate={{ scale: 1, rotate: 0 }}
              transition={{ type: 'spring', stiffness: 500, damping: 15 }} className="shrink-0 flex">
              <CheckCircle2 size={14} className="text-emerald-400" />
            </motion.span>
          : <Circle size={14} className={`shrink-0 ${ativa ? 'text-violet-400' : 'text-slate-600'}`} />}
        <span className={`text-xs truncate ${ativa ? 'font-bold text-dark-text' : 'text-slate-400'}`}>{a.title}</span>
        {a.duration_seconds > 0 && (
          <span className="text-[10px] text-slate-500 ml-auto shrink-0">{fmtDuracao(a.duration_seconds)}</span>
        )}
      </button>
      {podeEditar && (
        <button onClick={onExcluir}
          className="p-1 text-slate-600 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-all"><Trash2 size={11} /></button>
      )}
    </div>
  );
};

// ─── Descrição da aula (edição no lugar, para gestor) ────────────────────────
const tamanho = (b?: number) => !b ? '' : b < 1024 * 1024 ? `${Math.max(1, Math.round(b / 1024))} KB` : `${(b / 1024 / 1024).toLocaleString('pt-BR', { maximumFractionDigits: 1 })} MB`;
const iconeArquivo = (m: Material) => {
  const t = (m.type || '').toLowerCase(), n = m.name.toLowerCase();
  if (t.startsWith('image/')) return FileImage;
  if (t.startsWith('video/')) return FileVideo;
  if (t.startsWith('audio/')) return FileAudio;
  if (/\.(zip|rar|7z|tar|gz)$/.test(n)) return FileArchive;
  if (/\.(xlsx?|csv|ods)$/.test(n)) return FileSpreadsheet;
  return FileText;
};

const DescricaoAula: React.FC<{
  aula: Aula; cursoId: number; podeEditar: boolean;
  onSalvo: (texto: string | null) => void; onMateriais: (lista: Material[]) => void;
}> = ({ aula, cursoId, podeEditar, onSalvo, onMateriais }) => {
  const [editando, setEditando] = useState(false);
  const [enviando, setEnviando] = useState<{ nome: string; pct: number } | null>(null);
  const [arrastando, setArrastando] = useState(false);
  const inputArquivo = useRef<HTMLInputElement>(null);
  const materiais: Material[] = Array.isArray(aula.materials) ? aula.materials : [];

  const salvarMateriais = async (lista: Material[]) => {
    const r = await fetch(`/api/cursos/aulas/${aula.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ materials: lista }),
    });
    if (!r.ok) throw new Error('Falha ao salvar os anexos.');
    onMateriais(lista);
  };

  // Qualquer tipo de arquivo. Vai para cursos/{curso}/materiais/ (a regra do
  // Storage `cursos/{courseId}/{allPaths=**}` já cobre).
  const anexar = async (arquivos: FileList | File[]) => {
    const fila = Array.from(arquivos);
    if (!fila.length) return;
    let lista = [...materiais];
    try {
      for (const file of fila) {
        setEnviando({ nome: file.name, pct: 0 });
        const safe = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
        const path = `cursos/${cursoId}/materiais/${aula.id}/${Date.now()}-${safe}`;
        const task = uploadBytesResumable(ref(storage, path), file, { contentType: file.type || 'application/octet-stream' });
        await new Promise<void>((resolve, reject) => task.on('state_changed',
          (snap) => setEnviando({ nome: file.name, pct: Math.round((snap.bytesTransferred / snap.totalBytes) * 100) }),
          reject, () => resolve()));
        const url = await getDownloadURL(task.snapshot.ref);
        lista = [...lista, { name: file.name, url, path, size: file.size, type: file.type }];
        await salvarMateriais(lista);
      }
      toast.success(fila.length > 1 ? `${fila.length} arquivos anexados.` : 'Arquivo anexado.');
    } catch (e: any) { toast.error(e.message || 'Falha ao enviar o arquivo.'); }
    finally { setEnviando(null); if (inputArquivo.current) inputArquivo.current.value = ''; }
  };

  const remover = async (m: Material) => {
    if (!(await confirmDialog({ message: `Remover "${m.name}" da aula?`, danger: true }))) return;
    try {
      await salvarMateriais(materiais.filter(x => x !== m));
      if (m.path) deleteObject(ref(storage, m.path)).catch(() => {});
    } catch (e: any) { toast.error(e.message); }
  };
  const [texto, setTexto] = useState(aula.description || '');
  const [salvando, setSalvando] = useState(false);
  useEffect(() => { setTexto(aula.description || ''); setEditando(false); }, [aula.id, aula.description]);

  const salvar = async () => {
    setSalvando(true);
    try {
      // '' limpa a descrição (o PUT ignora null, então mandamos string vazia)
      const r = await fetch(`/api/cursos/aulas/${aula.id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ description: texto.trim() }),
      });
      if (!r.ok) throw new Error();
      onSalvo(texto.trim() || null);
      setEditando(false);
    } catch { toast.error('Não foi possível salvar a descrição.'); }
    finally { setSalvando(false); }
  };

  if (!podeEditar && !aula.description && materiais.length === 0) return null;
  return (
    <div
      onDragOver={podeEditar ? (e) => { e.preventDefault(); setArrastando(true); } : undefined}
      onDragLeave={podeEditar ? (e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setArrastando(false); } : undefined}
      onDrop={podeEditar ? (e) => { e.preventDefault(); setArrastando(false); if (e.dataTransfer.files?.length) void anexar(e.dataTransfer.files); } : undefined}
      className={`bg-dark-card border rounded-2xl p-5 transition-colors ${arrastando ? 'border-violet-500 bg-violet-500/5' : 'border-black/10 dark:border-white/10'}`}>
      <div className="flex items-center justify-between mb-3">
        <h3 className="flex items-center gap-2 text-xs font-black text-dark-text uppercase tracking-widest">
          <AlignLeft size={14} className="text-violet-500" /> Descrição da aula
        </h3>
        {podeEditar && !editando && (
          <button onClick={() => setEditando(true)} className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-violet-400">
            <Edit2 size={12} /> {aula.description ? 'Editar' : 'Adicionar'}
          </button>
        )}
      </div>
      {editando ? (
        <div className="space-y-3">
          <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={6} autoFocus
            placeholder="O que a pessoa vai aprender nesta aula, links e materiais de apoio…"
            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text outline-none focus:border-violet-500/60 resize-y" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setTexto(aula.description || ''); setEditando(false); }}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-dark-text">Cancelar</button>
            <button onClick={salvar} disabled={salvando}
              className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold disabled:opacity-50">
              {salvando && <Loader2 size={12} className="animate-spin" />} Salvar
            </button>
          </div>
        </div>
      ) : aula.description ? (
        <p className="text-sm text-slate-500 dark:text-slate-400 whitespace-pre-wrap leading-relaxed">{aula.description}</p>
      ) : (
        <p className="text-sm text-slate-500 italic">Sem descrição ainda.</p>
      )}

      {/* Materiais / anexos */}
      {(materiais.length > 0 || podeEditar) && (
        <div className="mt-5 pt-4 border-t border-black/10 dark:border-white/10">
          <div className="flex items-center justify-between mb-2">
            <h4 className="flex items-center gap-1.5 text-[11px] font-black text-dark-text uppercase tracking-widest">
              <Paperclip size={12} className="text-violet-500" /> Materiais da aula
              {materiais.length > 0 && <span className="text-slate-500">{materiais.length}</span>}
            </h4>
            {podeEditar && (
              <>
                <input ref={inputArquivo} type="file" multiple className="hidden"
                  onChange={(e) => e.target.files && anexar(e.target.files)} />
                <button onClick={() => inputArquivo.current?.click()} disabled={!!enviando}
                  className="flex items-center gap-1 text-[11px] font-bold text-slate-500 hover:text-violet-400 disabled:opacity-40">
                  <Upload size={12} /> Anexar arquivos
                </button>
              </>
            )}
          </div>

          {enviando && (
            <div className="mb-2 px-3 py-2 rounded-xl bg-violet-500/10 text-[11px] text-violet-300">
              <div className="flex justify-between gap-2"><span className="truncate">Enviando {enviando.nome}</span><span>{enviando.pct}%</span></div>
              <div className="h-1 mt-1.5 rounded-full bg-white/10 overflow-hidden"><div className="h-full bg-violet-500" style={{ width: `${enviando.pct}%` }} /></div>
            </div>
          )}

          {materiais.length === 0 ? (
            !enviando && <p className="text-xs text-slate-500">Nenhum arquivo. Clique em "Anexar arquivos" ou arraste para cá — PDF, planilha, imagem, zip, qualquer tipo.</p>
          ) : (
            <div className="grid sm:grid-cols-2 gap-2">
              {materiais.map((m, i) => {
                const Icone = iconeArquivo(m);
                return (
                  <div key={`${m.url}-${i}`} className="flex items-center gap-2.5 px-3 py-2.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 group">
                    <span className="w-8 h-8 rounded-lg bg-violet-500/10 flex items-center justify-center shrink-0"><Icone size={15} className="text-violet-400" /></span>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" download={m.name} className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-dark-text truncate hover:text-violet-400" title={m.name}>{m.name}</p>
                      {m.size ? <p className="text-[10px] text-slate-500">{tamanho(m.size)}</p> : null}
                    </a>
                    <a href={m.url} target="_blank" rel="noopener noreferrer" download={m.name} title="Baixar"
                      className="p-1.5 rounded-md text-slate-500 hover:text-violet-400"><Download size={13} /></a>
                    {podeEditar && (
                      <button onClick={() => remover(m)} title="Remover"
                        className="p-1.5 rounded-md text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity"><Trash2 size={12} /></button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

// ─── Comentários da aula ─────────────────────────────────────────────────────
interface Comentario { id: number; texto: string; created_at: string; autor: string; foto: string | null; meu: boolean; pode_apagar: boolean }

const quando = (iso: string) => {
  const d = new Date(iso), seg = (Date.now() - d.getTime()) / 1000;
  if (seg < 60) return 'agora';
  if (seg < 3600) return `há ${Math.floor(seg / 60)} min`;
  if (seg < 86400) return `há ${Math.floor(seg / 3600)} h`;
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: d.getFullYear() !== new Date().getFullYear() ? 'numeric' : undefined });
};

const ComentariosAula: React.FC<{ aulaId: number }> = ({ aulaId }) => {
  const [lista, setLista] = useState<Comentario[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [texto, setTexto] = useState('');
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    let vivo = true;
    setCarregando(true); setLista([]);
    fetch(`/api/cursos/aulas/${aulaId}/comentarios`)
      .then(r => (r.ok ? r.json() : []))
      .then(d => vivo && setLista(Array.isArray(d) ? d : []))
      .finally(() => vivo && setCarregando(false));
    return () => { vivo = false; };
  }, [aulaId]);

  const enviar = async () => {
    const t = texto.trim();
    if (!t) return;
    setEnviando(true);
    try {
      const r = await fetch(`/api/cursos/aulas/${aulaId}/comentarios`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error);
      setLista(prev => [...prev, d]);
      setTexto('');
    } catch (e: any) { toast.error(e.message || 'Não foi possível comentar.'); }
    finally { setEnviando(false); }
  };

  const apagar = async (c: Comentario) => {
    if (!(await confirmDialog({ message: 'Apagar este comentário?', danger: true }))) return;
    const r = await fetch(`/api/cursos/comentarios/${c.id}`, { method: 'DELETE' });
    if (r.ok) setLista(prev => prev.filter(x => x.id !== c.id));
    else toast.error('Não foi possível apagar.');
  };

  const Avatar = ({ c }: { c: { autor: string; foto: string | null } }) => c.foto
    ? <img src={c.foto} alt="" className="w-8 h-8 rounded-full object-cover shrink-0" />
    : <span className="w-8 h-8 rounded-full bg-violet-500/15 text-violet-400 text-xs font-black flex items-center justify-center shrink-0">{c.autor.slice(0, 1).toUpperCase()}</span>;

  return (
    <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-5">
      <h3 className="flex items-center gap-2 text-xs font-black text-dark-text uppercase tracking-widest mb-4">
        <MessageSquare size={14} className="text-violet-500" /> Comentários
        {lista.length > 0 && <span className="text-slate-500 font-bold">{lista.length}</span>}
      </h3>

      {carregando ? (
        <div className="py-6 flex justify-center"><Loader2 size={18} className="animate-spin text-violet-500" /></div>
      ) : lista.length === 0 ? (
        <p className="text-sm text-slate-500 mb-4">Nenhum comentário ainda. Ficou alguma dúvida? Comente aqui.</p>
      ) : (
        <div className="space-y-4 mb-5">
          {lista.map(c => (
            <div key={c.id} className="flex gap-3 group">
              <Avatar c={c} />
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-dark-text">{c.autor}</span>
                  <span className="text-[11px] text-slate-500">{quando(c.created_at)}</span>
                  {c.pode_apagar && (
                    <button onClick={() => apagar(c)} title="Apagar"
                      className="ml-auto p-1 rounded-md text-slate-500 hover:text-rose-400 opacity-0 group-hover:opacity-100 transition-opacity">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
                <p className="text-sm text-slate-600 dark:text-slate-300 whitespace-pre-wrap leading-relaxed mt-0.5">{c.texto}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-end gap-2">
        <textarea value={texto} onChange={e => setTexto(e.target.value)} rows={2}
          onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) { e.preventDefault(); void enviar(); } }}
          placeholder="Escreva um comentário… (Ctrl/⌘ + Enter envia)"
          className="flex-1 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text outline-none focus:border-violet-500/60 resize-none" />
        <button onClick={enviar} disabled={enviando || !texto.trim()}
          className="h-[46px] px-4 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold flex items-center gap-1.5 disabled:opacity-40">
          {enviando ? <Loader2 size={14} className="animate-spin" /> : <Send size={14} />} Enviar
        </button>
      </div>
    </div>
  );
};

const Cursos: React.FC = () => {
  const { userData, user } = useAuth() as any;
  const meuEmail: string = String(user?.email || userData?.email || '').toLowerCase();
  const [concluindo, setConcluindo] = useState(false);
  const [celebrar, setCelebrar] = useState<number | null>(null);   // id da aula recém-concluída
  // Espelho de `modulos` para saber, dentro dos callbacks, se a aula JÁ estava concluída
  const modulosRef = useRef<Modulo[]>([]);

  // Reordenar aulas dentro do módulo (arrastar pela alça). Atualiza na hora e
  // salva; se o servidor recusar, volta a ordem anterior.
  const sensores = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
  const reordenar = async (moduloId: number, ev: DragEndEvent) => {
    const { active, over } = ev;
    if (!over || active.id === over.id) return;
    let anterior: Modulo[] = [];
    let ids: number[] = [];
    setModulos(prev => {
      anterior = prev;
      return prev.map(m => {
        if (m.id !== moduloId) return m;
        const de = m.aulas.findIndex(a => a.id === active.id), para = m.aulas.findIndex(a => a.id === over.id);
        const aulas = arrayMove(m.aulas, de, para);
        ids = aulas.map(a => a.id);
        return { ...m, aulas };
      });
    });
    try {
      const r = await fetch(`/api/cursos/modulos/${moduloId}/ordem`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ids }),
      });
      if (!r.ok) throw new Error();
    } catch {
      setModulos(anterior);
      toast.error('Não foi possível salvar a nova ordem.');
    }
  };

  // Gestor marca a aula como concluída para si (fica como 'manual', não 'assistiu')
  const alternarConclusao = async (aula: Aula) => {
    if (!meuEmail) return;
    setConcluindo(true);
    try {
      const desfazer = aula.completed && aula.completed_via === 'manual';
      const r = desfazer
        ? await fetch(`/api/cursos/aulas/${aula.id}/concluir?user_email=${encodeURIComponent(meuEmail)}`, { method: 'DELETE' })
        : await fetch(`/api/cursos/aulas/${aula.id}/concluir`, {
            method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ user_email: meuEmail }),
          });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(d.error);
      const novo = desfazer ? { completed: false, completed_via: null } : { completed: true, completed_via: 'manual' as const };
      setModulos(prev => prev.map(m => ({ ...m, aulas: m.aulas.map(a => a.id === aula.id ? { ...a, ...novo } : a) })));
      setAulaAtiva(prev => prev && prev.id === aula.id ? { ...prev, ...novo } : prev);
      if (desfazer) toast.success('Conclusão desfeita.');
      else setCelebrar(aula.id);
    } catch (e: any) { toast.error(e.message || 'Não foi possível atualizar.'); }
    finally { setConcluindo(false); }
  };
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
    const antes = modulosRef.current.flatMap(m => m.aulas).find(a => a.id === aulaId);
    if (dados.completed && antes && !antes.completed) setCelebrar(aulaId);
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
    (aula.materials || []).forEach(m => { if (m.path) deleteObject(ref(storage, m.path)).catch(() => {}); });
    setModulos(prev => prev.map(m => ({ ...m, aulas: m.aulas.filter(a => a.id !== aula.id) })));
    setAulaAtiva(prev => prev?.id === aula.id ? null : prev);
  };

  // ── Derivados ──
  const todasAulas = useMemo(() => modulos.flatMap(m => m.aulas), [modulos]);
  useEffect(() => { modulosRef.current = modulos; }, [modulos]);
  const pctCurso = todasAulas.length
    ? Math.round((todasAulas.filter(a => a.completed).length / todasAulas.length) * 100)
    : 0;

  // ── Catálogo ──
  if (!cursoAtivo) {
    return (
      <div className="min-h-screen bg-dark-bg">
        {/* Banner — saudação, números da pessoa e atalho para continuar */}
        {(() => {
          const primeiroNome = String((userData as any)?.name || '').split(' ')[0];
          const totAulas = cursos.reduce((s, c) => s + (c.total_aulas || 0), 0);
          const feitas = cursos.reduce((s, c) => s + (c.aulas_concluidas || 0), 0);
          const segundos = cursos.reduce((s, c) => s + (c.duracao_total || 0), 0);
          const pctGeral = totAulas > 0 ? Math.round((feitas / totAulas) * 100) : 0;
          // Continuar: o curso já começado e não terminado; senão, o primeiro a fazer
          const pend = cursos.filter(c => c.total_aulas > 0 && c.aulas_concluidas < c.total_aulas);
          const continuar = pend.find(c => c.aulas_concluidas > 0 || c.tempo_assistido > 0) || pend[0];
          const horas = segundos >= 3600 ? `${(segundos / 3600).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}h` : fmtDuracao(segundos);
          return (
            <div className="px-6 pt-6 pb-2">
              <div className="relative overflow-hidden rounded-3xl p-7 md:p-9 text-white"
                style={{ background: 'linear-gradient(120deg, #1a0b2e 0%, #3b1673 45%, #6d28d9 80%, #8b5cf6 100%)' }}>
                {/* Decoração */}
                <div className="absolute -top-24 -right-16 w-80 h-80 rounded-full bg-fuchsia-500/30 blur-3xl pointer-events-none" />
                <div className="absolute -bottom-28 left-1/3 w-96 h-96 rounded-full bg-violet-400/20 blur-3xl pointer-events-none" />
                <div className="absolute inset-0 opacity-[0.07] pointer-events-none"
                  style={{ backgroundImage: 'radial-gradient(circle at 1px 1px, #fff 1px, transparent 0)', backgroundSize: '22px 22px' }} />
                <GraduationCap size={220} strokeWidth={1} className="absolute -right-6 -bottom-10 text-white/10 pointer-events-none hidden md:block" />

                <div className="relative flex flex-col lg:flex-row lg:items-end justify-between gap-8">
                  <div className="max-w-xl">
                    <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/10 border border-white/15 text-[11px] font-bold uppercase tracking-widest">
                      <Sparkles size={12} /> Central de Treinamentos
                    </span>
                    <h1 className="text-3xl md:text-4xl font-black tracking-tight mt-4 leading-tight">
                      {primeiroNome ? `Bora evoluir, ${primeiroNome}?` : 'Bora evoluir?'}
                    </h1>
                    <p className="text-sm md:text-base text-white/70 mt-2">
                      As trilhas de formação da Grape: o jeito como a gente trabalha, aula por aula.
                    </p>
                    <div className="flex flex-wrap items-center gap-3 mt-6">
                      {continuar && (
                        <button onClick={() => abrirCurso(continuar)}
                          className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-violet-700 text-sm font-black hover:bg-violet-50 transition-colors shadow-lg shadow-black/20">
                          <Play size={15} fill="currentColor" />
                          {continuar.aulas_concluidas > 0 || continuar.tempo_assistido > 0 ? 'Continuar' : 'Começar'}: {continuar.title}
                          <ArrowRight size={15} />
                        </button>
                      )}
                      {isAdmin && (
                        <button onClick={criarCurso}
                          className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/10 hover:bg-white/20 border border-white/20 text-white text-sm font-bold transition-colors">
                          <Plus size={15} /> Novo curso
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Números */}
                  <div className="grid grid-cols-2 gap-3 shrink-0 w-full lg:w-[340px]">
                    {[
                      { i: BookOpen, v: String(cursos.length), r: cursos.length === 1 ? 'curso' : 'cursos' },
                      { i: Play, v: String(totAulas), r: 'aulas' },
                      { i: Clock, v: horas || '0min', r: 'de conteúdo' },
                      { i: Trophy, v: `${pctGeral}%`, r: `concluído · ${feitas}/${totAulas}` },
                    ].map(({ i: Icone, v, r }) => (
                      <div key={r} className="rounded-2xl bg-white/10 border border-white/15 backdrop-blur-sm px-4 py-3">
                        <Icone size={15} className="text-white/60" />
                        <p className="text-2xl font-black mt-1 leading-none">{v}</p>
                        <p className="text-[11px] text-white/60 mt-1">{r}</p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <h2 className="text-sm font-black text-dark-text uppercase tracking-widest mt-7 mb-1">Cursos</h2>
            </div>
          );
        })()}

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
                        ? <span className={`flex items-center gap-1 font-bold ${aulaAtiva.completed_via === 'manual' ? 'text-amber-500' : 'text-emerald-400'}`}>
                            {aulaAtiva.completed_via === 'manual' ? <Hand size={11} /> : <CheckCircle2 size={11} />}
                            {aulaAtiva.completed_via === 'manual' ? 'Concluída (marcada à mão)' : 'Concluída'}
                          </span>
                        : (aulaAtiva.watched_seconds || 0) > 0
                          ? <span>Você assistiu {fmtDuracao(aulaAtiva.watched_seconds || 0)}</span>
                          : !isAdmin && <span>Conclui sozinha ao assistir 90% do vídeo</span>}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    {/* Conclusão manual: só gestor; quem concluiu assistindo não tem o que desfazer */}
                    {isAdmin && !(aulaAtiva.completed && aulaAtiva.completed_via !== 'manual') && (
                      <button onClick={() => alternarConclusao(aulaAtiva)} disabled={concluindo}
                        className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold transition-colors disabled:opacity-50 ${
                          aulaAtiva.completed
                            ? 'border border-black/10 dark:border-white/10 text-slate-500 hover:text-rose-400'
                            : 'bg-emerald-600 hover:bg-emerald-500 text-white'}`}>
                        {concluindo ? <Loader2 size={13} className="animate-spin" />
                          : aulaAtiva.completed ? <Undo2 size={13} /> : <CheckCircle2 size={13} />}
                        {aulaAtiva.completed ? 'Desfazer conclusão' : 'Marcar como concluída'}
                      </button>
                    )}
                    {isAdmin && (
                      <button onClick={() => setModalAula(aulaAtiva)}
                        className="p-2 rounded-lg text-slate-500 hover:text-violet-400 transition-colors">
                        <Edit2 size={14} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
              <DescricaoAula aula={aulaAtiva} cursoId={cursoAtivo.id} podeEditar={isAdmin}
                onMateriais={(lista) => {
                  setModulos(prev => prev.map(m => ({ ...m, aulas: m.aulas.map(a => a.id === aulaAtiva.id ? { ...a, materials: lista } : a) })));
                  setAulaAtiva(prev => prev && prev.id === aulaAtiva.id ? { ...prev, materials: lista } : prev);
                }}
                onSalvo={(texto) => {
                setModulos(prev => prev.map(m => ({ ...m, aulas: m.aulas.map(a => a.id === aulaAtiva.id ? { ...a, description: texto } : a) })));
                setAulaAtiva(prev => prev && prev.id === aulaAtiva.id ? { ...prev, description: texto } : prev);
              }} />
              <ComentariosAula aulaId={aulaAtiva.id} />
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

                {!fechado && (
                  <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={(ev) => reordenar(m.id, ev)}>
                    <SortableContext items={m.aulas.map(a => a.id)} strategy={verticalListSortingStrategy}>
                      {m.aulas.map(a => (
                        <LinhaAula key={a.id} aula={a} ativa={aulaAtiva?.id === a.id} podeEditar={isAdmin}
                          onAbrir={() => setAulaAtiva(a)} onExcluir={() => excluirAula(a)} />
                      ))}
                    </SortableContext>
                  </DndContext>
                )}
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
        {celebrar != null && (() => {
          const idx = todasAulas.findIndex(a => a.id === celebrar);
          const aula = todasAulas[idx];
          const proxima = todasAulas.slice(idx + 1).find(a => !a.completed) || null;
          return (
            <CelebracaoAula key={`cel-${celebrar}`} titulo={aula?.title || ''} proxima={proxima}
              ultimoDoCurso={todasAulas.length > 0 && todasAulas.every(a => a.completed)}
              onProxima={() => { if (proxima) setAulaAtiva(proxima); setCelebrar(null); }}
              onFechar={() => setCelebrar(null)} />
          );
        })()}
      </AnimatePresence>
    </div>
  );
};

export default Cursos;
