// Aba "Formulários" do popup do projeto (visão interna, completa — com UTM/IP).
import React, { useState, useEffect, useMemo } from 'react';
import { Loader2, Copy, Check, Pencil, Inbox } from 'lucide-react';
import ThemedDropdown from './ui/ThemedDropdown';

interface Answer { label: string; value: any; }
interface Submission { id: number; form_id: string; submitted_at: string; answers: Answer[]; meta?: Record<string, any>; }
interface FormInfo { form_id: string; label: string; count: number; }

const fmtDate = (s: string) => {
  try { const d = new Date(s); return `${d.toLocaleDateString('pt-BR')} ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`; } catch { return s; }
};
const META_COLS = ['utm_source', 'utm_medium', 'utm_campaign', 'utm_term', 'utm_content', 'ip_address'];
const metaHead = (c: string) => c === 'ip_address' ? 'IP' : c.replace('utm_', 'UTM ');

const FormulariosTab: React.FC<{ projectId: string }> = ({ projectId }) => {
  const [loading, setLoading] = useState(true);
  const [forms, setForms] = useState<FormInfo[]>([]);
  const [subs, setSubs] = useState<Submission[]>([]);
  const [formFilter, setFormFilter] = useState('all');
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState('');

  const webhookUrl = token ? `https://hub.grapemidia.com.br/api/forms/webhook?token=${token}` : '';

  const load = async () => {
    setLoading(true);
    try {
      const q = formFilter !== 'all' ? `?formId=${encodeURIComponent(formFilter)}` : '';
      const [tRes, sRes] = await Promise.all([
        fetch(`/api/projects/${projectId}/form-token`),
        fetch(`/api/projects/${projectId}/form-submissions${q}`),
      ]);
      if (tRes.ok) setToken((await tRes.json()).token || '');
      if (sRes.ok) { const d = await sRes.json(); setForms(d.forms || []); setSubs(d.submissions || []); }
    } catch { /* ignore */ }
    setLoading(false);
  };
  useEffect(() => { load(); /* eslint-disable-next-line */ }, [projectId, formFilter]);

  const copy = () => { navigator.clipboard.writeText(webhookUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); };

  const columns = useMemo(() => {
    const seen = new Set<string>(); const cols: string[] = [];
    for (const s of subs) for (const a of (s.answers || [])) if (!seen.has(a.label)) { seen.add(a.label); cols.push(a.label); }
    return cols;
  }, [subs]);
  const valOf = (s: Submission, label: string) => s.answers?.find(a => a.label === label)?.value ?? '';

  const currentForm = forms.find(f => f.form_id === formFilter);
  const saveLabel = async () => {
    if (!currentForm) return;
    await fetch(`/api/projects/${projectId}/forms/${currentForm.form_id}`, {
      method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ label: labelDraft }),
    });
    setEditingLabel(false); load();
  };

  const totalCount = forms.reduce((s, f) => s + f.count, 0);
  const formOptions = [{ value: 'all', label: `Todos os formulários (${totalCount})` }, ...forms.map(f => ({ value: f.form_id, label: `${f.label} (${f.count})` }))];

  return (
    <div className="space-y-4">
      {/* Config do webhook */}
      <div className="p-4 rounded-2xl border border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">URL do Webhook — configure no app de formulário</p>
        <div className="flex items-center gap-2">
          <input readOnly value={webhookUrl || 'Carregando...'} className="flex-1 bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-slate-700 dark:text-slate-300 outline-none" />
          <button onClick={copy} disabled={!webhookUrl} className="px-3 py-2 rounded-lg bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 text-xs font-bold flex items-center gap-1.5 shrink-0 disabled:opacity-50">
            {copied ? <Check size={13} /> : <Copy size={13} />}{copied ? 'Copiado' : 'Copiar'}
          </button>
        </div>
        <p className="text-[10px] text-slate-400 mt-2">Todos os formulários deste cliente usam esta mesma URL. O cliente vê só as respostas; UTM/IP ficam só nesta aba.</p>
      </div>

      {/* Seletor + renomear */}
      {forms.length > 0 && (
        <div className="flex items-center gap-3 flex-wrap">
          <ThemedDropdown value={formFilter} onChange={setFormFilter} className="w-[300px]" options={formOptions} />
          {currentForm && (editingLabel ? (
            <div className="flex items-center gap-2">
              <input value={labelDraft} onChange={e => setLabelDraft(e.target.value)} autoFocus className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-lg px-2.5 py-1.5 text-sm text-slate-800 dark:text-white outline-none focus:border-violet-500" placeholder="Nome do formulário" />
              <button onClick={saveLabel} className="px-2.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-600 text-white text-xs font-bold">Salvar</button>
              <button onClick={() => setEditingLabel(false)} className="text-xs text-slate-400 hover:text-slate-600">Cancelar</button>
            </div>
          ) : (
            <button onClick={() => { setLabelDraft(currentForm.label); setEditingLabel(true); }} className="flex items-center gap-1.5 text-xs font-medium text-slate-400 hover:text-violet-500 transition-colors"><Pencil size={12} /> Renomear</button>
          ))}
        </div>
      )}

      {/* Tabela */}
      {loading ? (
        <div className="flex justify-center py-12"><Loader2 className="animate-spin text-violet-500" size={26} /></div>
      ) : subs.length === 0 ? (
        <div className="flex flex-col items-center gap-2 py-12 text-slate-400">
          <Inbox size={28} className="opacity-40" />
          <p className="text-sm font-medium">Nenhum preenchimento ainda.</p>
          <p className="text-xs">Cole a URL do webhook acima na configuração do formulário.</p>
        </div>
      ) : (
        <div className="overflow-x-auto rounded-2xl border border-slate-200 dark:border-white/10">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-200 dark:border-white/10 bg-slate-50 dark:bg-white/5">
                <th className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Data</th>
                {columns.map(c => <th key={c} className="text-left px-3 py-2.5 text-[10px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">{c}</th>)}
                {META_COLS.map(c => <th key={c} className="text-left px-3 py-2.5 text-[10px] font-bold text-violet-500/70 uppercase tracking-wider whitespace-nowrap">{metaHead(c)}</th>)}
              </tr>
            </thead>
            <tbody>
              {subs.map(s => (
                <tr key={s.id} className="border-b border-slate-100 dark:border-white/5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                  <td className="px-3 py-2.5 text-slate-500 whitespace-nowrap text-xs">{fmtDate(s.submitted_at)}</td>
                  {columns.map(c => <td key={c} className="px-3 py-2.5 text-slate-700 dark:text-slate-200 whitespace-nowrap max-w-[260px] truncate" title={String(valOf(s, c))}>{String(valOf(s, c) || '—')}</td>)}
                  {META_COLS.map(c => <td key={c} className="px-3 py-2.5 text-slate-400 whitespace-nowrap max-w-[220px] truncate text-xs" title={String(s.meta?.[c] || '')}>{String(s.meta?.[c] || '—')}</td>)}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default FormulariosTab;
