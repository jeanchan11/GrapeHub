import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';
import { storage } from '../firebase';
import { toast } from '@/src/lib/toast';
import {
  X, Plus, Trash2, Wand2, Mic, UserSquare2, Gauge, Loader2, Check, Play, Pause, ImagePlus,
  Waves, Upload,
} from 'lucide-react';

// ─────────────────────────────────────────────────────────────────────────────
// Configurações do Estúdio — só superadmin. FRONT COM DADOS DE MENTIRA: nada
// aqui persiste ainda. Trocar os `useState` iniciais por fetch quando o backend
// entrar (tabelas estudio.voices / estudio.avatars / tipos de copy / cotas).
// ─────────────────────────────────────────────────────────────────────────────

export interface TipoCopy { id: string; nome: string; desc: string; prompt: string; }
export interface Voz { id: string; voiceId: string; nome: string; cliente: string | null; clonada: boolean; ativa: boolean; previewUrl?: string | null; }
export interface Avatar { id: string; avatarId: string; nome: string; cliente: string | null; vozId: string; ativo: boolean; previewUrl?: string | null; cor: string; }
export interface Cota { email: string; nome: string; modo: 'videos' | 'valor'; limite: number; usado: number; }
/** Cama de som que entra por baixo da locução (trânsito, pássaros, gente). */
export interface Ambiencia { id: string; nome: string; url: string; storageKey: string | null; volume: number; ativa: boolean; }

const ABAS = [
  { id: 'copy',     label: 'Tipos de copy', icone: Wand2 },
  { id: 'vozes',    label: 'Vozes',         icone: Mic },
  { id: 'avatares', label: 'Avatares',      icone: UserSquare2 },
  { id: 'ambiencia', label: 'Som ambiente', icone: Waves },
  { id: 'limites',  label: 'Gastos',        icone: Gauge },
] as const;

type Aba = typeof ABAS[number]['id'];

const Campo: React.FC<{ label: string; children: React.ReactNode; dica?: string }> = ({ label, children, dica }) => (
  <div>
    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">{label}</label>
    <div className="mt-1">{children}</div>
    {dica && <p className="mt-1 text-[10px] text-slate-500 italic">{dica}</p>}
  </div>
);

const inputCls = 'w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500/60';

const EstudioConfig: React.FC<{ onFechar: () => void }> = ({ onFechar }) => {
  const [aba, setAba] = useState<Aba>('copy');
  const [salvando, setSalvando] = useState(false);

  const [carregando, setCarregando] = useState(true);

  // uuid do banco vs id local de item recém-criado (que ainda não existe lá).
  const ehUuid = (v: string) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(v);

  const [tipos, setTipos] = useState<TipoCopy[]>([
    { id: 'direto', nome: 'Roteiro direto', desc: 'Vai direto à dor, prova e CTA.', prompt: '' },
    { id: 'caixa', nome: 'Caixa de perguntas', desc: 'Abre com uma pergunta do público.', prompt: '' },
  ]);

  const [vozes, setVozes] = useState<Voz[]>([
    { id: 'v1', voiceId: 'moss_audio_ricardo', nome: 'Voz Dr. Ricardo', cliente: 'Fontan & Paz Advogados', clonada: true, ativa: true },
    { id: 'v2', voiceId: 'Clara', nome: 'Clara', cliente: null, clonada: false, ativa: true },
    { id: 'v3', voiceId: 'male_deep_ptbr', nome: 'Masculina Grave PT-BR', cliente: null, clonada: false, ativa: true },
  ]);

  const [avatares, setAvatares] = useState<Avatar[]>([
    { id: 'a1', avatarId: 'heygen_ricardo_01', nome: 'Dr. Ricardo', cliente: 'Fontan & Paz Advogados', vozId: 'v1', ativo: true, cor: '#7c3aed' },
    { id: 'a2', avatarId: 'heygen_generic_m', nome: 'Apresentador Genérico M', cliente: null, vozId: 'v3', ativo: true, cor: '#10b981' },
    { id: 'a3', avatarId: 'heygen_generic_f', nome: 'Apresentadora Genérica F', cliente: null, vozId: 'v2', ativo: true, cor: '#f59e0b' },
  ]);

  // Prévia da voz. Toca a URL de amostra quando existir; sem backend ainda, só
  // marca qual está "tocando" para o botão responder.
  const [tocandoVoz, setTocandoVoz] = useState<string | null>(null);
  const audioRef = React.useRef<HTMLAudioElement | null>(null);

  const ouvirVoz = (v: Voz) => {
    if (tocandoVoz === v.id) {
      audioRef.current?.pause();
      setTocandoVoz(null);
      return;
    }
    audioRef.current?.pause();
    if (v.previewUrl) {
      const a = new Audio(v.previewUrl);
      audioRef.current = a;
      a.onended = () => setTocandoVoz(null);
      a.play().catch(() => { toast.error('Não consegui tocar a prévia.'); setTocandoVoz(null); });
    } else {
      toast('Sem prévia ainda. Escreva um texto abaixo e clique em "Gerar prévia".');
      return;
    }
    setTocandoVoz(v.id);
  };

  const [ambiencias, setAmbiencias] = useState<Ambiencia[]>([]);
  const [subindoSom, setSubindoSom] = useState(false);
  const [tocandoSom, setTocandoSom] = useState<string | null>(null);

  // O arquivo vai para o Firebase Storage em estudio/ambiencias/ — caminho novo
  // exige regra nova em storage.rules, senão o upload volta permission-denied.
  const enviarSom = async (arquivo: File) => {
    if (!arquivo.type.startsWith('audio/')) { toast.error('Selecione um arquivo de áudio.'); return; }
    if (arquivo.size > 20 * 1024 * 1024) { toast.error('Use um arquivo de até 20 MB.'); return; }
    setSubindoSom(true);
    try {
      const safe = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const caminho = `estudio/ambiencias/${Date.now()}-${safe}`;
      const task = uploadBytesResumable(ref(storage, caminho), arquivo, { contentType: arquivo.type });
      await new Promise<void>((ok, erro) => task.on('state_changed', undefined, erro, () => ok()));
      const url = await getDownloadURL(task.snapshot.ref);
      setAmbiencias(p => [...p, {
        id: `amb${Date.now()}`,
        // Nome do arquivo sem extensão como sugestão — quase sempre já descreve.
        nome: arquivo.name.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim() || 'Som ambiente',
        url, storageKey: caminho, volume: 0.25, ativa: true,
      }]);
      toast.success('Som enviado. Dê um nome e salve.');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar o som.');
    } finally {
      setSubindoSom(false);
    }
  };

  const ouvirSom = (a: Ambiencia) => {
    if (tocandoSom === a.id) { audioRef.current?.pause(); setTocandoSom(null); return; }
    audioRef.current?.pause();
    const el = new Audio(a.url);
    // Toca no volume configurado: ouvir a 100% não diz nada sobre como a cama
    // vai soar por baixo da voz.
    el.volume = Math.min(1, Math.max(0, a.volume));
    audioRef.current = el;
    el.onended = () => setTocandoSom(null);
    el.play().catch(() => { toast.error('Não consegui tocar o som.'); setTocandoSom(null); });
    setTocandoSom(a.id);
  };

  const [cotas, setCotas] = useState<Cota[]>([]);
  // Orçamento em reais. O HeyGen cobra em dólar por minuto de render; o câmbio
  // fica editável porque a conta que a diretoria faz é em real.
  const [tetoMensal, setTetoMensal] = useState(0);
  const [cambio, setCambio] = useState(5.12);
  const [precoMinuto, setPrecoMinuto] = useState<Record<string, number>>({
    avatar_iii: 2.33, avatar_iv: 2.33, avatar_v: 2.33,
  });

  // Tudo vem do banco. A lista de quem tem cota sai do cadastro de colaboradores
  // no próprio endpoint — não é digitada aqui.
  useEffect(() => {
    fetch('/api/estudio/config')
      .then(r => r.ok ? r.json() : Promise.reject(new Error('sem permissão')))
      .then(d => {
        setTipos((d.tipos || []).map((t: any) => ({
          id: t.id, nome: t.name, desc: t.descricao || '', prompt: t.prompt || '',
        })));
        setVozes((d.vozes || []).map((v: any) => ({
          id: v.id, voiceId: v.voice_id, nome: v.name, cliente: v.client_ref,
          clonada: !!v.is_cloned, ativa: v.active !== false, previewUrl: v.preview_url,
        })));
        setAvatares((d.avatares || []).map((a: any) => ({
          id: a.id, avatarId: a.avatar_id, nome: a.name, cliente: a.client_ref,
          vozId: a.default_voice_id || '', ativo: a.active !== false,
          previewUrl: a.preview_url, cor: a.cor || '#7c3aed',
        })));
        setAmbiencias((d.ambiencias || []).map((a: any) => ({
          id: a.id, nome: a.name, url: a.url, storageKey: a.storage_key,
          volume: Number(a.volume_padrao ?? 0.25), ativa: a.active !== false,
        })));
        setCotas((d.cotas || []).map((c: any) => ({
          email: c.email, nome: c.name, modo: c.modo === 'videos' ? 'videos' : 'valor',
          limite: Number(c.limite) || 0, usado: Number(c.usado_brl) || 0,
        })));
        setTetoMensal(Number(d.teto_mensal_brl) || 0);
        setCambio(Number(d.cambio_usd_brl) || 5.12);
        if (d.preco_minuto) setPrecoMinuto(d.preco_minuto);
      })
      .catch(() => toast.error('Falha ao carregar as configurações.'))
      .finally(() => setCarregando(false));
  }, []);

  // Foto do avatar vai para o Firebase Storage, em estudio/avatares/.
  // Precisa da regra correspondente em storage.rules, senão dá permission-denied.
  const [subindoFoto, setSubindoFoto] = useState<string | null>(null);

  const enviarFoto = async (avatarId: string, arquivo: File) => {
    if (!arquivo.type.startsWith('image/')) { toast.error('Selecione uma imagem.'); return; }
    setSubindoFoto(avatarId);
    try {
      const safe = arquivo.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const caminho = `estudio/avatares/${Date.now()}-${safe}`;
      const task = uploadBytesResumable(ref(storage, caminho), arquivo, { contentType: arquivo.type });
      await new Promise<void>((ok, erro) => task.on('state_changed', undefined, erro, () => ok()));
      const url = await getDownloadURL(task.snapshot.ref);
      setAvatares(p => p.map(x => (x.id === avatarId ? { ...x, previewUrl: url } : x)));
      toast.success('Foto enviada.');
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao enviar a foto.');
    } finally {
      setSubindoFoto(null);
    }
  };

  const TEXTO_PREVIA_PADRAO = 'Teve o benefício do INSS negado? A gente analisa o seu caso e mostra o caminho.';
  const [textoPrevia, setTextoPrevia] = useState<Record<string, string>>({});
  const [gerandoPrevia, setGerandoPrevia] = useState<string | null>(null);

  const gerarPrevia = async (v: Voz) => {
    const texto = (textoPrevia[v.id] ?? TEXTO_PREVIA_PADRAO).trim();
    if (!texto) { toast.error('Escreva o texto da prévia.'); return; }
    if (!ehUuid(v.id)) { toast.error('Salve a voz antes de gerar a prévia.'); return; }
    setGerandoPrevia(v.id);
    try {
      const r = await fetch(`/api/estudio/vozes/${v.id}/previa`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ texto }),
      });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao gerar a prévia.');
      setVozes(p => p.map(x => (x.id === v.id ? { ...x, previewUrl: d.preview_url } : x)));
      // Toca assim que fica pronta: é para isso que a pessoa clicou.
      audioRef.current?.pause();
      const a = new Audio(d.preview_url);
      audioRef.current = a;
      a.onended = () => setTocandoVoz(null);
      await a.play().catch(() => {});
      setTocandoVoz(v.id);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao gerar a prévia.');
    } finally {
      setGerandoPrevia(null);
    }
  };

  const [novaVozNome, setNovaVozNome] = useState('');
  const [clonando, setClonando] = useState(false);

  // A clonagem grava a voz direto no banco (precisa do voice_id que a MiniMax
  // devolve), então a lista é recarregada em vez de esperar o Salvar.
  const clonarVoz = async (arquivo: File) => {
    if (!novaVozNome.trim()) { toast.error('Dê um nome para a voz antes de enviar.'); return; }
    setClonando(true);
    try {
      const fd = new FormData();
      fd.append('name', novaVozNome.trim());
      fd.append('audio', arquivo);
      const r = await fetch('/api/estudio/vozes/clonar', { method: 'POST', body: fd });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || 'Falha ao clonar.');
      setVozes(p => [...p, {
        id: d.id, voiceId: d.voice_id, nome: d.name, cliente: d.client_ref,
        clonada: true, ativa: true, previewUrl: d.preview_url,
      }]);
      setNovaVozNome('');
      toast.success(`Voz "${d.name}" clonada.`);
    } catch (e: any) {
      toast.error(e.message || 'Falha ao clonar a voz.');
    } finally {
      setClonando(false);
    }
  };

  const salvar = async () => {
    setSalvando(true);
    try {
      // Item novo vai sem `id`; o `tempId` deixa o avatar apontar para uma voz
      // que só ganha uuid depois de gravada.
      const body = {
        teto_mensal_brl: tetoMensal,
        cambio_usd_brl: cambio,
        preco_minuto: precoMinuto,
        tipos: tipos.map(t => ({
          id: ehUuid(t.id) ? t.id : null,
          name: t.nome, descricao: t.desc, prompt: t.prompt, active: true,
        })),
        vozes: vozes.map(v => ({
          id: ehUuid(v.id) ? v.id : null,
          tempId: ehUuid(v.id) ? null : v.id,
          voice_id: v.voiceId, name: v.nome, client_ref: v.cliente,
          is_cloned: v.clonada, active: v.ativa, preview_url: v.previewUrl || null,
        })),
        avatares: avatares.map(a => ({
          id: ehUuid(a.id) ? a.id : null,
          avatar_id: a.avatarId, name: a.nome, client_ref: a.cliente,
          default_voice_id: a.vozId || null, cor: a.cor,
          active: a.ativo, preview_url: a.previewUrl || null,
        })),
        ambiencias: ambiencias.map(a => ({
          id: ehUuid(a.id) ? a.id : null,
          name: a.nome, url: a.url, storage_key: a.storageKey,
          volume_padrao: a.volume, active: a.ativa,
        })),
        cotas: cotas.map(c => ({ email: c.email, modo: c.modo, limite: c.limite })),
      };

      const r = await fetch('/api/estudio/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Falha ao salvar.');
      toast.success('Configurações salvas.');
      onFechar();
    } catch (e: any) {
      toast.error(e.message || 'Falha ao salvar.');
    } finally {
      setSalvando(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm" onClick={onFechar}>
      <motion.div initial={{ opacity: 0, scale: 0.97 }} animate={{ opacity: 1, scale: 1 }}
        className="w-full max-w-4xl bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl flex flex-col max-h-[92vh]"
        onClick={e => e.stopPropagation()}>

        <div className="p-5 border-b border-black/10 dark:border-white/10 flex items-center justify-between gap-4">
          <div>
            <h3 className="text-lg font-black text-dark-text">Configurações do Estúdio</h3>
            <p className="text-xs text-slate-500 mt-0.5">Visível apenas para o super admin.</p>
          </div>
          <button onClick={onFechar} className="text-slate-400 hover:text-dark-text shrink-0"><X size={18} /></button>
        </div>

        <div className="px-5 pt-4 flex items-center gap-1 flex-wrap border-b border-black/10 dark:border-white/10">
          {ABAS.map(a => {
            const Icone = a.icone;
            return (
              <button key={a.id} onClick={() => setAba(a.id)}
                className={`flex items-center gap-2 px-3 py-2 text-xs font-bold border-b-2 transition-colors ${
                  aba === a.id ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-500 hover:text-dark-text'}`}>
                <Icone size={13} /> {a.label}
              </button>
            );
          })}
        </div>

        <div className="p-6 overflow-y-auto flex-1 space-y-4">
          {carregando && (
            <div className="py-16 flex justify-center"><Loader2 size={22} className="animate-spin text-violet-400" /></div>
          )}
          {!carregando && (<>

          {/* ── TIPOS DE COPY ── */}
          {aba === 'copy' && (
            <>
              <p className="text-xs text-slate-500">
                Cada tipo é um agente próprio. O prompt é o que vai para a IA junto do briefing.
              </p>
              {tipos.map((t, i) => (
                <div key={t.id} className="rounded-2xl border border-black/10 dark:border-white/10 p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <Campo label="Nome">
                        <input value={t.nome} className={inputCls}
                          onChange={e => setTipos(p => p.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} />
                      </Campo>
                      <Campo label="Descrição">
                        <input value={t.desc} className={inputCls}
                          onChange={e => setTipos(p => p.map((x, j) => j === i ? { ...x, desc: e.target.value } : x))} />
                      </Campo>
                    </div>
                    <button onClick={() => setTipos(p => p.filter((_, j) => j !== i))}
                      className="mt-5 p-2 text-slate-500 hover:text-rose-400 transition-colors"><Trash2 size={14} /></button>
                  </div>
                  <Campo label="Prompt do agente" dica="Cole aqui o prompt que você usa hoje para esse formato.">
                    <textarea value={t.prompt} rows={5} placeholder="Você é um redator de anúncios para escritórios de advocacia…"
                      className={`${inputCls} resize-none font-mono text-xs leading-relaxed`}
                      onChange={e => setTipos(p => p.map((x, j) => j === i ? { ...x, prompt: e.target.value } : x))} />
                  </Campo>
                </div>
              ))}
              <button onClick={() => setTipos(p => [...p, { id: `t${Date.now()}`, nome: '', desc: '', prompt: '' }])}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-sm font-bold text-slate-400 hover:text-dark-text hover:border-violet-500/50 transition-colors">
                <Plus size={15} /> Novo tipo de copy
              </button>
            </>
          )}

          {/* ── VOZES ── */}
          {aba === 'vozes' && (
            <>
              <p className="text-xs text-slate-500">
                A voz é <b>clonada por API</b>: você envia uma amostra de áudio e a MiniMax devolve
                a voz pronta. Não há campo de <span className="font-mono text-slate-400">voice_id</span> —
                ele é gerado no momento da clonagem.
              </p>

              <div className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 p-4 space-y-3">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Clonar nova voz</p>
                <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-2">
                  <input value={novaVozNome} placeholder="Nome da voz (ex.: Dr. Ricardo)" className={inputCls}
                    onChange={e => setNovaVozNome(e.target.value)} />
                  <label className={`flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-sm font-bold cursor-pointer transition-colors whitespace-nowrap ${
                    clonando ? 'bg-violet-600/40 text-white/60' : 'bg-violet-600 hover:bg-violet-500 text-white'}`}>
                    <input type="file" accept=".mp3,.m4a,.wav,audio/*" className="hidden" disabled={clonando}
                      onChange={e => { const f = e.target.files?.[0]; if (f) void clonarVoz(f); e.target.value = ''; }} />
                    {clonando ? <><Loader2 size={14} className="animate-spin" /> Clonando…</> : <><Mic size={14} /> Enviar amostra</>}
                  </label>
                </div>
                <p className="text-[10px] text-slate-500 italic">
                  * mp3, m4a ou wav · de 10 segundos a 5 minutos · até 20 MB. A cobrança da MiniMax
                  (US$ 1,50) acontece no primeiro uso da voz, não na clonagem.
                </p>
              </div>

              <div className="space-y-2">
                {vozes.map((v, i) => (
                  <div key={v.id} className="grid grid-cols-1 sm:grid-cols-[auto_1fr_auto_auto_auto] gap-2 items-center rounded-xl border border-black/10 dark:border-white/10 p-3">
                    <button onClick={() => ouvirVoz(v)} title="Ouvir prévia"
                      className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 transition-colors ${
                        tocandoVoz === v.id ? 'bg-violet-600 text-white' : 'bg-black/5 dark:bg-white/10 text-slate-400 hover:text-violet-400'}`}>
                      {tocandoVoz === v.id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                    </button>
                    <div className="min-w-0">
                      <input value={v.nome} placeholder="Nome amigável" className={`${inputCls} font-bold`}
                        onChange={e => setVozes(p => p.map((x, j) => j === i ? { ...x, nome: e.target.value } : x))} />
                      <p className="text-[10px] text-slate-500 font-mono truncate mt-1" title={v.voiceId}>
                        {v.voiceId || 'sem voice_id'}
                        {v.clonada && <span className="ml-2 text-violet-400 font-sans font-bold">clonada</span>}
                      </p>
                    </div>
                    {v.cliente && <span className="text-[10px] text-amber-400 whitespace-nowrap">de um cliente</span>}
                    <button onClick={() => setVozes(p => p.map((x, j) => j === i ? { ...x, ativa: !x.ativa } : x))}
                      className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold whitespace-nowrap ${v.ativa ? 'bg-emerald-500/15 text-emerald-400' : 'bg-white/5 text-slate-500'}`}>
                      {v.ativa ? 'Ativa' : 'Inativa'}
                    </button>
                    <button onClick={() => setVozes(p => p.filter((_, j) => j !== i))}
                      className="p-2 text-slate-500 hover:text-rose-400 transition-colors" title="Remover do catálogo">
                      <Trash2 size={14} />
                    </button>

                    {/* Ouvir uma voz clonada exige sintetizar algo com ela. */}
                    <div className="sm:col-span-5 flex items-center gap-2 pt-1">
                      <input
                        value={textoPrevia[v.id] ?? TEXTO_PREVIA_PADRAO}
                        onChange={e => setTextoPrevia(p => ({ ...p, [v.id]: e.target.value }))}
                        placeholder="Texto da prévia"
                        className={`${inputCls} text-xs`} />
                      <button onClick={() => gerarPrevia(v)} disabled={gerandoPrevia === v.id}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-black/5 dark:bg-white/10 hover:bg-violet-600 hover:text-white disabled:opacity-50 text-slate-400 text-xs font-bold whitespace-nowrap transition-colors">
                        {gerandoPrevia === v.id
                          ? <><Loader2 size={12} className="animate-spin" /> Gerando…</>
                          : <><Mic size={12} /> {v.previewUrl ? 'Regerar' : 'Gerar prévia'}</>}
                      </button>
                    </div>
                  </div>
                ))}
                {vozes.length === 0 && (
                  <p className="text-xs text-slate-500 py-6 text-center">Nenhuma voz clonada ainda.</p>
                )}
              </div>
            </>
          )}

          {/* ── AVATARES ── */}
          {aba === 'avatares' && (
            <>
              <p className="text-xs text-slate-500">
                Mesmo card que aparece no fluxo de geração. Cada avatar tem uma voz padrão —
                é ela que fala no vídeo, sem escolha na hora de produzir.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {avatares.map((a, i) => {
                  const alterar = (campo: Partial<Avatar>) =>
                    setAvatares(p => p.map((x, j) => (j === i ? { ...x, ...campo } : x)));
                  return (
                    <div key={a.id} className={`rounded-2xl border p-3 space-y-2.5 transition-colors ${
                      a.ativo ? 'border-black/10 dark:border-white/10' : 'border-black/10 dark:border-white/5 opacity-60'}`}>
                      {/* Clicar na prévia sobe a foto. Sem foto, fica o bloco de cor. */}
                      <label className="aspect-[3/4] rounded-xl overflow-hidden flex items-center justify-center relative cursor-pointer group/foto block"
                        style={{ background: `linear-gradient(160deg, ${a.cor}33, ${a.cor}11)` }}>
                        <input type="file" accept="image/*" className="hidden"
                          onChange={e => { const f = e.target.files?.[0]; if (f) void enviarFoto(a.id, f); e.target.value = ''; }} />
                        {a.previewUrl
                          ? <img src={a.previewUrl} alt={a.nome} className="w-full h-full object-cover" />
                          : <UserSquare2 size={30} style={{ color: a.cor }} />}

                        {subindoFoto === a.id ? (
                          <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center gap-2">
                            <Loader2 size={20} className="animate-spin text-white" />
                            <span className="text-[10px] font-bold text-white">Enviando…</span>
                          </div>
                        ) : (
                          <div className="absolute inset-0 bg-black/55 opacity-0 group-hover/foto:opacity-100 transition-opacity flex flex-col items-center justify-center gap-1.5">
                            <ImagePlus size={20} className="text-white" />
                            <span className="text-[10px] font-bold text-white">
                              {a.previewUrl ? 'Trocar foto' : 'Subir foto'}
                            </span>
                          </div>
                        )}

                        <button onClick={e => { e.preventDefault(); alterar({ ativo: !a.ativo }); }}
                          className={`absolute top-2 left-2 px-2 py-0.5 rounded-full text-[9px] font-bold z-10 ${
                            a.ativo ? 'bg-emerald-500/90 text-white' : 'bg-black/60 text-white/70'}`}>
                          {a.ativo ? 'Ativo' : 'Inativo'}
                        </button>
                        <button onClick={e => { e.preventDefault(); setAvatares(p => p.filter((_, j) => j !== i)); }}
                          className="absolute top-2 right-2 w-6 h-6 rounded-full bg-black/60 text-white/70 hover:text-rose-400 flex items-center justify-center transition-colors z-10"
                          title="Excluir avatar">
                          <Trash2 size={11} />
                        </button>
                      </label>

                      <input value={a.nome} placeholder="Nome do avatar"
                        className={`${inputCls} font-bold`}
                        onChange={e => alterar({ nome: e.target.value })} />

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">ID no HeyGen</label>
                        <input value={a.avatarId} placeholder="avatar_id"
                          className={`${inputCls} font-mono text-xs mt-0.5`}
                          onChange={e => alterar({ avatarId: e.target.value })} />
                      </div>

                      <div>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1">
                          <Mic size={9} /> Voz no MiniMax
                        </label>
                        <select value={a.vozId} className={`${inputCls} mt-0.5 text-xs`}
                          onChange={e => alterar({ vozId: e.target.value })}>
                          <option value="">Selecione a voz…</option>
                          {vozes.filter(v => v.ativa).map(v => <option key={v.id} value={v.id}>{v.nome}</option>)}
                        </select>
                        {!a.vozId && <p className="mt-1 text-[10px] text-amber-400">Sem voz, o avatar não aparece no fluxo.</p>}
                      </div>

                      {a.cliente && (
                        <p className="text-[10px] text-amber-400 truncate">Avatar de {a.cliente}</p>
                      )}
                    </div>
                  );
                })}

                <button
                  onClick={() => setAvatares(p => [...p, {
                    id: `a${Date.now()}`, avatarId: '', nome: '', cliente: null, vozId: '',
                    ativo: true, previewUrl: null,
                    cor: ['#7c3aed', '#0ea5e9', '#10b981', '#f59e0b', '#ec4899'][p.length % 5],
                  }])}
                  className="rounded-2xl border border-dashed border-black/15 dark:border-white/15 min-h-[280px] flex flex-col items-center justify-center gap-2 text-slate-400 hover:text-dark-text hover:border-violet-500/50 transition-colors">
                  <Plus size={22} />
                  <span className="text-sm font-bold">Novo avatar</span>
                </button>
              </div>
            </>
          )}

          {/* ── SOM AMBIENTE ── */}
          {aba === 'ambiencia' && (
            <>
              <p className="text-xs text-slate-500">
                Cama de som que entra por baixo da locução — trânsito, rodovia, gente, pássaros.
                A MiniMax não gera ambiência: o arquivo é seu, sobe aqui e é mixado no servidor.
                O <b>volume</b> é a proporção em relação à voz; acima de 0,35 a locução começa a perder nitidez.
              </p>

              <label className={`flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-dashed
                                 border-black/15 dark:border-white/15 text-sm font-bold cursor-pointer transition-colors
                                 ${subindoSom ? 'opacity-60' : 'text-slate-400 hover:text-dark-text hover:border-violet-500/50'}`}>
                <input type="file" accept="audio/*" className="hidden" disabled={subindoSom}
                  onChange={e => { const f = e.target.files?.[0]; if (f) void enviarSom(f); e.target.value = ''; }} />
                {subindoSom
                  ? <><Loader2 size={16} className="animate-spin" /> Enviando…</>
                  : <><Upload size={16} /> Subir som ambiente (mp3, até 20 MB)</>}
              </label>

              <div className="space-y-2">
                {ambiencias.map((a, i) => {
                  const alterar = (campo: Partial<Ambiencia>) =>
                    setAmbiencias(p => p.map((x, j) => (j === i ? { ...x, ...campo } : x)));
                  return (
                    <div key={a.id} className={`rounded-2xl border p-3 flex items-center gap-3 flex-wrap transition-colors ${
                      a.ativa ? 'border-black/10 dark:border-white/10' : 'border-black/10 dark:border-white/5 opacity-60'}`}>
                      <button onClick={() => ouvirSom(a)}
                        className="w-9 h-9 rounded-full bg-violet-500/15 text-violet-400 hover:bg-violet-500/25 flex items-center justify-center shrink-0 transition-colors"
                        title="Ouvir no volume configurado">
                        {tocandoSom === a.id ? <Pause size={14} /> : <Play size={14} className="ml-0.5" />}
                      </button>

                      <input value={a.nome} placeholder="Nome do som (ex.: Rodovia, Pássaros)"
                        className={`${inputCls} font-bold flex-1 min-w-[160px]`}
                        onChange={e => alterar({ nome: e.target.value })} />

                      <div className="w-40">
                        <div className="flex items-center justify-between mb-0.5">
                          <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Volume</label>
                          <span className="text-[11px] font-bold text-dark-text">{a.volume.toFixed(2)}</span>
                        </div>
                        <input type="range" min={0} max={1} step={0.01} value={a.volume}
                          onChange={e => alterar({ volume: parseFloat(e.target.value) })}
                          className="w-full accent-violet-500" />
                      </div>

                      <button onClick={() => alterar({ ativa: !a.ativa })}
                        className={`px-2 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                          a.ativa ? 'bg-emerald-500/15 text-emerald-400' : 'bg-black/10 dark:bg-white/10 text-slate-500'}`}>
                        {a.ativa ? 'Ativo' : 'Inativo'}
                      </button>
                      <button onClick={() => setAmbiencias(p => p.filter((_, j) => j !== i))}
                        className="text-slate-500 hover:text-rose-400 transition-colors shrink-0" title="Excluir">
                        <Trash2 size={14} />
                      </button>
                    </div>
                  );
                })}

                {ambiencias.length === 0 && (
                  <p className="text-xs text-slate-500 italic py-6 text-center">
                    Nenhum som cadastrado. Enquanto estiver vazio, o passo do áudio mostra apenas "Sem ambiente".
                  </p>
                )}
              </div>
            </>
          )}

          {/* ── GASTOS ── */}
          {aba === 'limites' && (() => {
            // Tudo em reais na tela, porque é a moeda do orçamento. Por baixo o
            // HeyGen cobra em dólar por minuto de render — daí o câmbio editável.
            const fmt = (v: number) => v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
            const distribuido = cotas.filter(c => c.modo === 'valor').reduce((t, c) => t + c.limite, 0);
            const estourou = distribuido > tetoMensal;
            const emVideos = cotas.filter(c => c.modo === 'videos');

            return (
              <>
                <p className="text-xs text-slate-500">
                  Teto mensal em <b>reais</b>. O custo de cada vídeo é congelado na hora da geração
                  (duração × preço do minuto × câmbio), então mudar preço ou câmbio aqui não reescreve o passado.
                  Zero = sem limite.
                </p>

                <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
                  <div className="flex items-end justify-between gap-4 flex-wrap">
                    <div className="flex-1 min-w-[180px]">
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                        Teto da conta por mês (R$)
                      </label>
                      <input type="number" min={0} step={50} value={tetoMensal} className={`${inputCls} mt-1 max-w-[140px]`}
                        onChange={e => setTetoMensal(parseFloat(e.target.value) || 0)} />
                      <p className="mt-1 text-[10px] text-slate-500 italic">
                        * É o número que aparece na barra do topo da página do Estúdio.
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Distribuído aos heads</p>
                      <p className={`text-2xl font-black leading-none mt-1 ${estourou ? 'text-rose-400' : 'text-emerald-400'}`}>
                        {fmt(distribuido)} <span className="text-sm text-slate-500 font-bold">/ {fmt(tetoMensal)}</span>
                      </p>
                    </div>
                  </div>

                  <div className="mt-3 h-2 rounded-full bg-black/10 dark:bg-white/10 overflow-hidden">
                    <div className={`h-full rounded-full transition-all ${estourou ? 'bg-rose-500' : 'bg-emerald-500'}`}
                      style={{ width: `${tetoMensal > 0 ? Math.min(100, (distribuido / tetoMensal) * 100) : 0}%` }} />
                  </div>

                  {estourou && (
                    <p className="mt-2 text-[11px] font-bold text-rose-400">
                      A soma dos limites passa o teto em {fmt(distribuido - tetoMensal)}.
                    </p>
                  )}
                  {emVideos.length > 0 && (
                    <p className="mt-2 text-[11px] text-slate-500">
                      {emVideos.length} head(s) com limite em quantidade não entram nesta conta — o gasto deles
                      depende da duração de cada vídeo.
                    </p>
                  )}
                </div>

                {/* Preço do minuto e câmbio: é daqui que sai todo número de gasto. */}
                <div className="rounded-2xl border border-black/10 dark:border-white/10 p-4">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">
                    Preço do minuto no HeyGen (US$)
                  </p>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-2">
                    {([
                      ['avatar_iii', 'Avatar III'],
                      ['avatar_iv', 'Avatar IV'],
                      ['avatar_v', 'Avatar V'],
                    ] as const).map(([id, rotulo]) => (
                      <div key={id}>
                        <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">{rotulo}</label>
                        <input type="number" min={0} step={0.01} value={precoMinuto[id] ?? 0}
                          className={`${inputCls} mt-0.5`}
                          onChange={e => setPrecoMinuto(p => ({ ...p, [id]: parseFloat(e.target.value) || 0 }))} />
                      </div>
                    ))}
                    <div>
                      <label className="text-[9px] font-bold text-slate-500 uppercase tracking-widest">Dólar (R$)</label>
                      <input type="number" min={0} step={0.01} value={cambio} className={`${inputCls} mt-0.5`}
                        onChange={e => setCambio(parseFloat(e.target.value) || 0)} />
                    </div>
                  </div>
                  <p className="mt-2 text-[10px] text-slate-500 italic">
                    * Só o Avatar IV foi medido: 30 s custaram US$ 1,17 na carteira da API, ou US$ 2,33/min.
                    III e V estão com o mesmo número por falta de medição — corrija quando medir.
                  </p>
                </div>

                {cotas.length === 0 ? (
                  <p className="text-xs text-slate-500 py-8 text-center">Nenhum head efetivado encontrado.</p>
                ) : (
                  <div className="space-y-2">
                    {cotas.map((c, i) => (
                      <div key={c.email} className="grid grid-cols-1 sm:grid-cols-[1fr_auto_140px] gap-3 items-center rounded-xl border border-black/10 dark:border-white/10 p-3">
                        <div className="min-w-0">
                          <p className="text-sm font-bold text-dark-text truncate">{c.nome}</p>
                          <p className="text-[10px] text-slate-500 truncate">
                            {c.email}
                            {c.usado > 0 && <> · gastou <b className="text-dark-text">{fmt(c.usado)}</b> este mês</>}
                          </p>
                        </div>
                        <div className="flex items-center gap-1 bg-black/5 dark:bg-white/5 rounded-xl p-1">
                          {(['valor', 'videos'] as const).map(m => (
                            <button key={m} onClick={() => setCotas(p => p.map((x, j) => j === i ? { ...x, modo: m } : x))}
                              className={`px-2.5 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
                                c.modo === m ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-dark-text'}`}>
                              {m === 'valor' ? 'Reais' : 'Vídeos'}
                            </button>
                          ))}
                        </div>
                        <input type="number" min={0} step={c.modo === 'valor' ? 10 : 1} value={c.limite} className={inputCls}
                          onChange={e => setCotas(p => p.map((x, j) => j === i ? { ...x, limite: parseFloat(e.target.value) || 0 } : x))} />
                      </div>
                    ))}
                  </div>
                )}
              </>
            );
          })()}
          </>)}
        </div>

        <div className="p-5 border-t border-black/10 dark:border-white/10 flex items-center justify-end gap-3">
          <button onClick={onFechar} className="px-4 py-2.5 rounded-xl text-sm font-bold text-slate-400 hover:text-dark-text">Fechar</button>
          <button onClick={salvar} disabled={salvando}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-50 text-white text-sm font-bold transition-colors">
            {salvando ? <Loader2 size={15} className="animate-spin" /> : <Check size={15} />} Salvar
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default EstudioConfig;
