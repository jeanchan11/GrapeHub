import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Camera, Check, ChevronRight, FolderTree, Bell, Shield, LogOut, Monitor, Sun, Moon,
  Lock, LifeBuoy, Loader2, Save, Sparkles, PanelLeftClose, Search,
} from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import SplitHeadline from '../components/SplitHeadline';
import { Cartao } from '../components/graficos';
import { Modal } from '../components/ui/Modal';
import { CarregandoBloco } from '../components/LoadingSpinner';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../context/MenuContext';
import { iconMap } from '../lib/iconMap';
import { designSystem } from '../design-system';
import { toast } from '@/src/lib/toast';
import { confirmDialog } from '@/src/lib/confirm';
import { PREF_SEM_BOAS_VINDAS } from '../components/BoasVindas';

/**
 * Configurações (refeita em 18/11/2026): coisas que funcionam para TODO mundo — perfil,
 * aparência, o que eu acesso, sessão — e, só para o superadmin, a administração.
 * A versão anterior (Placeholders.tsx) tinha cartões sem ação ("Segurança", "Idioma",
 * "Logs") e uma lista fixa de automações desatualizada.
 */

type TemaPref = 'system' | 'light' | 'darker';

const PAPEIS: Record<string, string> = {
  superadmin: 'Superadmin',
  'diretor-operacional': 'Diretor Operacional',
  'gerente-operacional': 'Gerente Operacional',
  'gerente-comercial': 'Gerente Comercial',
  'gestor-trafego': 'Gestor de Tráfego',
  'analista-ia': 'Analista de IA',
  design: 'Design',
  user: 'Usuário padrão',
};

const lerPref = (k: string) => { try { return localStorage.getItem(k); } catch { return null; } };
const gravarPref = (k: string, v: string | null) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, v); } catch { /* */ } };

/** Recorta a foto no centro e reduz para 256×256 (o perfil guarda a imagem em data URL). */
async function fotoQuadrada(arquivo: File): Promise<string> {
  const url = await new Promise<string>((ok, erro) => {
    const r = new FileReader(); r.onload = () => ok(String(r.result)); r.onerror = erro; r.readAsDataURL(arquivo);
  });
  const img = new Image();
  img.src = url;
  await new Promise(ok => { img.onload = ok; });
  const lado = Math.min(img.width, img.height);
  const c = document.createElement('canvas');
  c.width = 256; c.height = 256;
  c.getContext('2d')?.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 256, 256);
  return c.toDataURL('image/jpeg', 0.85);
}

const Interruptor: React.FC<{ ligado: boolean; onChange: (v: boolean) => void }> = ({ ligado, onChange }) => (
  <button
    type="button"
    role="switch"
    aria-checked={ligado}
    onClick={() => onChange(!ligado)}
    className={`relative w-10 h-[22px] rounded-full shrink-0 transition-colors ${ligado ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/15'}`}
  >
    <span className={`absolute left-0 top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${ligado ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
  </button>
);

const LinhaOpcao: React.FC<{ titulo: string; descricao: string; Icone: any; children: React.ReactNode }> = ({ titulo, descricao, Icone, children }) => (
  <div className="flex items-center gap-4 py-3.5 border-t border-black/5 dark:border-white/5 first:border-t-0">
    <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0"><Icone size={17} /></div>
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-medium text-dark-text">{titulo}</p>
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{descricao}</p>
    </div>
    {children}
  </div>
);

const LinhaAcao: React.FC<{ titulo: string; descricao: string; Icone: any; onClick: () => void }> = ({ titulo, descricao, Icone, onClick }) => (
  <button type="button" onClick={onClick} className="group w-full flex items-center gap-4 py-3.5 text-left border-t border-black/5 dark:border-white/5 first:border-t-0">
    <div className="w-9 h-9 rounded-xl bg-violet-500/10 text-violet-500 flex items-center justify-center shrink-0"><Icone size={17} /></div>
    <div className="min-w-0 flex-1">
      <p className="text-[14px] font-medium text-dark-text group-hover:text-violet-500 transition-colors">{titulo}</p>
      <p className="text-[12.5px] text-slate-500 dark:text-slate-400">{descricao}</p>
    </div>
    <ChevronRight size={16} className="text-slate-400 group-hover:text-violet-500 group-hover:translate-x-0.5 transition-all" />
  </button>
);

/** Página como pílula clicável (ícone + nome, e a seção quando vem da busca). */
const ChipPagina: React.FC<{ p: { label: string; icon?: string; icon_color?: string }; detalhe?: string; onClick: () => void }> = ({ p, detalhe, onClick }) => {
  const Icone = (p.icon && (iconMap as any)[p.icon]) || ChevronRight;
  return (
    <button type="button" onClick={onClick}
      className="inline-flex items-center gap-2 h-9 pl-2.5 pr-3.5 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-white/[0.03] text-[13px] text-slate-600 dark:text-slate-300 hover:text-dark-text hover:border-violet-500/40 hover:bg-violet-500/5 transition-colors">
      <Icone size={14} className="shrink-0" color={p.icon_color || undefined} />
      <span className="whitespace-nowrap">{p.label}</span>
      {detalhe && <span className="text-[11px] text-slate-400">· {detalhe}</span>}
    </button>
  );
};

export default function Configuracoes({ onPageChange, isSuperAdmin, themePref, setThemePref }: {
  onPageChange?: (page: string) => void;
  isSuperAdmin?: boolean;
  themePref: TemaPref;
  setThemePref: (t: TemaPref) => void;
}) {
  const { user, userData, refreshUserData } = useAuth();
  const { menu } = useMenu();
  const [secao, setSecao] = useState<'main' | 'categorias'>('main');

  // ── Perfil ──
  const [perfil, setPerfil] = useState({ picture: '', phone: '', bio: '' });
  const [salvandoPerfil, setSalvandoPerfil] = useState(false);
  const inputFoto = useRef<HTMLInputElement>(null);
  useEffect(() => {
    setPerfil({ picture: userData?.picture || user?.photoURL || '', phone: userData?.phone || '', bio: userData?.bio || '' });
  }, [userData?.id, userData?.picture, userData?.phone, userData?.bio, user?.photoURL]);
  const perfilMudou = !!userData && (
    perfil.picture !== (userData.picture || user?.photoURL || '') || perfil.phone !== (userData.phone || '') || perfil.bio !== (userData.bio || '')
  );

  const trocarFoto = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0];
    e.target.value = '';
    if (!f) return;
    if (!f.type.startsWith('image/')) { toast.error('Escolha uma imagem (JPG, PNG ou WebP).'); return; }
    try { const p = await fotoQuadrada(f); setPerfil(v => ({ ...v, picture: p })); }
    catch { toast.error('Não foi possível ler a imagem.'); }
  };

  const salvarPerfil = async () => {
    if (!userData) return;
    setSalvandoPerfil(true);
    try {
      // Mesmo corpo do "Editar perfil" do menu lateral (o PUT de usuário regrava estes campos)
      const r = await fetch(`/api/users/${userData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: userData.role,
          allowedPages: userData.allowedPages,
          name: userData.name,
          squad: userData.squad,
          picture: perfil.picture,
          phone: perfil.phone,
          bio: perfil.bio,
        }),
      });
      if (!r.ok) throw new Error();
      await refreshUserData();
      toast.success('Perfil atualizado');
    } catch {
      toast.error('Não foi possível salvar o perfil.');
    } finally {
      setSalvandoPerfil(false);
    }
  };

  // ── Preferências locais (deste navegador) ──
  const [menuRecolhido, setMenuRecolhido] = useState(() => lerPref('sidebar-collapsed') === 'true');
  const [boasVindas, setBoasVindas] = useState(() => lerPref(PREF_SEM_BOAS_VINDAS) !== '1');

  // ── O que eu acesso ──
  const minhasPaginas = useMemo(() => {
    const permitido = (id: string) => isSuperAdmin || userData?.allowedPages?.includes(id);
    const secoes: { titulo: string; paginas: { id: string; label: string; icon?: string; icon_color?: string; template?: string }[] }[] = [];
    const coletar = (c: any, acc: any[]) => {
      (c.pages || []).forEach((p: any) => { if (permitido(p.id)) acc.push(p); });
      (c.subSessions || []).forEach((ss: any) => coletar(ss, acc));
      (c.subSubSessions || []).forEach((sss: any) => coletar(sss, acc));
    };
    for (const s of Array.isArray(menu) ? menu : []) {
      const acc: any[] = [];
      coletar(s, acc);
      if (acc.length) secoes.push({ titulo: s.title, paginas: acc });
    }
    return secoes;
  }, [menu, userData?.allowedPages, isSuperAdmin]);
  const totalPaginas = minhasPaginas.reduce((n, s) => n + s.paginas.length, 0);
  const [buscaPagina, setBuscaPagina] = useState('');
  const [secaoAcesso, setSecaoAcesso] = useState<string | null>(null);
  const paginaChamados = minhasPaginas.flatMap(s => s.paginas).find(p => p.template === 'chamados-grapehub');

  // ── Webhook de alertas (superadmin) ──
  const [webhookAberto, setWebhookAberto] = useState(false);
  const [webhook, setWebhook] = useState({ url: '', secret: '', enabled: false });
  const [webhookCarregando, setWebhookCarregando] = useState(false);
  const [webhookSalvando, setWebhookSalvando] = useState(false);
  const abrirWebhook = async () => {
    setWebhookAberto(true); setWebhookCarregando(true);
    try { const r = await fetch('/api/alert-webhook'); if (r.ok) { const d = await r.json(); setWebhook({ url: d.url || '', secret: d.secret || '', enabled: !!d.enabled }); } }
    catch { /* */ } finally { setWebhookCarregando(false); }
  };
  const salvarWebhook = async () => {
    setWebhookSalvando(true);
    try {
      const r = await fetch('/api/alert-webhook', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(webhook) });
      r.ok ? toast.success('Configuração salva') : toast.error('Erro ao salvar');
    } catch { toast.error('Falha de conexão'); } finally { setWebhookSalvando(false); }
  };
  const testarWebhook = async () => {
    try {
      const r = await fetch('/api/alert-webhook/test', { method: 'POST' });
      const d = await r.json();
      d.sent ? toast.success('Teste disparado — confira no n8n / grupo') : toast.error('Não enviado — salve uma URL ativa primeiro');
    } catch { toast.error('Falha ao testar'); }
  };

  const sair = async () => {
    if (await confirmDialog({ title: 'Sair do GrapeHub?', message: 'Você vai voltar para a tela de login.', confirmText: 'Sair' })) signOut(auth);
  };

  if (secao === 'categorias') {
    const FinCategories = React.lazy(() => import('./FinCategories'));
    return (
      <React.Suspense fallback={<CarregandoBloco className="py-24" />}>
        <FinCategories onBack={() => setSecao('main')} />
      </React.Suspense>
    );
  }

  const campo = 'w-full h-10 rounded-xl px-3.5 text-sm bg-white dark:bg-white/5 border border-black/10 dark:border-white/10 text-dark-text placeholder:text-slate-400 outline-none focus:border-violet-500/60 focus:ring-2 focus:ring-violet-500/15 transition-colors';
  const foto = perfil.picture || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.email}`;

  const temas: { id: TemaPref; rotulo: string; Icone: any; previa: string }[] = [
    { id: 'system', rotulo: 'Sistema', Icone: Monitor, previa: 'linear-gradient(135deg,#f8fafc 50%,#1A1726 50%)' },
    { id: 'light', rotulo: 'Claro', Icone: Sun, previa: '#f8fafc' },
    { id: 'darker', rotulo: 'Escuro', Icone: Moon, previa: '#1A1726' },
  ];

  return (
    <div className="px-6 md:px-8 pt-8 pb-12 max-w-5xl mx-auto space-y-5">
      <SplitHeadline text="Configura" highlight="ções" subtitle="Seu perfil, a aparência do GrapeHub e o que você acessa." />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Perfil ── */}
        <Cartao className="lg:col-span-7" titulo="Meu perfil" legenda="Nome e e-mail vêm da sua conta Google; foto, telefone e bio você muda aqui.">
          <div className="flex items-center gap-4 mb-5">
            <div className="relative shrink-0">
              <img src={foto} alt="" className="w-20 h-20 rounded-2xl object-cover border border-black/10 dark:border-white/10" referrerPolicy="no-referrer" />
              <button
                type="button"
                onClick={() => inputFoto.current?.click()}
                className="absolute -bottom-1.5 -right-1.5 w-8 h-8 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shadow-lg transition-colors"
                title="Trocar foto"
              >
                <Camera size={14} />
              </button>
              <input ref={inputFoto} type="file" accept="image/png,image/jpeg,image/webp,image/gif" className="hidden" onChange={trocarFoto} />
            </div>
            <div className="min-w-0">
              <p className="text-[17px] font-semibold text-dark-text truncate">{userData?.name || user?.displayName || 'Usuário'}</p>
              <p className="text-[13px] text-slate-500 dark:text-slate-400 truncate">{user?.email}</p>
              <div className="flex flex-wrap gap-1.5 mt-2">
                {userData?.role && <span className="pilula-cartao">{PAPEIS[userData.role] || userData.role}</span>}
                {userData?.squad && <span className="pilula-cartao">Squad {userData.squad}</span>}
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Telefone</span>
              <input value={perfil.phone} onChange={e => setPerfil(v => ({ ...v, phone: e.target.value }))} placeholder="(00) 00000-0000" className={`${campo} mt-1`} />
            </label>
            <label className="block sm:col-span-2">
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Bio</span>
              <textarea value={perfil.bio} onChange={e => setPerfil(v => ({ ...v, bio: e.target.value }))} rows={3} placeholder="Conte um pouco sobre você e o que faz no time…" className={`${campo} h-auto py-2.5 mt-1 resize-none`} />
            </label>
          </div>
          <div className="flex items-center justify-end gap-3 mt-4">
            {perfilMudou && <span className="text-[12px] text-amber-600 dark:text-amber-400">Alterações não salvas</span>}
            <button type="button" onClick={salvarPerfil} disabled={!perfilMudou || salvandoPerfil} className={designSystem.button.principal}>
              {salvandoPerfil ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar perfil
            </button>
          </div>
        </Cartao>

        {/* ── Aparência ── */}
        <Cartao className="lg:col-span-5" titulo="Aparência" legenda="Vale para este navegador.">
          <div className="grid grid-cols-3 gap-2 mb-4">
            {temas.map(t => {
              const sel = themePref === t.id;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => setThemePref(t.id)}
                  className={`relative rounded-2xl p-2 border-2 transition-colors text-left ${sel ? 'border-violet-500' : 'border-black/10 dark:border-white/10 hover:border-violet-500/40'}`}
                >
                  <div className="h-14 rounded-xl border border-black/10 dark:border-white/10" style={{ background: t.previa }} />
                  <p className="mt-2 flex items-center gap-1.5 text-[12.5px] font-medium text-dark-text"><t.Icone size={13} /> {t.rotulo}</p>
                  {sel && <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-violet-600 text-white flex items-center justify-center"><Check size={12} /></span>}
                </button>
              );
            })}
          </div>
          <LinhaOpcao Icone={PanelLeftClose} titulo="Menu lateral recolhido" descricao="Abrir o GrapeHub com o menu só com os ícones">
            <Interruptor ligado={menuRecolhido} onChange={v => { setMenuRecolhido(v); gravarPref('sidebar-collapsed', String(v)); toast.success('Vale na próxima vez que abrir o GrapeHub'); }} />
          </LinhaOpcao>
          <LinhaOpcao Icone={Sparkles} titulo="Recepção ao entrar" descricao="A animação de boas-vindas depois do login">
            <Interruptor ligado={boasVindas} onChange={v => { setBoasVindas(v); gravarPref(PREF_SEM_BOAS_VINDAS, v ? null : '1'); }} />
          </LinhaOpcao>
        </Cartao>
      </div>

      {/* ── Meu acesso ── */}
      <Cartao
        titulo={<span className="flex items-center gap-2">Meu acesso <span className="pilula-cartao">{isSuperAdmin ? 'todas as páginas' : `${totalPaginas} ${totalPaginas === 1 ? 'página' : 'páginas'}`}</span></span>}
        legenda="As páginas que aparecem no seu menu. Se faltar alguma, peça ao administrador."
        acao={paginaChamados ? (
          <button type="button" onClick={() => onPageChange?.(paginaChamados.id)} className={designSystem.button.secundario}>
            <LifeBuoy size={15} /> Abrir chamado
          </button>
        ) : undefined}
      >
        {minhasPaginas.length === 0 ? (
          <p className="text-sm text-slate-500 py-4">Nenhuma página liberada ainda.</p>
        ) : (
          <>
            {/* Busca: acha a página e já abre */}
            <div className="relative mb-4">
              <Search size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
              <input value={buscaPagina} onChange={e => setBuscaPagina(e.target.value)} placeholder={`Buscar entre as ${totalPaginas} páginas…`} className={`${campo} pl-10`} />
            </div>

            {buscaPagina.trim() ? (() => {
              const q = buscaPagina.trim().toLowerCase();
              const achadas = minhasPaginas.flatMap(sec => sec.paginas.map(p => ({ ...p, secao: sec.titulo }))).filter(p => p.label.toLowerCase().includes(q));
              return achadas.length === 0
                ? <p className="text-sm text-slate-500 py-3">Nenhuma página com “{buscaPagina}”.</p>
                : <div className="flex flex-wrap gap-2">{achadas.map(p => <ChipPagina key={p.id} p={p} detalhe={p.secao} onClick={() => onPageChange?.(p.id)} />)}</div>;
            })() : (
              <>
                {/* Um bloco por seção, com a contagem; clicar abre as páginas dela */}
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {minhasPaginas.map(sec => {
                    const aberta = secaoAcesso === sec.titulo;
                    return (
                      <button
                        key={sec.titulo}
                        type="button"
                        onClick={() => setSecaoAcesso(aberta ? null : sec.titulo)}
                        className={`text-left rounded-2xl px-4 py-3 border transition-colors ${aberta ? 'border-violet-500/60 bg-violet-500/10' : 'border-black/10 dark:border-white/10 hover:border-violet-500/40'}`}
                      >
                        <p className="text-[10.5px] font-bold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400 truncate">{sec.titulo}</p>
                        <p className="mt-1 flex items-baseline gap-1.5">
                          <span className="numero text-[22px] leading-none text-dark-text">{sec.paginas.length}</span>
                          <span className="text-[12px] text-slate-500">{sec.paginas.length === 1 ? 'página' : 'páginas'}</span>
                        </p>
                      </button>
                    );
                  })}
                </div>
                {secaoAcesso && (() => {
                  const sec = minhasPaginas.find(x => x.titulo === secaoAcesso);
                  if (!sec) return null;
                  return (
                    <div className="mt-4 pt-4 border-t border-black/5 dark:border-white/5">
                      <div className="flex flex-wrap gap-2">
                        {sec.paginas.map(p => <ChipPagina key={p.id} p={p} onClick={() => onPageChange?.(p.id)} />)}
                      </div>
                    </div>
                  );
                })()}
              </>
            )}
          </>
        )}
      </Cartao>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* ── Administração (só superadmin) ── */}
        {isSuperAdmin && (
          <Cartao className="lg:col-span-7" titulo={<span className="flex items-center gap-2"><Lock size={15} className="text-violet-500" /> Administração</span>} legenda="Só você vê esta parte.">
            <LinhaAcao Icone={Shield} titulo="Usuários e permissões" descricao="Funções, páginas liberadas e squads de cada pessoa" onClick={() => onPageChange?.('admin')} />
            <LinhaAcao Icone={FolderTree} titulo="Plano de contas" descricao="Categorias financeiras usadas no DFC e na conciliação" onClick={() => setSecao('categorias')} />
            <LinhaAcao Icone={Bell} titulo="Webhook de alertas" descricao="Erros e alertas do sistema enviados para o n8n / WhatsApp" onClick={abrirWebhook} />
          </Cartao>
        )}

        {/* ── Sessão ── */}
        <Cartao className={isSuperAdmin ? 'lg:col-span-5' : 'lg:col-span-12'} titulo="Sessão" legenda={`Conectado como ${user?.email || ''}`}>
          <button type="button" onClick={sair} className="inline-flex items-center gap-2 h-10 px-4 rounded-xl text-sm font-semibold text-rose-600 dark:text-rose-400 border border-rose-500/30 hover:bg-rose-500/10 transition-colors">
            <LogOut size={15} /> Sair do GrapeHub
          </button>
        </Cartao>
      </div>

      {/* ── Popup do webhook ── */}
      <Modal
        isOpen={webhookAberto}
        onClose={() => setWebhookAberto(false)}
        title="Webhook de alertas"
        icon={<Bell size={18} />}
        maxWidth="max-w-lg"
        footer={<>
          <button type="button" onClick={testarWebhook} className={designSystem.button.secundario}>Enviar teste</button>
          <button type="button" onClick={salvarWebhook} disabled={webhookSalvando} className={designSystem.button.principal}>
            {webhookSalvando ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />} Salvar
          </button>
        </>}
      >
        {webhookCarregando ? <CarregandoBloco /> : (
          <div className="space-y-4">
            <p className="text-[13px] text-slate-500 dark:text-slate-400">O sistema envia erros e alertas para esta URL (n8n), que repassa no WhatsApp.</p>
            <label className="block">
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">URL do webhook</span>
              <input value={webhook.url} onChange={e => setWebhook(v => ({ ...v, url: e.target.value }))} placeholder="https://…" className={`${campo} mt-1`} />
            </label>
            <label className="block">
              <span className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Segredo (opcional)</span>
              <input value={webhook.secret} onChange={e => setWebhook(v => ({ ...v, secret: e.target.value }))} className={`${campo} mt-1`} />
            </label>
            <div className="flex items-center justify-between">
              <span className="text-[13.5px] text-dark-text">Envio ligado</span>
              <Interruptor ligado={webhook.enabled} onChange={v => setWebhook(w => ({ ...w, enabled: v }))} />
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
}

