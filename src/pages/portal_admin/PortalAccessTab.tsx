// Aba "Acesso do Portal" no modal do projeto — gestão define o login do cliente.
import React, { useState, useEffect } from 'react';
import { Loader2, KeyRound, Mail, ShieldCheck, ShieldOff, RefreshCw, Copy, Check, Trash2, ExternalLink } from 'lucide-react';
import { confirmDialog } from '@/src/lib/confirm';

interface ClientAccount { id: string; email: string; name: string | null; active: boolean; last_login: string | null; created_at: string; }

const genPassword = () => {
  const chars = 'abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let s = '';
  for (let i = 0; i < 10; i++) s += chars[Math.floor(Math.random() * chars.length)];
  return s;
};

const PortalAccessTab: React.FC<{ projectId: string; partnerName?: string }> = ({ projectId, partnerName }) => {
  const [loading, setLoading] = useState(true);
  const [accounts, setAccounts] = useState<ClientAccount[]>([]);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: 'ok' | 'err'; text: string } | null>(null);
  const [copied, setCopied] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const r = await fetch(`/api/portal/admin/clients/by-project/${projectId}`);
      const d = r.ok ? await r.json() : [];
      setAccounts(Array.isArray(d) ? d : []);
    } catch { setAccounts([]); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [projectId]);

  const existing = accounts[0] || null;

  const save = async () => {
    setMsg(null);
    const em = email.trim().toLowerCase();
    if (!em) { setMsg({ type: 'err', text: 'Informe o e-mail do cliente.' }); return; }
    if (!existing && password.length < 6) { setMsg({ type: 'err', text: 'Defina uma senha de ao menos 6 caracteres.' }); return; }
    setSaving(true);
    try {
      const r = await fetch('/api/portal/admin/provision', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: em, password: password || undefined, name: partnerName, projectId }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) { setMsg({ type: 'err', text: d.error || 'Falha ao salvar.' }); }
      else {
        setMsg({ type: 'ok', text: password ? 'Acesso salvo. Envie o e-mail e a senha ao cliente.' : 'Acesso atualizado.' });
        setEmail(''); setPassword('');
        await load();
      }
    } catch { setMsg({ type: 'err', text: 'Erro de conexão.' }); }
    setSaving(false);
  };

  const toggleActive = async (acc: ClientAccount) => {
    await fetch(`/api/portal/admin/clients/${acc.id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ active: !acc.active }),
    });
    await load();
  };
  const removeAcc = async (acc: ClientAccount) => {
    if (!(await confirmDialog({ message: `Remover o acesso de ${acc.email}? O cliente não conseguirá mais entrar.`, danger: true }))) return;
    await fetch(`/api/portal/admin/clients/${acc.id}`, { method: 'DELETE' });
    await load();
  };

  const startReset = (acc: ClientAccount) => { setEmail(acc.email); setPassword(genPassword()); setMsg(null); };
  const copyPw = () => { try { navigator.clipboard.writeText(password); setCopied(true); setTimeout(() => setCopied(false), 1500); } catch { /* ignore */ } };

  const inputCls = 'w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl py-2.5 px-3 text-sm text-slate-800 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors';
  const labelCls = 'block text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-1.5';

  if (loading) return <div className="flex justify-center py-16"><Loader2 className="animate-spin text-violet-500" size={30} /></div>;

  return (
    <div className="max-w-2xl space-y-6">
      {/* Estado atual */}
      {existing ? (
        <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4">
          <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400 mb-3">Conta de acesso</p>
          {accounts.map(acc => (
            <div key={acc.id} className="flex items-center gap-3 flex-wrap py-2">
              <div className="w-9 h-9 rounded-lg bg-violet-500/15 text-violet-500 flex items-center justify-center shrink-0"><Mail size={16} /></div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-bold text-slate-800 dark:text-white truncate">{acc.email}</p>
                <p className="text-[11px] text-slate-400">
                  {acc.active ? <span className="text-emerald-500 font-semibold">● Ativo</span> : <span className="text-slate-400 font-semibold">○ Inativo</span>}
                  {' · '}{acc.last_login ? `último acesso ${new Date(acc.last_login).toLocaleDateString('pt-BR')}` : 'nunca acessou'}
                </p>
              </div>
              <button onClick={() => startReset(acc)} className="flex items-center gap-1.5 text-xs font-bold text-violet-500 hover:bg-violet-500/10 px-2.5 py-1.5 rounded-lg transition-colors" title="Redefinir senha"><RefreshCw size={13} /> Nova senha</button>
              <button onClick={() => toggleActive(acc)} className="flex items-center gap-1.5 text-xs font-bold text-slate-500 hover:bg-slate-500/10 px-2.5 py-1.5 rounded-lg transition-colors">
                {acc.active ? <><ShieldOff size={13} /> Desativar</> : <><ShieldCheck size={13} /> Ativar</>}
              </button>
              <button onClick={() => removeAcc(acc)} className="w-8 h-8 flex items-center justify-center rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-500/10 transition-colors" title="Remover"><Trash2 size={14} /></button>
            </div>
          ))}
        </div>
      ) : (
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-white/10 p-5 text-center">
          <div className="w-11 h-11 rounded-xl bg-violet-500/15 text-violet-500 flex items-center justify-center mx-auto mb-2"><KeyRound size={20} /></div>
          <p className="text-sm font-bold text-slate-700 dark:text-white">Sem acesso liberado</p>
          <p className="text-xs text-slate-400 mt-1">Crie um login pra que o cliente acompanhe o projeto no portal.</p>
        </div>
      )}

      {/* Form criar / redefinir */}
      <div className="rounded-2xl border border-slate-200 dark:border-white/10 p-4 space-y-4">
        <p className="text-[11px] font-bold uppercase tracking-widest text-slate-400">{existing ? 'Criar outro acesso / redefinir senha' : 'Criar acesso'}</p>
        <div>
          <label className={labelCls}>E-mail do cliente</label>
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="cliente@empresa.com" className={inputCls} type="email" />
        </div>
        <div>
          <label className={labelCls}>Senha {existing && <span className="normal-case font-medium text-slate-300 dark:text-slate-500">(deixe em branco pra manter a atual)</span>}</label>
          <div className="flex gap-2">
            <input value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" className={inputCls} />
            <button onClick={() => setPassword(genPassword())} className="shrink-0 px-3 rounded-xl border border-slate-200 dark:border-white/10 text-xs font-bold text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors">Gerar</button>
            {password && (
              <button onClick={copyPw} className="shrink-0 px-3 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors" title="Copiar senha">
                {copied ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
              </button>
            )}
          </div>
        </div>

        {msg && (
          <div className={`text-sm rounded-xl px-3 py-2 ${msg.type === 'ok' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-red-500/10 text-red-600 dark:text-red-400'}`}>{msg.text}</div>
        )}

        <button onClick={save} disabled={saving} className="w-full flex items-center justify-center gap-2 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white font-bold text-sm transition-colors">
          {saving ? <Loader2 size={16} className="animate-spin" /> : <KeyRound size={16} />}
          {existing ? 'Salvar acesso' : 'Criar acesso'}
        </button>
      </div>

      <p className="text-xs text-slate-400 flex items-center gap-1.5">
        <ExternalLink size={13} /> O cliente entra em <span className="font-bold text-slate-500 dark:text-slate-300">hub.grapemidia.com.br</span> com esse e-mail e senha.
      </p>
    </div>
  );
};

export default PortalAccessTab;
