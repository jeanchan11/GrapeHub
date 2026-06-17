import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import {
  Plus, X, Star, TrendingUp, TrendingDown, Minus,
  Megaphone, LayoutGrid, Users, MessageCircle, ChevronDown,
  Trash2, Award, BarChart3, CalendarClock, Clock, Trash
} from 'lucide-react';
import { motion } from 'framer-motion';
import SplitHeadline from '../../components/SplitHeadline';
import { auth } from '../../firebase';

// Helper: fetch autenticado com token Firebase
async function authFetch(url: string, options: RequestInit = {}): Promise<Response> {
  const token = await auth.currentUser?.getIdToken();
  return fetch(url, {
    ...options,
    headers: {
      ...(options.headers as Record<string, string> || {}),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
}

// ── Types ─────────────────────────────────────────────────────────────────────
interface ProximaAvaliacao {
  id: number;
  collaborator_id: number;
  data: string;
  horario: string;
  observacao: string | null;
  criado_por_nome: string | null;
  criado_em: string;
}

interface Cycle {
  id: number;
  collaborator_id: number;
  avaliador_id: number;
  avaliador_nome: string;
  periodo_inicio: string;
  periodo_fim: string;
  nota_campanhas: number;
  nota_grapehub: number;
  nota_reunioes: number;
  nota_tmr: number;
  comentario: string | null;
  criado_em: string;
  media_geral: number;
}

interface Summary {
  media_campanhas: number;
  media_grapehub: number;
  media_reunioes: number;
  media_tmr: number;
  media_geral: number;
  tendencia_campanhas: 'subiu' | 'caiu' | 'estavel' | null;
  tendencia_grapehub: 'subiu' | 'caiu' | 'estavel' | null;
  tendencia_reunioes: 'subiu' | 'caiu' | 'estavel' | null;
  tendencia_tmr: 'subiu' | 'caiu' | 'estavel' | null;
  diff_campanhas: number;
  diff_grapehub: number;
  diff_reunioes: number;
  diff_tmr: number;
}

// ── Helpers ───────────────────────────────────────────────────────────────────
const CRITERIA = [
  {
    key: 'nota_campanhas' as const,
    summaryKey: 'media_campanhas' as const,
    tendKey: 'tendencia_campanhas' as const,
    diffKey: 'diff_campanhas' as const,
    label: 'Campanhas',
    desc: 'Otimizações no prazo',
    icon: <Megaphone size={16} />,
    bg: 'bg-violet-500/15',
    color: 'text-violet-400',
    bar: 'bg-violet-500',
  },
  {
    key: 'nota_grapehub' as const,
    summaryKey: 'media_grapehub' as const,
    tendKey: 'tendencia_grapehub' as const,
    diffKey: 'diff_grapehub' as const,
    label: 'GrapeHub',
    desc: 'Uso correto e registros atualizados',
    icon: <LayoutGrid size={16} />,
    bg: 'bg-emerald-500/15',
    color: 'text-emerald-400',
    bar: 'bg-emerald-500',
  },
  {
    key: 'nota_reunioes' as const,
    summaryKey: 'media_reunioes' as const,
    tendKey: 'tendencia_reunioes' as const,
    diffKey: 'diff_reunioes' as const,
    label: 'Reuniões Internas',
    desc: 'Comparecimento e participação',
    icon: <Users size={16} />,
    bg: 'bg-blue-500/15',
    color: 'text-blue-400',
    bar: 'bg-blue-500',
  },
  {
    key: 'nota_tmr' as const,
    summaryKey: 'media_tmr' as const,
    tendKey: 'tendencia_tmr' as const,
    diffKey: 'diff_tmr' as const,
    label: 'TMR / Grupos',
    desc: 'Envolvimento e resposta rápida',
    icon: <MessageCircle size={16} />,
    bg: 'bg-amber-500/15',
    color: 'text-amber-400',
    bar: 'bg-amber-500',
  },
];

function StarRow({ value, max = 5, size = 14 }: { value: number; max?: number; size?: number }) {
  return (
    <div className="flex gap-0.5">
      {Array.from({ length: max }).map((_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(value) ? 'fill-amber-400 text-amber-400' : 'text-white/15'}
        />
      ))}
    </div>
  );
}

function TrendBadge({ trend, diff }: { trend: 'subiu' | 'caiu' | 'estavel' | null; diff: number }) {
  if (!trend) return <span className="text-[10px] text-slate-500">—</span>;
  if (trend === 'subiu') return (
    <span className="text-[11px] font-bold text-emerald-500">
      ↑ {Math.abs(diff).toFixed(1)}
    </span>
  );
  if (trend === 'caiu') return (
    <span className="text-[11px] font-bold text-red-400">
      ↓ {Math.abs(diff).toFixed(1)}
    </span>
  );
  return (
    <span className="text-[11px] font-bold text-slate-400">
      → 0.0
    </span>
  );
}

function fmtDate(iso: string) {
  if (!iso) return '';
  // If it's a date string like '2026-06-01' without time, add T12:00:00 to avoid timezone offset issues.
  // If it already has 'T' (like from Postgres timestamp), parse it directly.
  const dateStr = iso.includes('T') ? iso : iso + 'T12:00:00';
  const d = new Date(dateStr);
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' });
}

// ── Star Picker ───────────────────────────────────────────────────────────────
function StarPicker({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex gap-1.5">
      {[1, 2, 3, 4, 5].map(n => (
        <button
          key={n}
          type="button"
          onMouseEnter={() => setHover(n)}
          onMouseLeave={() => setHover(0)}
          onClick={() => onChange(n)}
          className="transition-transform hover:scale-110"
        >
          <Star
            size={22}
            className={n <= (hover || value) ? 'fill-amber-400 text-amber-400' : 'text-white/20'}
          />
        </button>
      ))}
    </div>
  );
}

// ── AgendarProxima Modal ──────────────────────────────────────────────────────
interface AgendarProps {
  collaboratorId: string;
  userEmail: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}

function AgendarProximaModal({ collaboratorId, userEmail, onClose, onSaved }: AgendarProps) {
  const [data, setData] = useState('');
  const [horario, setHorario] = useState('09:00');
  const [observacao, setObservacao] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!data) { setError('Selecione a data da próxima avaliação.'); return; }
    setError('');
    setSaving(true);
    try {
      const res = await authFetch(`/api/colaboradores/${collaboratorId}/proxima-avaliacao`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'x-user-email': userEmail } : {}),
        },
        body: JSON.stringify({ data, horario, observacao }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao agendar');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-md bg-white dark:bg-dark-bg/95 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <CalendarClock size={18} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 dark:text-white text-base">Agendar Próxima Avaliação</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Defina a data do próximo ciclo</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Data</label>
              <input
                type="date"
                value={data}
                onChange={e => setData(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Horário</label>
              <input
                type="time"
                value={horario}
                onChange={e => setHorario(e.target.value)}
                className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Observação (opcional)</label>
            <textarea
              value={observacao}
              onChange={e => setObservacao(e.target.value)}
              rows={3}
              placeholder="Algum ponto a preparar antes da avaliação..."
              className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-sm text-rose-400">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/[0.07] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Confirmar agendamento
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Modal Nova Avaliação ───────────────────────────────────────────────────────
interface ModalProps {
  collaboratorId: string;
  userEmail: string | undefined;
  onClose: () => void;
  onSaved: () => void;
}

function NovaAvaliacaoModal({ collaboratorId, userEmail, onClose, onSaved }: ModalProps) {
  const [periodoInicio, setPeriodoInicio] = useState('');
  const [periodoFim, setPeriodoFim] = useState('');
  const [notas, setNotas] = useState({ nota_campanhas: 0, nota_grapehub: 0, nota_reunioes: 0, nota_tmr: 0 });
  const [comentario, setComentario] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  // Fechar com ESC
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleSave = async () => {
    if (!periodoInicio || !periodoFim) { setError('Informe o período de início e fim.'); return; }
    for (const c of CRITERIA) {
      if (!notas[c.key]) { setError(`Selecione as estrelas para "${c.label}".`); return; }
    }
    setError('');
    setSaving(true);
    try {
      const res = await authFetch(`/api/colaboradores/${collaboratorId}/desempenho`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(userEmail ? { 'x-user-email': userEmail } : {}),
        },
        body: JSON.stringify({ periodo_inicio: periodoInicio, periodo_fim: periodoFim, ...notas, comentario }),
      });
      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Erro ao salvar');
      }
      onSaved();
      onClose();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.72)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div className="relative w-full max-w-xl bg-white dark:bg-dark-bg/95 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-slate-100 dark:border-white/[0.07]">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center">
              <BarChart3 size={18} className="text-violet-400" />
            </div>
            <div>
              <h2 className="font-black text-slate-800 dark:text-white text-base">Registrar Avaliação Quinzenal</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest mt-0.5">Desempenho do colaborador</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-xl hover:bg-white/10 flex items-center justify-center text-slate-400 hover:text-white transition-colors">
            <X size={16} />
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto flex-1 px-6 py-5 space-y-5">
          {/* Período */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Período avaliado</label>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Início</label>
                <input
                  type="date"
                  value={periodoInicio}
                  onChange={e => setPeriodoInicio(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 mb-1 block">Fim</label>
                <input
                  type="date"
                  value={periodoFim}
                  onChange={e => setPeriodoFim(e.target.value)}
                  className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </div>
            </div>
          </div>

          {/* Critérios */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 block">Avaliação por critério</label>
            <div className="space-y-3">
              {CRITERIA.map(c => (
                <div key={c.key} className="bg-slate-50 dark:bg-white/[0.03] border border-slate-100 dark:border-white/[0.06] rounded-2xl px-4 py-3.5 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${c.bg} ${c.color}`}>
                      {c.icon}
                    </div>
                    <div className="min-w-0">
                      <p className="font-bold text-slate-800 dark:text-white text-sm">{c.label}</p>
                      <p className="text-[11px] text-slate-500 truncate">{c.desc}</p>
                    </div>
                  </div>
                  <StarPicker value={notas[c.key]} onChange={v => setNotas(prev => ({ ...prev, [c.key]: v }))} />
                </div>
              ))}
            </div>
          </div>

          {/* Comentário */}
          <div>
            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Comentário geral (opcional)</label>
            <textarea
              value={comentario}
              onChange={e => setComentario(e.target.value)}
              rows={3}
              placeholder="Observações sobre o ciclo, pontos de melhoria, destaques..."
              className="w-full bg-slate-50 dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors resize-none"
            />
          </div>

          {error && (
            <div className="bg-rose-500/10 border border-rose-500/20 rounded-xl px-4 py-2.5 text-sm text-rose-400">{error}</div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 dark:border-white/[0.07] flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl text-sm font-semibold text-slate-500 dark:text-slate-400 hover:text-slate-800 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
          >
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-5 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
          >
            {saving && <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
            Salvar avaliação
          </button>
        </div>
      </div>
    </div>
  );
}

// ── Main Component ─────────────────────────────────────────────────────────────
export default function DesempenhoTab({ collaboratorId, isAdmin }: { collaboratorId: string; isAdmin: boolean }) {
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [summary, setSummary] = useState<Summary | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showAgendarModal, setShowAgendarModal] = useState(false);
  const [expandedCycle, setExpandedCycle] = useState<number | null>(null);
  const [proximaAvaliacao, setProximaAvaliacao] = useState<ProximaAvaliacao | null>(null);

  const { userData } = useAuth();

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cRes, sRes, aRes] = await Promise.all([
        authFetch(`/api/colaboradores/${collaboratorId}/desempenho`),
        authFetch(`/api/colaboradores/${collaboratorId}/desempenho/resumo`),
        authFetch(`/api/colaboradores/${collaboratorId}/proxima-avaliacao`),
      ]);
      if (cRes.ok) {
        const data = await cRes.json();
        // PostgreSQL ROUND() returns strings — parse to float
        setCycles(data.map((c: any) => ({ ...c, media_geral: parseFloat(c.media_geral) })));
      }
      if (sRes.ok) {
        const s = await sRes.json();
        if (s) {
          setSummary({
            ...s,
            media_campanhas: parseFloat(s.media_campanhas),
            media_grapehub: parseFloat(s.media_grapehub),
            media_reunioes: parseFloat(s.media_reunioes),
            media_tmr: parseFloat(s.media_tmr),
            media_geral: parseFloat(s.media_geral),
            diff_campanhas: parseFloat(s.diff_campanhas),
            diff_grapehub: parseFloat(s.diff_grapehub),
            diff_reunioes: parseFloat(s.diff_reunioes),
            diff_tmr: parseFloat(s.diff_tmr),
          });
        } else {
          setSummary(null);
        }
      }
      if (aRes.ok) {
        const a = await aRes.json();
        setProximaAvaliacao(a);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [collaboratorId]);

  const handleRemoverAgendamento = async () => {
    if (!confirm('Remover agendamento da próxima avaliação?')) return;
    await authFetch(`/api/colaboradores/${collaboratorId}/proxima-avaliacao`, { method: 'DELETE' });
    setProximaAvaliacao(null);
  };

  useEffect(() => { load(); }, [load]);

  const handleDelete = async (cycleId: number) => {
    if (!confirm('Excluir esta avaliação?')) return;
    await authFetch(`/api/desempenho/${cycleId}`, { method: 'DELETE' });
    load();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
      </div>
    );
  }

  const lastCycle = cycles[0] ?? null;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <SplitHeadline text="Desempenho " highlight="Quinzenal" className="text-xl font-black text-slate-800 dark:text-white" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Avaliação por critérios — ciclos de 15 dias
          </p>
        </div>
        {isAdmin && (
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowAgendarModal(true)}
              className="flex items-center gap-2 bg-white dark:bg-white/5 hover:bg-violet-50 dark:hover:bg-violet-500/10 border border-slate-200 dark:border-white/10 hover:border-violet-300 dark:hover:border-violet-500/30 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 px-4 py-2 rounded-xl text-sm font-bold transition-all"
            >
              <CalendarClock size={15} /> Agendar próxima
            </button>
            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors"
            >
              <Plus size={15} /> Nova avaliação
            </button>
          </div>
        )}
      </div>

      {/* ── Card Próxima Avaliação ── */}
      {proximaAvaliacao && (() => {
        const dataStr = proximaAvaliacao.data.includes('T')
          ? proximaAvaliacao.data
          : proximaAvaliacao.data + 'T12:00:00';
        const dataObj = new Date(dataStr);
        const hoje = new Date();
        hoje.setHours(0, 0, 0, 0);
        const diasRestantes = Math.ceil((dataObj.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24));
        const isPast = diasRestantes < 0;
        const isToday = diasRestantes === 0;
        const badgeColor = isPast
          ? 'bg-rose-500/15 text-rose-400 border-rose-500/20'
          : isToday
            ? 'bg-amber-500/15 text-amber-400 border-amber-500/20'
            : 'bg-emerald-500/15 text-emerald-400 border-emerald-500/20';
        const badgeLabel = isPast
          ? `${Math.abs(diasRestantes)}d atrás`
          : isToday
            ? 'Hoje!'
            : `em ${diasRestantes}d`;
        const horarioFmt = proximaAvaliacao.horario ? proximaAvaliacao.horario.slice(0, 5) : '';
        return (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden bg-gradient-to-r from-violet-600/10 via-violet-500/5 to-transparent border border-violet-500/20 rounded-2xl p-5 flex items-center gap-4"
          >
            {/* Glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-violet-500/5 to-transparent pointer-events-none" />
            {/* Icon */}
            <div className="w-12 h-12 rounded-2xl bg-violet-500/20 flex items-center justify-center shrink-0">
              <CalendarClock size={22} className="text-violet-400" />
            </div>
            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">Próxima Avaliação Agendada</p>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${badgeColor}`}>{badgeLabel}</span>
              </div>
              <p className="text-base font-black text-slate-800 dark:text-white">
                {dataObj.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', year: 'numeric' })}
              </p>
              <div className="flex items-center gap-4 mt-1">
                {horarioFmt && (
                  <span className="flex items-center gap-1.5 text-xs text-slate-500">
                    <Clock size={11} /> {horarioFmt}
                  </span>
                )}
                {proximaAvaliacao.observacao && (
                  <span className="text-xs text-slate-500 truncate max-w-xs">{proximaAvaliacao.observacao}</span>
                )}
                {proximaAvaliacao.criado_por_nome && (
                  <span className="text-xs text-slate-400">Agendado por {proximaAvaliacao.criado_por_nome}</span>
                )}
              </div>
            </div>
            {/* Actions */}
            {isAdmin && (
              <div className="flex items-center gap-2 shrink-0">
                <button
                  onClick={() => setShowAgendarModal(true)}
                  className="text-xs text-violet-400 hover:text-violet-300 font-bold px-3 py-1.5 rounded-lg hover:bg-violet-500/10 transition-colors"
                >
                  Editar
                </button>
                <button
                  onClick={handleRemoverAgendamento}
                  className="text-xs text-slate-500 hover:text-rose-400 transition-colors px-2 py-1.5 rounded-lg hover:bg-rose-500/10"
                >
                  <Trash size={13} />
                </button>
              </div>
            )}
          </motion.div>
        );
      })()}

      {cycles.length === 0 ? (
        /* Empty state */
        <div className="flex flex-col items-center justify-center h-56 text-slate-500 border border-dashed border-white/10 rounded-2xl">
          <BarChart3 size={40} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">Nenhuma avaliação registrada ainda.</p>
          {isAdmin && (
            <button onClick={() => setShowModal(true)} className="mt-4 text-violet-400 text-sm font-bold hover:text-violet-300 transition-colors">
              + Registrar primeiro ciclo
            </button>
          )}
        </div>
      ) : (
        <>
          {/* ── 4 Metric Cards ── */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {CRITERIA.map(c => {
              const avg = summary ? summary[c.summaryKey] : null;
              const trend = summary ? summary[c.tendKey] : null;
              const diff = summary ? summary[c.diffKey] : 0;
              return (
                <div key={c.key} className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200 hover:border-violet-500/30 dark:hover:border-violet-500/30 hover:shadow-sm">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{c.label}</span>
                    <div className={`w-9 h-9 rounded-xl flex items-center justify-center ${c.bg} ${c.color}`}>
                      {c.icon}
                    </div>
                  </div>
                  <div className="text-2xl font-black text-slate-800 dark:text-white leading-tight mt-1">
                    {avg !== null ? avg.toFixed(1) : '—'}
                  </div>
                  <div className="text-xs text-slate-400 dark:text-slate-500 leading-snug">
                    {c.desc}
                  </div>
                  <div className="flex items-center gap-2 mt-auto pt-2">
                    <StarRow value={avg ?? 0} size={12} />
                    <span className="text-slate-300 dark:text-white/20 text-[10px]">|</span>
                    <div className="text-[10px] text-slate-500">vs. anterior: <TrendBadge trend={trend} diff={diff} /></div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* ── Média Geral + Barras ── */}
          {summary && (
            <div className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-6 flex flex-col md:flex-row gap-8 items-center">
              
              {/* Big Score Block */}
              <div className="flex flex-col items-center justify-center md:min-w-[240px] shrink-0 md:border-r border-slate-200 dark:border-white/10 md:pr-8">
                <div className="flex items-center gap-2 mb-3">
                  <div className="bg-violet-500/20 p-1.5 rounded-lg">
                    <Award size={16} className="text-violet-500" />
                  </div>
                  <span className="text-xs font-bold text-slate-500 uppercase tracking-widest">Média Geral</span>
                </div>
                
                <div className="text-5xl font-black text-slate-800 dark:text-white leading-none mb-3">
                  {lastCycle ? lastCycle.media_geral.toFixed(1) : '—'}
                </div>
                
                <div className="mb-4">
                  <StarRow value={lastCycle?.media_geral ?? 0} size={16} />
                </div>
                
                <div className="text-[10px] font-medium text-slate-500 bg-slate-50 dark:bg-white/[0.03] border border-slate-200 dark:border-white/5 px-3 py-1.5 rounded-full">
                  Referente ao último ciclo avaliado
                </div>
              </div>

              {/* Progress Bars Block */}
              <div className="flex-1 w-full flex flex-col justify-center">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-4">
                  Média histórica por critério
                </p>
                <div className="space-y-4">
                  {CRITERIA.map(c => {
                    const avg = summary[c.summaryKey];
                    const pct = (avg / 5) * 100;
                    return (
                      <div key={c.key} className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 w-40 shrink-0">
                          <div className={`p-1.5 rounded text-slate-400 ${c.bg} ${c.color}`}>
                            {React.cloneElement(c.icon as React.ReactElement, { size: 14 })}
                          </div>
                          <span className="text-xs font-bold text-slate-700 dark:text-slate-300 truncate">{c.label}</span>
                        </div>
                        <div className="flex-1 bg-slate-100 dark:bg-white/5 h-2 rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full rounded-full ${c.bar}`}
                          />
                        </div>
                        <div className="flex items-center justify-end w-10 shrink-0">
                          <span className="text-sm font-black text-slate-800 dark:text-white">{avg.toFixed(1)}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* ── Histórico ── */}
          <div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Histórico de ciclos</p>
            <div className="space-y-2">
              {cycles.map((cycle, idx) => {
                const isOpen = expandedCycle === cycle.id;
                return (
                  <div
                    key={cycle.id}
                    className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden transition-colors duration-200"
                  >
                    {/* Row header */}
                    <button
                      className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors"
                      onClick={() => setExpandedCycle(isOpen ? null : cycle.id)}
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-8 h-8 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-400 text-xs font-black shrink-0">
                          {cycles.length - idx}
                        </div>
                        <div className="text-left">
                          <p className="font-bold text-slate-800 dark:text-white text-sm">
                            {fmtDate(cycle.periodo_inicio)} → {fmtDate(cycle.periodo_fim)}
                          </p>
                          <p className="text-[11px] text-slate-500 mt-0.5">Por {cycle.avaliador_nome}</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-5 shrink-0">
                        {/* Notas compactas */}
                        <div className="hidden lg:flex items-center gap-2">
                          {CRITERIA.map(c => (
                            <div key={c.key} className={`flex items-center gap-1.5 px-2 py-1 rounded-md ${c.bg}`}>
                              <span className={`text-[9px] font-bold uppercase tracking-widest ${c.color}`}>{c.label.split(' ')[0]}</span>
                              <div className="flex items-center gap-0.5">
                                <span className="text-[10px] font-bold text-slate-700 dark:text-slate-200">{cycle[c.key].toFixed(1)}</span>
                                <Star size={9} className="fill-amber-400 text-amber-400" />
                              </div>
                            </div>
                          ))}
                        </div>
                        {/* Média */}
                        <div className="flex items-center gap-4 pl-4 border-l border-slate-200 dark:border-white/10">
                          <div className="text-right">
                            <div className="text-[9px] font-bold text-slate-400 uppercase tracking-widest mb-0.5">Média Geral</div>
                            <div className="flex items-center gap-1 justify-end">
                              <span className="text-lg font-black text-slate-800 dark:text-white leading-none">{cycle.media_geral.toFixed(1)}</span>
                              <Star size={12} className="fill-violet-400 text-violet-400" />
                            </div>
                          </div>
                          <ChevronDown
                            size={16}
                            className={`text-slate-500 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                          />
                        </div>
                      </div>
                    </button>

                    {/* Expanded */}
                    {isOpen && (
                      <div className="border-t border-slate-200 dark:border-white/[0.06] px-5 py-4 space-y-4">
                        {/* Notas detalhadas */}
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                          {CRITERIA.map(c => (
                            <div key={c.key} className={`${c.bg} rounded-xl p-3`}>
                              <div className={`flex items-center gap-1.5 mb-2 ${c.color}`}>
                                {c.icon}
                                <span className="text-[10px] font-bold uppercase tracking-wider">{c.label}</span>
                              </div>
                              <div className="text-xl font-black text-slate-800 dark:text-white mb-1">{cycle[c.key]}.0</div>
                              <StarRow value={cycle[c.key]} size={11} />
                            </div>
                          ))}
                        </div>

                        {/* Comentário */}
                        {cycle.comentario && (
                          <div className="bg-white dark:bg-white/[0.03] border border-slate-200 dark:border-white/[0.06] rounded-xl px-4 py-3">
                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5">Comentário</p>
                            <p className="text-sm text-slate-700 dark:text-slate-300 whitespace-pre-wrap">{cycle.comentario}</p>
                          </div>
                        )}

                        {/* Delete */}
                        {isAdmin && (
                          <div className="flex justify-end">
                            <button
                              onClick={() => handleDelete(cycle.id)}
                              className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-rose-400 transition-colors px-3 py-1.5 rounded-lg hover:bg-rose-500/10"
                            >
                              <Trash2 size={12} /> Excluir avaliação
                            </button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      {/* Modal Nova Avaliação */}
      {showModal && (
        <NovaAvaliacaoModal
          collaboratorId={collaboratorId}
          userEmail={userData?.email}
          onClose={() => setShowModal(false)}
          onSaved={load}
        />
      )}

      {/* Modal Agendar Próxima */}
      {showAgendarModal && (
        <AgendarProximaModal
          collaboratorId={collaboratorId}
          userEmail={userData?.email}
          onClose={() => setShowAgendarModal(false)}
          onSaved={load}
        />
      )}
    </div>
  );
}
