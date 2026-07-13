import React, { useState, useEffect, useCallback } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Target, Settings, Check, Plus, X, Medal, Crown, Gift, Lock, Edit2, Eye } from 'lucide-react';
import { toast } from '@/src/lib/toast';
import ThemedDropdown from '@/src/components/ui/ThemedDropdown';

// ── Types ──────────────────────────────────────────────────────────────────────
interface Jogo {
  id: number; bolao_id: number; fase: string; time_casa: string; time_fora: string;
  inicia_em: string; gols_casa: number | null; gols_fora: number | null;
  status: 'agendado' | 'encerrado'; travado: boolean;
  palpite_id: number | null; palpite_casa: number | null; palpite_fora: number | null;
  pontos: number | null; placar_exato: boolean | null; resultado_certo: boolean | null;
}
interface RankingEntry {
  bolao_id: number; user_id: string; user_name: string | null; user_picture: string | null;
  total_pontos: number; qtd_exatos: number; qtd_resultados: number; qtd_palpites: number;
  bolao_avatar_url?: string | null;
}
interface Bolao { id: number; nome: string; status: string; }

// ── Bracket constants (Oitavas → Quartas → Semifinal → Final) ─────────────────
// Connector columns use flex:1 (fill available space) — widths here are min-width only.
// Vertical math (heights) is fixed and connector-width-independent:
//   OT_PAIR_H    = 2*CARD_H + OT_INNER_GAP
//   QF_BRACKET_H = 2*OT_PAIR_H + QF_OUTER_GAP
//   BRACKET_H    = 2*QF_BRACKET_H + SF_OUTER_GAP
//   Final center = BRACKET_H/2  ✓
const CARD_W        = 260;
const CARD_H        = 90;
const MIN_CONN_W    = 30;                              // minimum connector column width
const OT_INNER_GAP  = 8;
const OT_PAIR_H     = 2 * CARD_H + OT_INNER_GAP;      // 188
const QF_OUTER_GAP  = 24;                              // gap between 2 OT pairs in same half
const QF_BRACKET_H  = 2 * OT_PAIR_H + QF_OUTER_GAP;  // 400
const SF_OUTER_GAP  = 48;                              // gap between upper and lower halves
const BRACKET_H     = 2 * QF_BRACKET_H + SF_OUTER_GAP; // 848

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' });
}

function useAuthFetch() {
  const { user } = useAuth();
  return useCallback(async (url: string, options: RequestInit = {}) => {
    const token = user ? await user.getIdToken() : null;
    return fetch(url, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
        ...(options.headers || {}),
      },
    });
  }, [user]);
}

// ── Avatar ─────────────────────────────────────────────────────────────────────
const Avatar = ({ name, url, size = 8 }: { name?: string | null; url?: string | null; size?: number }) => {
  const initials = (name || 'U').split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase();
  const dimension = size * 4;
  if (url) return <img src={url} alt={name || ''} style={{ width: `${dimension}px`, height: `${dimension}px` }} className="rounded-full object-cover ring-2 ring-violet-500/30 shrink-0" />;
  return <div style={{ width: `${dimension}px`, height: `${dimension}px` }} className="rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-[11px] ring-2 ring-violet-500/20 shrink-0">{initials}</div>;
};

// ── GameNode — bracket card (clickable) ────────────────────────────────────────
interface GameNodeProps {
  jogo: Jogo | null;
  onClickBet?: (jogo: Jogo) => void;
  saved?: boolean;
  isHighlighted?: boolean;
}

const GameNode: React.FC<GameNodeProps> = ({ jogo, onClickBet, saved, isHighlighted = false }) => {
  const isTravado = jogo?.travado ?? false;
  const isEncerrado = jogo?.status === 'encerrado';
  const acertouExato = jogo?.placar_exato;
  const acertouResult = jogo?.resultado_certo;
  const hasBet = jogo?.palpite_casa !== null && jogo?.palpite_fora !== null;

  if (!jogo) {
    return (
      <div className="rounded-xl border border-black/10 dark:border-white/5 bg-black/[0.04] dark:bg-white/[0.02] flex items-center justify-center"
        style={{ width: CARD_W, height: CARD_H }}>
        <span className="text-[9px] text-slate-700 font-bold tracking-wider">A Definir</span>
      </div>
    );
  }

  // Pode apostar OU editar enquanto não travou (1h antes) e não encerrou.
  const canBet = !isTravado && !isEncerrado;

  return (
    <div
      onClick={() => canBet && onClickBet?.(jogo)}
      className={`relative rounded-xl border transition-all overflow-hidden ${
        canBet ? 'cursor-pointer hover:border-violet-500/40 hover:shadow-lg hover:shadow-violet-500/10' : ''
      } ${
        isHighlighted
          ? 'border-yellow-400/50 shadow-lg shadow-yellow-500/10 bg-gradient-to-br from-yellow-500/[0.12] to-violet-600/[0.18]'
          : hasBet ? 'border-emerald-500/20 bg-emerald-500/[0.06]'
          : isEncerrado ? 'border-black/10 dark:border-white/8 bg-dark-card'
          : isTravado ? 'border-amber-500/20 bg-dark-card'
          : 'border-black/10 dark:border-white/10 bg-dark-card'
      }`}
      style={{ width: CARD_W, height: CARD_H }}
    >
      <div className="h-full px-3 py-2 flex flex-col justify-between">

        {/* Top: status chip + date */}
        <div className="flex items-center justify-between">
          <span className={`text-[7px] font-black uppercase tracking-widest ${
            isHighlighted ? 'text-yellow-400' : isEncerrado ? 'text-emerald-400' : hasBet ? 'text-emerald-400' : isTravado ? 'text-amber-400/80' : 'text-violet-400'
          }`}>
            {isHighlighted ? '⚽ Final' : isEncerrado ? '✓ Encerrado' : hasBet ? '✓ Apostado' : isTravado ? '🔒 Bloqueado' : '✏️ Apostar'}
          </span>
          <span className="text-[7px] text-slate-600">{fmtDate(jogo.inicia_em)}</span>
        </div>

        {/* Middle: team — score — team */}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-black text-dark-text truncate flex-1 leading-none">{jogo.time_casa}</span>

          <div className="flex items-center gap-0.5 shrink-0">
            {hasBet || isTravado || isEncerrado ? (
              <>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${
                  hasBet ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-600 dark:text-emerald-300' : jogo.palpite_casa !== null ? 'bg-black/5 dark:bg-white/8 border-black/10 dark:border-white/15 text-dark-text' : 'bg-transparent border-black/10 dark:border-white/5 text-slate-700'
                }`}>{jogo.palpite_casa ?? '–'}</div>
                <span className="text-[8px] text-slate-600 font-bold">×</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${
                  hasBet ? 'bg-emerald-500/15 border-emerald-500/25 text-emerald-600 dark:text-emerald-300' : jogo.palpite_fora !== null ? 'bg-black/5 dark:bg-white/8 border-black/10 dark:border-white/15 text-dark-text' : 'bg-transparent border-black/10 dark:border-white/5 text-slate-700'
                }`}>{jogo.palpite_fora ?? '–'}</div>
              </>
            ) : (
              <>
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-600 dark:text-violet-400">?</div>
                <span className="text-[8px] text-slate-600 font-bold">×</span>
                <div className="w-7 h-7 rounded-lg bg-violet-500/10 border border-violet-500/20 flex items-center justify-center text-xs font-black text-violet-600 dark:text-violet-400">?</div>
              </>
            )}
          </div>

          <span className="text-[12px] font-black text-dark-text truncate flex-1 leading-none text-right">{jogo.time_fora}</span>
        </div>

        {/* Bottom */}
        <div className="flex items-center justify-between">
          {isEncerrado && jogo.gols_casa !== null
            ? <span className="text-[8px] text-slate-500">Real: {jogo.gols_casa}×{jogo.gols_fora}</span>
            : canBet
            ? <span className="text-[8px] text-violet-600 dark:text-violet-400/60 font-bold">{hasBet ? 'Clique para editar' : 'Clique para apostar'}</span>
            : <span />
          }
          {isEncerrado && jogo.pontos !== null
            ? <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                acertouExato ? 'bg-emerald-500/20 text-emerald-400' : acertouResult ? 'bg-blue-500/15 text-blue-400' : 'bg-black/5 dark:bg-white/5 text-slate-500'
              }`}>{acertouExato ? '🎯' : acertouResult ? '✅' : '❌'} +{jogo.pontos}pts</span>
            : saved
            ? <span className="text-[8px] text-emerald-400 font-bold flex items-center gap-0.5"><Check size={8} /> Salvo</span>
            : hasBet && isTravado
            ? <span className="text-[7px] text-emerald-500/50 font-bold">🔒 Trancado</span>
            : hasBet
            ? <span className="text-[7px] text-emerald-400/60 font-bold">✏️ Editável</span>
            : null
          }
        </div>
      </div>
    </div>
  );
};

// ── BetModal — popup para escolher placar ──────────────────────────────────────
const BetModal = ({
  jogo, onClose, onConfirm,
}: {
  jogo: Jogo;
  onClose: () => void;
  onConfirm: (casa: number, fora: number) => Promise<void>;
}) => {
  const [casa, setCasa] = useState(jogo.palpite_casa ?? 0);
  const [fora, setFora] = useState(jogo.palpite_fora ?? 0);
  const [saving, setSaving] = useState(false);
  const jaApostou = jogo.palpite_casa !== null && jogo.palpite_fora !== null;

  const handleConfirm = async () => {
    setSaving(true);
    await onConfirm(casa, fora);
    setSaving(false);
  };

  const ScoreSelector = ({ value, onChange, team }: { value: number; onChange: (v: number) => void; team: string }) => (
    <div className="flex flex-col items-center gap-2">
      <span className="text-sm font-black text-dark-text text-center truncate w-28">{team}</span>
      <div className="flex items-center gap-2">
        <button
          onClick={() => onChange(Math.max(0, value - 1))}
          className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-dark-text font-black text-lg transition-all active:scale-90"
        >−</button>
        <div className="w-14 h-14 rounded-2xl bg-violet-600/20 border-2 border-violet-500/40 flex items-center justify-center">
          <span className="text-2xl font-black text-dark-text">{value}</span>
        </div>
        <button
          onClick={() => onChange(Math.min(99, value + 1))}
          className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 border border-black/10 dark:border-white/10 text-dark-text font-black text-lg transition-all active:scale-90"
        >+</button>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div
        className="relative bg-dark-card rounded-2xl border border-black/10 dark:border-white/10 shadow-2xl shadow-violet-500/10 p-6 w-[380px] max-w-[90vw]"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="text-center mb-6">
          <span className="text-[9px] font-bold uppercase tracking-widest text-violet-400">{jaApostou ? 'Editar Palpite' : 'Fazer Palpite'}</span>
          <p className="text-xs text-slate-500 mt-1">✏️ Dá pra editar até 1h antes do jogo.</p>
        </div>

        {/* Score selectors */}
        <div className="flex items-center justify-center gap-4 mb-6">
          <ScoreSelector value={casa} onChange={setCasa} team={jogo.time_casa} />
          <span className="text-xl font-black text-slate-600 mt-6">×</span>
          <ScoreSelector value={fora} onChange={setFora} team={jogo.time_fora} />
        </div>

        {/* Preview */}
        <div className="bg-black/5 dark:bg-white/5 rounded-xl p-3 mb-5 text-center border border-black/10 dark:border-white/5">
          <span className="text-xs text-slate-400">Seu palpite: </span>
          <span className="text-sm font-black text-dark-text">{jogo.time_casa} {casa} × {fora} {jogo.time_fora}</span>
        </div>

        {/* Buttons */}
        <div className="flex gap-3">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 text-xs font-bold transition-all border border-black/10 dark:border-white/5"
          >
            Cancelar
          </button>
          <button
            onClick={handleConfirm}
            disabled={saving}
            className="flex-1 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-xs font-black uppercase tracking-wider transition-all shadow-lg shadow-violet-500/20 active:scale-95 disabled:opacity-50"
          >
            {saving ? 'Salvando...' : (jaApostou ? '✏️ Salvar' : '⚽ Apostar')}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── DrawConnector — conectores absolutos pixel-perfect ──────────────────────────
const DrawConnector = ({ y1, y2 }: { y1: number; y2: number }) => {
  const cls = 'absolute bg-slate-300 dark:bg-white/10';
  return (
    <>
      <div className={cls} style={{ top: y1, left: 0, width: '50%', height: 2 }} />
      <div className={cls} style={{ top: y2, left: 0, width: '50%', height: 2 }} />
      <div className={cls} style={{ top: y1, left: '50%', width: 2, height: y2 - y1 + 2 }} />
      <div className={cls} style={{ top: (y1 + y2) / 2, left: '50%', right: 0, height: 2 }} />
    </>
  );
};

// ── BracketView — chaveamento: Oitavas → Quartas → Semifinal → Final ──────────
const BracketView = ({
  jogos, onSave,
}: {
  jogos: Jogo[];
  onSave: (jogoId: number, casa: number, fora: number) => Promise<void>;
}) => {
  const [saved, setSaved] = useState<Record<number, boolean>>({});
  const [betJogo, setBetJogo] = useState<Jogo | null>(null);

  const pad = <T,>(arr: T[], n: number): (T | null)[] => [...arr, ...Array(n).fill(null)].slice(0, n);
  // Ordena por `id` (ordem estável das chaves), NÃO por data — as datas reais dos jogos não
  // seguem a ordem do bracket, então ordenar por data trocava os cruzamentos das Quartas/Semi.
  const byId = (a: Jogo, b: Jogo) => Number(a.id) - Number(b.id);
  const oitavas  = pad(jogos.filter(j => j.fase === 'Oitavas').sort(byId),  8) as (Jogo | null)[];
  const quartas  = pad(jogos.filter(j => j.fase === 'Quartas').sort(byId),  4) as (Jogo | null)[];
  const semi     = pad(jogos.filter(j => j.fase === 'Semifinal').sort(byId), 2) as (Jogo | null)[];
  const finalJogo    = jogos.find(j => j.fase === 'Final') ?? null;
  const terceiroJogo = jogos.find(j => j.fase === 'Terceiro Lugar') ?? null;

  const handleConfirmBet = async (casa: number, fora: number) => {
    if (!betJogo) return;
    await onSave(betJogo.id, casa, fora);
    setSaved(prev => ({ ...prev, [betJogo.id]: true }));
    setBetJogo(null);
    setTimeout(() => setSaved(prev => ({ ...prev, [betJogo.id]: false })), 2500);
  };

  const nodeProps = (jogo: Jogo | null, highlight = false): GameNodeProps => ({
    jogo,
    onClickBet: (j) => setBetJogo(j),
    saved: jogo ? (saved[jogo.id] ?? false) : false,
    isHighlighted: highlight,
  });

  const TOTAL_W = 4 * CARD_W + 3 * MIN_CONN_W;
  // CSS helpers
  const COL_CARD:  React.CSSProperties = { width: CARD_W, flexShrink: 0 };
  const COL_CONN:  React.CSSProperties = { flex: 1, minWidth: MIN_CONN_W, position: 'relative' };
  const COL_CONN_FLEX: React.CSSProperties = { flex: 1, minWidth: MIN_CONN_W };

  // Pair container helper
  const OtPair = ({ a, b }: { a: Jogo | null; b: Jogo | null }) => (
    <div className="flex flex-col" style={{ height: OT_PAIR_H, gap: OT_INNER_GAP }}>
      <GameNode {...nodeProps(a)} />
      <GameNode {...nodeProps(b)} />
    </div>
  );

  return (
    <div style={{ width: '100%' }}>
      {betJogo && <BetModal jogo={betJogo} onClose={() => setBetJogo(null)} onConfirm={handleConfirmBet} />}

      {/* ── Column labels (flex layout mirrors the bracket row) ── */}
      <div className="flex items-center mb-3" style={{ minWidth: TOTAL_W }}>
        {[
          { s: COL_CARD, label: 'Oitavas de Final',  cls: 'text-slate-500' },
          { s: COL_CONN_FLEX, label: '' },
          { s: COL_CARD, label: 'Quartas de Final',  cls: 'text-slate-500' },
          { s: COL_CONN_FLEX, label: '' },
          { s: COL_CARD, label: 'Semifinal',          cls: 'text-slate-500' },
          { s: COL_CONN_FLEX, label: '' },
          { s: COL_CARD, label: '⚽  Final',          cls: 'text-yellow-500/70' },
        ].map((col, i) => (
          <div key={i} className={`text-center text-[9px] font-black uppercase tracking-widest ${'cls' in col ? col.cls : ''}`}
            style={col.s}>
            {col.label}
          </div>
        ))}
      </div>

      {/* ── Bracket row ── */}
      <div className="flex items-stretch" style={{ height: BRACKET_H, minWidth: TOTAL_W }}>

        {/* ═══ OITAVAS column ═══ */}
        <div style={{ ...COL_CARD, display: 'flex', flexDirection: 'column', gap: SF_OUTER_GAP }}>
          {/* Upper half */}
          <div className="flex flex-col" style={{ height: QF_BRACKET_H, gap: QF_OUTER_GAP }}>
            <OtPair a={oitavas[0]} b={oitavas[1]} />
            <OtPair a={oitavas[2]} b={oitavas[3]} />
          </div>
          {/* Lower half */}
          <div className="flex flex-col" style={{ height: QF_BRACKET_H, gap: QF_OUTER_GAP }}>
            <OtPair a={oitavas[4]} b={oitavas[5]} />
            <OtPair a={oitavas[6]} b={oitavas[7]} />
          </div>
        </div>

        {/* ═══ OT→QF connectors ═══ */}
        <div style={{ ...COL_CONN }}>
          <DrawConnector y1={45} y2={143} />
          <DrawConnector y1={257} y2={355} />
          <DrawConnector y1={493} y2={591} />
          <DrawConnector y1={705} y2={803} />
        </div>

        {/* ═══ QUARTAS column ═══ */}
        <div style={{ ...COL_CARD, display: 'flex', flexDirection: 'column', gap: SF_OUTER_GAP }}>
          {/* Upper half → SF1 */}
          <div className="flex flex-col" style={{ height: QF_BRACKET_H }}>
            <div className="flex items-center" style={{ height: OT_PAIR_H }}><GameNode {...nodeProps(quartas[0])} /></div>
            <div style={{ height: QF_OUTER_GAP }} />
            <div className="flex items-center" style={{ height: OT_PAIR_H }}><GameNode {...nodeProps(quartas[1])} /></div>
          </div>
          {/* Lower half → SF2 */}
          <div className="flex flex-col" style={{ height: QF_BRACKET_H }}>
            <div className="flex items-center" style={{ height: OT_PAIR_H }}><GameNode {...nodeProps(quartas[2])} /></div>
            <div style={{ height: QF_OUTER_GAP }} />
            <div className="flex items-center" style={{ height: OT_PAIR_H }}><GameNode {...nodeProps(quartas[3])} /></div>
          </div>
        </div>

        {/* ═══ QF→SF connectors ═══ */}
        <div style={{ ...COL_CONN }}>
          <DrawConnector y1={94} y2={306} />
          <DrawConnector y1={542} y2={754} />
        </div>

        {/* ═══ SEMIFINAL column ═══ */}
        <div style={{ ...COL_CARD, display: 'flex', flexDirection: 'column' }}>
          <div style={{ height: QF_BRACKET_H, display: 'flex', alignItems: 'center' }}><GameNode {...nodeProps(semi[0])} /></div>
          <div style={{ height: SF_OUTER_GAP }} />
          <div style={{ height: QF_BRACKET_H, display: 'flex', alignItems: 'center' }}><GameNode {...nodeProps(semi[1])} /></div>
        </div>

        {/* ═══ SF→Final connector ═══ */}
        <div style={{ ...COL_CONN }}>
          <DrawConnector y1={200} y2={648} />
        </div>

        {/* ═══ FINAL ═══ */}
        <div style={{ ...COL_CARD, display: 'flex', alignItems: 'center' }}>
          <GameNode {...nodeProps(finalJogo, true)} />
        </div>

      </div>

      {/* ── Terceiro Lugar ── */}
      <div className="mt-8">
        <div className="flex items-center gap-4 mb-4">
          <div className="h-px flex-1 bg-black/5 dark:bg-white/5" />
          <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">3° e 4° Lugar</span>
          <div className="h-px flex-1 bg-black/5 dark:bg-white/5" />
        </div>
        <GameNode {...nodeProps(terceiroJogo)} />
      </div>

    </div>
  );
};

// ── Pódio ──────────────────────────────────────────────────────────────────────
const Podio = ({ ranking, myUid, onSelectCollab }: { ranking: RankingEntry[]; myUid: string; onSelectCollab: (entry: RankingEntry) => void }) => {
  const top3 = ranking.slice(0, 3);
  const order = [1, 0, 2]; // 2nd, 1st, 3rd

  const medals = [
    {
      icon: <Crown size={22} className="text-yellow-400 animate-bounce" />,
      h: 'h-44',
      step: '1',
      colorClass: 'text-yellow-400',
      numColor: 'text-yellow-400/10',
      topBorder: 'border-yellow-400/30',
      bgBlock: 'from-yellow-600/20 via-yellow-500/10 to-yellow-400/5'
    },
    {
      icon: <Medal size={20} className="text-slate-300" />,
      h: 'h-32',
      step: '2',
      colorClass: 'text-slate-300',
      numColor: 'text-slate-300/10',
      topBorder: 'border-slate-300/20',
      bgBlock: 'from-slate-600/20 via-slate-500/10 to-slate-400/5'
    },
    {
      icon: <Medal size={20} className="text-amber-600" />,
      h: 'h-20',
      step: '3',
      colorClass: 'text-amber-600',
      numColor: 'text-amber-600/10',
      topBorder: 'border-amber-700/20',
      bgBlock: 'from-amber-800/20 via-amber-700/10 to-amber-600/5'
    },
  ];

  return (
    <div className="relative flex items-end justify-center gap-6 mb-12 pt-8 pb-4 bg-dark-bg/40 rounded-3xl border border-black/10 dark:border-white/5 max-w-2xl mx-auto overflow-hidden px-12 shadow-inner">
      {/* Spotlights/Beams */}
      <div className="absolute inset-x-0 top-0 h-full pointer-events-none overflow-hidden flex justify-center gap-24 opacity-40">
        <div className="w-20 h-80 bg-gradient-to-b from-white/10 via-white/2 to-transparent blur-xl transform rotate-12 -translate-x-16" />
        <div className="w-32 h-80 bg-gradient-to-b from-white/20 via-white/5 to-transparent blur-2xl" />
        <div className="w-20 h-80 bg-gradient-to-b from-white/10 via-white/2 to-transparent blur-xl transform -rotate-12 translate-x-16" />
      </div>

      {order.map(pos => {
        const entry = top3[pos];
        const m = medals[pos];
        
        // Se não houver participante cadastrado nessa colocação ainda, mostramos pedestal vazio
        const isMe = entry ? entry.user_id === myUid : false;
        
        return (
          <div key={pos} className="flex flex-col items-center gap-0 relative z-10 w-40">
            {/* Participant Card */}
            {entry ? (
              <div 
                onClick={() => onSelectCollab(entry)}
                className={`flex flex-col items-center rounded-2xl bg-dark-card/90 border ${isMe ? 'border-violet-500/60 shadow-[0_0_15px_rgba(124,58,237,0.3)]' : 'border-black/10 dark:border-white/10'} w-full shadow-xl transition-all duration-300 hover:scale-105 mb-2 relative cursor-pointer`}
              >
                <div className="absolute -top-3.5 flex justify-center w-full left-0 z-20">
                  <div className="bg-dark-card/95 border border-black/10 dark:border-white/15 p-1 rounded-full shadow-lg">
                    {m.icon}
                  </div>
                </div>
                {entry.bolao_avatar_url || entry.user_picture ? (
                  <img
                    src={entry.bolao_avatar_url || entry.user_picture}
                    alt={entry.user_name || ''}
                    className="w-full h-64 object-cover object-center rounded-t-2xl border-b border-black/10 dark:border-white/5"
                  />
                ) : (
                  <div className="w-full h-64 bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold text-3xl rounded-t-2xl border-b border-black/10 dark:border-white/5">
                    {entry.user_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'}
                  </div>
                )}
                <div className="w-full px-2 py-2 flex flex-col items-center gap-0.5">
                  <span className="text-xs font-black text-dark-text text-center truncate w-full mt-0.5">
                    {entry.user_name || 'Usuário'}
                  </span>
                  <span className="text-[11px] text-violet-300 font-black">{entry.total_pontos} pts</span>
                  <span className="text-[9px] text-slate-500">{entry.qtd_exatos} exatos</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center h-[306px] w-full border border-dashed border-black/10 dark:border-white/5 rounded-2xl mb-2 bg-black/10 text-[9px] text-slate-600 uppercase tracking-wider font-bold">
                Vazio
              </div>
            )}

            {/* Pedestal Block */}
            <div className={`relative ${m.h} w-full rounded-t-xl bg-gradient-to-t ${m.bgBlock} border-t-2 border-x ${m.topBorder} ${isMe ? 'ring-2 ring-violet-500/40' : ''} flex flex-col items-center justify-between py-2 overflow-hidden shadow-2xl`}>
              <span className={`absolute -bottom-4 text-8xl font-black ${m.numColor} select-none`}>
                {m.step}
              </span>
              <span className={`text-[10px] font-black uppercase tracking-widest ${m.colorClass} z-10`}>
                {m.step}º Lugar
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── TabLeaderboard ─────────────────────────────────────────────────────────────
const TabLeaderboard = ({ ranking, myUid, loading, onSelectCollab }: { ranking: RankingEntry[]; myUid: string; loading: boolean; onSelectCollab: (entry: RankingEntry) => void }) => {
  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;
  if (ranking.length === 0) return (
    <div className="text-center py-20 text-slate-600">
      <Trophy size={40} className="mx-auto mb-3 opacity-20" />
      <p className="text-sm">Nenhum participante ainda.</p>
      <p className="text-xs mt-1 opacity-60">Faça seus palpites no Chaveamento para aparecer aqui!</p>
    </div>
  );
  return (
    <div>
      <Podio ranking={ranking} myUid={myUid} onSelectCollab={onSelectCollab} />
      <div className="bg-dark-card rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_80px_80px_80px] px-4 py-2 border-b border-black/10 dark:border-white/5">
          {['#','Participante','Pts','Exatos','Palp.'].map(h => <span key={h} className="text-[9px] text-slate-600 font-bold uppercase text-center first:text-left">{h}</span>)}
        </div>
        {ranking.map((entry, i) => {
          const isMe = entry.user_id === myUid;
          return (
            <div 
              key={entry.user_id} 
              onClick={() => onSelectCollab(entry)}
              className={`grid grid-cols-[40px_1fr_80px_80px_80px] px-4 py-3 border-b border-black/10 dark:border-white/5 last:border-0 cursor-pointer ${isMe ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.02]'}`}
            >
              <span className={`text-sm font-black ${i===0?'text-yellow-400':i===1?'text-slate-300':i===2?'text-amber-600':'text-slate-600'}`}>{i+1}</span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={entry.user_name} url={entry.bolao_avatar_url || entry.user_picture} size={7} />
                <span className={`text-sm font-semibold truncate ${isMe ? 'text-violet-300' : 'text-dark-text'}`}>
                  {entry.user_name || 'Usuário'}
                  {isMe && <span className="ml-1.5 text-[9px] text-violet-400 font-bold uppercase">você</span>}
                </span>
              </div>
              <span className="text-sm font-black text-center text-violet-400">{entry.total_pontos}</span>
              <span className="text-xs font-bold text-center text-emerald-400">{entry.qtd_exatos}</span>
              <span className="text-xs font-semibold text-center text-slate-500">{entry.qtd_palpites}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
};

// ── TabAdmin ───────────────────────────────────────────────────────────────────
const FASE_OPTIONS = ['Oitavas', 'Quartas', 'Semifinal', 'Final', 'Terceiro Lugar'];

const TabAdmin = ({
  bolaoId, jogos, onRefresh,
  authFetch: apiFetch,
}: {
  bolaoId: number; jogos: Jogo[]; onRefresh: () => void;
  authFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}) => {
  const [form, setForm] = useState({ fase: 'Quartas', time_casa: '', time_fora: '', inicia_em: '' });
  const [saving, setSaving] = useState(false);
  const [resultModal, setResultModal] = useState<{ jogo: Jogo; casa: string; fora: string } | null>(null);
  const [savingResult, setSavingResult] = useState(false);
  const [editModal, setEditModal] = useState<{ jogo: Jogo; fase: string; time_casa: string; time_fora: string; inicia_em: string } | null>(null);
  const [savingEdit, setSavingEdit] = useState(false);

  // ISO → valor do input datetime-local (YYYY-MM-DDTHH:mm) no fuso local
  const toLocalInput = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleEditJogo = async () => {
    if (!editModal) return;
    if (!editModal.time_casa.trim() || !editModal.time_fora.trim() || !editModal.inicia_em) return;
    setSavingEdit(true);
    try {
      const r = await apiFetch(`/api/bolao/jogos/${editModal.jogo.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          fase: editModal.fase,
          time_casa: editModal.time_casa.trim(),
          time_fora: editModal.time_fora.trim(),
          inicia_em: new Date(editModal.inicia_em).toISOString(),
        }),
      });
      if (!r.ok) { const err = await r.json().catch(() => ({} as any)); toast.error(err.error || 'Erro ao salvar o jogo.'); }
      else { setEditModal(null); onRefresh(); }
    } catch (e) { console.error(e); toast.error('Erro de rede ao salvar.'); }
    setSavingEdit(false);
  };

  const handleAddJogo = async () => {
    if (!form.time_casa.trim() || !form.time_fora.trim() || !form.inicia_em) return;
    setSaving(true);
    try {
      const r = await apiFetch(`/api/bolao/${bolaoId}/jogos`, {
        method: 'POST',
        body: JSON.stringify({ fase: form.fase, time_casa: form.time_casa.trim(), time_fora: form.time_fora.trim(), inicia_em: new Date(form.inicia_em).toISOString() }),
      });
      if (!r.ok) { const err = await r.json().catch(() => ({} as any)); toast.error(err.error || 'Erro ao cadastrar o jogo.'); }
      else {
        setForm({ fase: 'Quartas', time_casa: '', time_fora: '', inicia_em: '' });
        onRefresh();
      }
    } catch (e) { console.error(e); toast.error('Erro de rede ao cadastrar.'); }
    setSaving(false);
  };

  const handleLancarResultado = async () => {
    if (!resultModal) return;
    const casa = parseInt(resultModal.casa, 10);
    const fora = parseInt(resultModal.fora, 10);
    if (isNaN(casa) || isNaN(fora)) return;
    setSavingResult(true);
    try {
      const r = await apiFetch(`/api/bolao/jogos/${resultModal.jogo.id}/resultado`, {
        method: 'PUT', body: JSON.stringify({ gols_casa: casa, gols_fora: fora }),
      });
      if (!r.ok) { const err = await r.json(); toast.error(err.error || 'Erro'); }
      else { setResultModal(null); onRefresh(); }
    } catch (e) { console.error(e); }
    setSavingResult(false);
  };

  const faseOrder: Record<string, number> = { 'Quartas': 0, 'Semifinal': 1, 'Final': 2, 'Terceiro Lugar': 3 };
  const sorted = [...jogos].sort((a, b) => (faseOrder[a.fase] ?? 9) - (faseOrder[b.fase] ?? 9));

  return (
    <div className="space-y-8">
      {/* Add game */}
      <div className="bg-dark-card rounded-2xl border border-black/10 dark:border-white/10 p-6">
        <h3 className="text-sm font-black text-dark-text mb-4 flex items-center gap-2"><Plus size={14} className="text-violet-400" /> Cadastrar Jogo</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Fase</label>
            <ThemedDropdown value={form.fase} options={FASE_OPTIONS.map(f => ({ value: f, label: f }))} onChange={(v) => setForm(f => ({ ...f, fase: v }))} className="w-full" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Data/Hora</label>
            <input type="datetime-local" value={form.inicia_em} onChange={e => setForm(f => ({ ...f, inicia_em: e.target.value }))}
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Time Casa</label>
            <input value={form.time_casa} onChange={e => setForm(f => ({ ...f, time_casa: e.target.value }))} placeholder="Ex: Brasil"
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Time Fora</label>
            <input value={form.time_fora} onChange={e => setForm(f => ({ ...f, time_fora: e.target.value }))} placeholder="Ex: França"
              className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500" />
          </div>
        </div>
        <button onClick={handleAddJogo} disabled={saving || !form.time_casa || !form.time_fora || !form.inicia_em}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-bold text-white transition-all flex items-center justify-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-black/10 dark:border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
          Cadastrar
        </button>
      </div>

      {/* Results list */}
      <div className="bg-dark-card rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-black/10 dark:border-white/5">
          <h3 className="text-sm font-black text-dark-text flex items-center gap-2"><Target size={14} className="text-violet-400" /> Lançar Resultados</h3>
        </div>
        {sorted.map(j => (
          <div key={j.id} className="flex items-center justify-between px-6 py-3 border-b border-black/10 dark:border-white/5 last:border-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-violet-400 font-black uppercase bg-violet-500/10 px-1.5 py-0.5 rounded">{j.fase}</span>
                <p className="text-sm font-bold text-dark-text">{j.time_casa} × {j.time_fora}</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{new Date(j.inicia_em).toLocaleString('pt-BR')}</p>
            </div>
            <div className="flex items-center gap-2">
              {j.status !== 'encerrado' && (
                <button onClick={() => setEditModal({ jogo: j, fase: j.fase, time_casa: j.time_casa, time_fora: j.time_fora, inicia_em: toLocalInput(j.inicia_em) })}
                  className="text-xs font-bold text-slate-400 hover:text-dark-text bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                  <Edit2 size={12} /> Editar
                </button>
              )}
              {j.status === 'encerrado'
                ? <>
                    <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">{j.gols_casa} × {j.gols_fora} ✓</span>
                    <button onClick={() => setResultModal({ jogo: j, casa: String(j.gols_casa ?? ''), fora: String(j.gols_fora ?? '') })}
                      title="Corrigir resultado"
                      className="text-xs font-bold text-slate-400 hover:text-dark-text bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 px-3 py-1.5 rounded-lg transition-colors flex items-center gap-1">
                      <Edit2 size={12} /> Corrigir
                    </button>
                  </>
                : j.travado
                ? <button onClick={() => setResultModal({ jogo: j, casa: '', fora: '' })}
                    className="text-xs font-bold text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-lg transition-colors">
                    Lançar resultado
                  </button>
                : <span className="text-[10px] text-slate-600">Aguardando início</span>
              }
            </div>
          </div>
        ))}
        {sorted.length === 0 && <div className="py-8 text-center text-slate-600 text-xs">Nenhum jogo cadastrado.</div>}
      </div>

      {/* Result modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setResultModal(null)}>
          <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-dark-text">{resultModal.jogo.status === 'encerrado' ? 'Corrigir Resultado' : 'Resultado Final'}</h3>
              <button onClick={() => setResultModal(null)} className="text-slate-500 hover:text-dark-text"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-1 text-center font-bold">{resultModal.jogo.fase}</p>
            <p className="text-sm text-dark-text mb-4 text-center font-black">{resultModal.jogo.time_casa} × {resultModal.jogo.time_fora}</p>
            <div className="flex items-center gap-3 mb-5">
              <input type="number" min={0} value={resultModal.casa} onChange={e => setResultModal(r => r ? { ...r, casa: e.target.value } : r)} placeholder="0"
                className="flex-1 min-w-0 w-0 bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-3 text-xl font-black text-dark-text text-center focus:outline-none focus:border-violet-500" />
              <span className="text-slate-500 font-bold text-lg shrink-0">×</span>
              <input type="number" min={0} value={resultModal.fora} onChange={e => setResultModal(r => r ? { ...r, fora: e.target.value } : r)} placeholder="0"
                className="flex-1 min-w-0 w-0 bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-3 text-xl font-black text-dark-text text-center focus:outline-none focus:border-violet-500" />
            </div>
            <button onClick={handleLancarResultado} disabled={savingResult || !resultModal.casa || !resultModal.fora}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-bold text-white transition-all flex items-center justify-center gap-2">
              {savingResult ? <div className="w-4 h-4 border-2 border-black/10 dark:border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
              Confirmar Resultado
            </button>
          </div>
        </div>
      )}

      {/* Edit game modal — definir times/fase/data dos próximos jogos */}
      {editModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setEditModal(null)}>
          <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl p-6 w-96 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-dark-text flex items-center gap-2"><Edit2 size={14} className="text-violet-400" /> Editar Jogo</h3>
              <button onClick={() => setEditModal(null)} className="text-slate-500 hover:text-dark-text"><X size={16} /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 mb-4">
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Fase</label>
                <ThemedDropdown value={editModal.fase} options={FASE_OPTIONS.map(f => ({ value: f, label: f }))} onChange={(v) => setEditModal(m => m ? { ...m, fase: v } : m)} className="w-full" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Data/Hora</label>
                <input type="datetime-local" value={editModal.inicia_em} onChange={e => setEditModal(m => m ? { ...m, inicia_em: e.target.value } : m)}
                  className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Time Casa</label>
                <input value={editModal.time_casa} onChange={e => setEditModal(m => m ? { ...m, time_casa: e.target.value } : m)} placeholder="Ex: Brasil"
                  className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500" />
              </div>
              <div>
                <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Time Fora</label>
                <input value={editModal.time_fora} onChange={e => setEditModal(m => m ? { ...m, time_fora: e.target.value } : m)} placeholder="Ex: França"
                  className="w-full bg-dark-bg border border-black/10 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500" />
              </div>
            </div>
            <button onClick={handleEditJogo} disabled={savingEdit || !editModal.time_casa.trim() || !editModal.time_fora.trim() || !editModal.inicia_em}
              className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-bold text-white transition-all flex items-center justify-center gap-2">
              {savingEdit ? <div className="w-4 h-4 border-2 border-black/10 dark:border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
              Salvar
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

interface ColaboradorDetalhesModalProps {
  entry: RankingEntry;
  myUid: string;
  bolaoId: number;
  onClose: () => void;
  apiFetch: (url: string, opts?: RequestInit) => Promise<Response>;
}

function ColaboradorDetalhesModal({ entry, myUid, bolaoId, onClose, apiFetch }: ColaboradorDetalhesModalProps) {
  const [jogos, setJogos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/api/bolao/${bolaoId}/jogos?uid=${entry.user_id}`)
      .then(r => r.json())
      .then((data: any) => {
        setJogos(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch((e) => {
        console.error(e);
        setLoading(false);
      });
  }, [bolaoId, entry.user_id, apiFetch]);

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  const isMe = entry.user_id === myUid;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-[#0a0118]/80" onClick={onClose} />

      <div className="relative w-full max-w-3xl bg-dark-card border border-black/10 dark:border-white/10 rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row z-10 animate-in fade-in zoom-in-95 duration-200">
        <button onClick={onClose} className="absolute top-4 right-4 z-20 text-slate-400 hover:text-dark-text transition-colors bg-black/5 dark:bg-white/5 hover:bg-black/5 dark:hover:bg-white/10 p-1.5 rounded-full">
          <X size={18} />
        </button>

        <div className="w-full md:w-72 bg-gradient-to-b from-violet-950/20 to-black/40 flex flex-col items-center justify-center p-8 border-b md:border-b-0 md:border-r border-black/10 dark:border-white/5 relative shrink-0">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(124,58,237,0.1),transparent_70%)] pointer-events-none" />
          
          {entry.bolao_avatar_url || entry.user_picture ? (
            <div className="relative w-56 h-80 rounded-2xl overflow-hidden border border-black/10 dark:border-white/15 shadow-[0_0_30px_rgba(124,58,237,0.35)] mb-4 transition-all duration-300 hover:scale-[1.03] hover:shadow-[0_0_40px_rgba(124,58,237,0.5)] group">
              <img
                src={entry.bolao_avatar_url || entry.user_picture}
                alt={entry.user_name || ''}
                className="w-full h-full object-cover object-center transition-transform duration-500 group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
            </div>
          ) : (
            <div className="w-56 h-80 rounded-2xl bg-violet-500/10 flex items-center justify-center text-violet-400 font-bold text-7xl border border-black/10 dark:border-white/10 shadow-lg mb-4 transition-all duration-300 hover:scale-[1.03] hover:bg-violet-500/15">
              {entry.user_name?.split(' ').map(w => w[0]).slice(0, 2).join('').toUpperCase() || 'U'}
            </div>
          )}

          <h3 className="text-lg font-black text-dark-text text-center tracking-tight truncate max-w-full">
            {entry.user_name || 'Usuário'}
          </h3>
          {isMe && (
            <span className="text-[10px] bg-violet-500/10 text-violet-400 border border-violet-500/20 font-black uppercase tracking-widest px-2 py-0.5 rounded-full mt-1.5">
              Você
            </span>
          )}
        </div>

        <div className="flex-1 p-6 md:p-8 flex flex-col min-w-0">
          <div className="grid grid-cols-3 gap-3 mb-6">
            <div className="bg-black/[0.04] dark:bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-2xl p-3 flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pontos</span>
              <span className="text-xl font-black text-violet-400">{entry.total_pontos}</span>
            </div>
            <div className="bg-black/[0.04] dark:bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-2xl p-3 flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Exatos</span>
              <span className="text-xl font-black text-emerald-400">{entry.qtd_exatos}</span>
            </div>
            <div className="bg-black/[0.04] dark:bg-white/[0.02] border border-black/10 dark:border-white/5 rounded-2xl p-3 flex flex-col items-center">
              <span className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">Palpites</span>
              <span className="text-xl font-black text-slate-300">{entry.qtd_palpites}</span>
            </div>
          </div>

          <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-1.5 border-b border-black/10 dark:border-white/5 pb-2">
            <Trophy size={11} /> Palpites Detalhados
          </h4>

          {loading ? (
            <div className="flex-1 flex items-center justify-center py-12">
              <div className="w-6 h-6 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
            </div>
          ) : (
            <div className="flex-1 overflow-y-auto pr-1 max-h-72 space-y-2.5">
              {jogos.map((j: any) => {
                const hasPalpite = j.palpite_id !== null;
                const isLocked = j.travado;
                const showPalpite = isMe || isLocked;

                return (
                  <div key={j.id} className="bg-black/[0.04] dark:bg-white/[0.01] border border-black/10 dark:border-white/5 rounded-xl p-3 flex items-center justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-[9px] font-bold text-slate-500 uppercase tracking-widest mb-1">{j.fase}</p>
                      <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300 truncate">
                        <span>{j.time_casa}</span>
                        <span className="text-[10px] text-slate-600">vs</span>
                        <span>{j.time_fora}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 shrink-0">
                      <div className="flex flex-col items-center">
                        <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Palpite</span>
                        {hasPalpite ? (
                          showPalpite ? (
                            <span className="text-sm font-black text-violet-400">
                              {j.palpite_casa} - {j.palpite_fora}
                            </span>
                          ) : (
                            <span className="text-slate-500 flex items-center gap-1" title="Palpite oculto até o jogo iniciar">
                              <Lock size={12} className="text-slate-500" />
                            </span>
                          )
                        ) : (
                          <span className="text-xs text-slate-600 font-medium">-</span>
                        )}
                      </div>

                      {j.status === 'encerrado' && (
                        <>
                          <div className="h-6 w-px bg-black/5 dark:bg-white/5" />
                          <div className="flex flex-col items-center">
                            <span className="text-[8px] font-bold text-slate-500 uppercase tracking-wider mb-0.5">Resultado</span>
                            <span className="text-sm font-black text-slate-300">
                              {j.gols_casa} - {j.gols_fora}
                            </span>
                          </div>
                        </>
                      )}

                      {j.status === 'encerrado' && hasPalpite && (
                        <>
                          <div className="h-6 w-px bg-black/5 dark:bg-white/5" />
                          <div className={`px-2 py-1 rounded-lg text-xs font-black shrink-0 ${j.pontos === 10 ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : j.pontos > 0 ? 'bg-violet-500/10 text-violet-400 border border-violet-500/20' : 'bg-slate-500/5 text-slate-600 border border-slate-500/10'}`}>
                            +{j.pontos} pts
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ── Palpites de Todos — mostra os palpites de todo mundo por jogo (revelados após o início) ──
function PalpitesTodosView({ rows }: { rows: any[] }) {
  if (!rows || rows.length === 0) {
    return (
      <div className="text-center py-24 text-slate-500">
        <Eye size={40} className="mx-auto mb-4 opacity-30" />
        <p className="text-sm font-bold text-slate-400">Nenhum palpite revelado ainda</p>
        <p className="text-xs mt-1 opacity-60">Os palpites de todos aparecem aqui assim que cada jogo começa.</p>
      </div>
    );
  }
  // Agrupa por jogo preservando a ordem (rows já vem ordenado por data desc)
  const games: any[] = [];
  const idx: Record<number, number> = {};
  for (const r of rows) {
    if (idx[r.jogo_id] === undefined) {
      idx[r.jogo_id] = games.length;
      games.push({ ...r, bets: [] });
    }
    games[idx[r.jogo_id]].bets.push(r);
  }
  return (
    <div className="space-y-5">
      {games.map(g => {
        const encerrado = g.status === 'encerrado';
        return (
          <div key={g.jogo_id} className="bg-dark-card rounded-2xl border border-black/10 dark:border-white/10 overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3 border-b border-black/10 dark:border-white/5 bg-black/[0.04] dark:bg-white/[0.02]">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-[9px] text-violet-400 font-black uppercase bg-violet-500/10 px-1.5 py-0.5 rounded shrink-0">{g.fase}</span>
                <p className="text-sm font-black text-dark-text truncate">{g.time_casa} <span className="text-slate-500">×</span> {g.time_fora}</p>
              </div>
              <div className="flex items-center gap-3 shrink-0">
                {encerrado && <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded-lg">{g.gols_casa} × {g.gols_fora} ✓</span>}
                <span className="text-[10px] text-slate-500 hidden sm:block">{new Date(g.inicia_em).toLocaleString('pt-BR')}</span>
                <span className="text-[10px] text-slate-500">{g.bets.length} palpite{g.bets.length === 1 ? '' : 's'}</span>
              </div>
            </div>
            <div className="divide-y divide-white/5">
              {g.bets.map((b: any, i: number) => (
                <div key={i} className="flex items-center justify-between px-5 py-2.5 hover:bg-black/[0.04] dark:hover:bg-white/[0.02] transition-colors">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Avatar name={b.user_name} url={b.bolao_avatar_url || b.user_picture} size={6} />
                    <span className="text-sm text-slate-300 font-medium truncate">{b.user_name}</span>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <span className="text-sm font-black text-dark-text tabular-nums">{b.palpite_casa} <span className="text-slate-500 font-normal">×</span> {b.palpite_fora}</span>
                    {encerrado && b.pontos != null && (
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full w-16 text-center ${b.placar_exato ? 'bg-emerald-500/15 text-emerald-400' : b.resultado_certo ? 'bg-amber-500/15 text-amber-400' : 'bg-black/5 dark:bg-white/5 text-slate-500'}`}>
                        {b.pontos} pt{b.pontos === 1 ? '' : 's'}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Bolao() {
  const { user, userData } = useAuth();
  const apiFetch = useAuthFetch();
  const isAdmin = userData?.role === 'superadmin';

  const [bolaoId, setBolaoId] = useState<number | null>(null);
  const [selectedCollab, setSelectedCollab] = useState<RankingEntry | null>(null);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loadingJogos, setLoadingJogos] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [activeTab, setActiveTab] = useState<'palpites' | 'apostas' | 'leaderboard' | 'premiacoes' | 'admin'>('palpites');
  const [palpitesAll, setPalpitesAll] = useState<any[]>([]);
  const [loadingPalpites, setLoadingPalpites] = useState(false);

  useEffect(() => {
    apiFetch('/api/bolao').then(r => r.json())
      .then((data: Bolao[]) => {
        if (data.length > 0) setBolaoId(data[0].id);
        else setLoadingJogos(false);
      })
      .catch(() => setLoadingJogos(false));
  }, []);

  const loadJogos = useCallback(() => {
    if (!bolaoId) return;
    setLoadingJogos(true);
    apiFetch(`/api/bolao/${bolaoId}/jogos`).then(r => r.json())
      .then((data: Jogo[]) => { setJogos(data); setLoadingJogos(false); })
      .catch(() => setLoadingJogos(false));
  }, [bolaoId, apiFetch]);

  const loadRanking = useCallback(() => {
    if (!bolaoId) return;
    setLoadingRanking(true);
    apiFetch(`/api/bolao/${bolaoId}/ranking`).then(r => r.json())
      .then((data: any) => { setRanking(Array.isArray(data) ? data : []); setLoadingRanking(false); })
      .catch(() => setLoadingRanking(false));
  }, [bolaoId, apiFetch]);

  const loadPalpites = useCallback(() => {
    if (!bolaoId) return;
    setLoadingPalpites(true);
    apiFetch(`/api/bolao/${bolaoId}/palpites`).then(r => r.json())
      .then((data: any) => { setPalpitesAll(Array.isArray(data) ? data : []); setLoadingPalpites(false); })
      .catch(() => setLoadingPalpites(false));
  }, [bolaoId, apiFetch]);

  useEffect(() => { loadJogos(); loadRanking(); }, [bolaoId]);
  useEffect(() => { if (activeTab === 'apostas') loadPalpites(); }, [activeTab, loadPalpites]);



  const handleSavePalpite = async (jogoId: number, casa: number, fora: number) => {
    const r = await apiFetch(`/api/bolao/jogos/${jogoId}/palpite`, {
      method: 'POST',
      body: JSON.stringify({ palpite_casa: casa, palpite_fora: fora }),
    });
    if (!r.ok) {
      const err = await r.json();
      toast.error(err.error || 'Erro ao salvar palpite');
    } else {
      loadJogos();
    }
  };

  const tabs = [
    { id: 'palpites' as const, label: 'Chaveamento', icon: Target },
    { id: 'apostas' as const, label: 'Palpites de Todos', icon: Eye },
    { id: 'leaderboard' as const, label: 'Ranking', icon: Trophy },
    { id: 'premiacoes' as const, label: 'Premiações', icon: Gift },
    ...(isAdmin ? [{ id: 'admin' as const, label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <div className="p-6 md:p-8 bg-dark-bg text-dark-text min-h-screen">
      <div className="mb-8 relative overflow-hidden rounded-2xl border border-black/10 dark:border-white/10" style={{ maxHeight: 260 }}>
        <img 
          src="/bolao.png" 
          alt="Bolão da Copa" 
          className="w-full object-cover object-center"
          style={{ height: 260 }}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#0d0d1a]/80 via-transparent to-transparent" />
        <div className="absolute bottom-4 left-6">
          <span className="text-[10px] font-bold uppercase tracking-widest text-emerald-400/80">
            Mata-mata — faça seus palpites por fase!
          </span>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 bg-dark-card p-1 rounded-xl border border-black/10 dark:border-white/10 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5'
              }`}>
              <Icon size={13} />{tab.label}
            </button>
          );
        })}
      </div>

      {/* Content */}
      {activeTab === 'palpites' && (
        loadingJogos
          ? <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>
          : <BracketView jogos={jogos} onSave={handleSavePalpite} />
      )}
      {activeTab === 'apostas' && (
        loadingPalpites
          ? <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>
          : <PalpitesTodosView rows={palpitesAll} />
      )}
      {activeTab === 'leaderboard' && (
        <TabLeaderboard 
          ranking={ranking} 
          myUid={user?.uid || ''}
          loading={loadingRanking} 
          onSelectCollab={setSelectedCollab}
        />
      )}
      {activeTab === 'premiacoes' && (
        <div className="space-y-6">
          <div className="text-center mb-2">
            <h2 className="text-lg font-black text-dark-text">🏆 Premiações do <span className="text-violet-400">Bolão</span></h2>
            <p className="text-[11px] text-slate-500 uppercase tracking-widest mt-1">Confira o que está em jogo!</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* 1º Lugar */}
            <div className="bg-dark-card rounded-2xl border border-yellow-500/30 p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-yellow-500/10 to-transparent pointer-events-none" />
              <div className="relative">
                <span className="text-4xl mb-3 block">🥇</span>
                <Crown size={20} className="text-yellow-400 mx-auto mb-2" />
                <h3 className="text-sm font-black text-yellow-400 uppercase tracking-wider">1º Lugar</h3>
                <div className="mt-4 bg-yellow-500/10 rounded-xl px-4 py-3 border border-yellow-500/20">
                  <span className="text-2xl font-black text-yellow-300">R$ 300</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">+ Troféu de campeão</p>
              </div>
            </div>

            {/* 2º Lugar */}
            <div className="bg-dark-card rounded-2xl border border-slate-400/20 p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-slate-400/5 to-transparent pointer-events-none" />
              <div className="relative">
                <span className="text-4xl mb-3 block">🥈</span>
                <Medal size={20} className="text-slate-300 mx-auto mb-2" />
                <h3 className="text-sm font-black text-slate-300 uppercase tracking-wider">2º Lugar</h3>
                <div className="mt-4 bg-slate-500/10 rounded-xl px-4 py-3 border border-slate-500/20">
                  <span className="text-2xl font-black text-slate-200">R$ 150</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">Vice-campeão</p>
              </div>
            </div>

            {/* 3º Lugar */}
            <div className="bg-dark-card rounded-2xl border border-amber-700/20 p-6 text-center relative overflow-hidden">
              <div className="absolute inset-0 bg-gradient-to-b from-amber-700/5 to-transparent pointer-events-none" />
              <div className="relative">
                <span className="text-4xl mb-3 block">🥉</span>
                <Medal size={20} className="text-amber-600 mx-auto mb-2" />
                <h3 className="text-sm font-black text-amber-600 uppercase tracking-wider">3º Lugar</h3>
                <div className="mt-4 bg-amber-700/10 rounded-xl px-4 py-3 border border-amber-700/20">
                  <span className="text-2xl font-black text-amber-500">R$ 50</span>
                </div>
                <p className="text-[10px] text-slate-500 mt-3">Terceiro colocado</p>
              </div>
            </div>
          </div>

          <div className="bg-dark-card rounded-2xl border border-black/10 dark:border-white/10 p-5 mt-4">
            <h3 className="text-xs font-bold text-slate-400 uppercase mb-3">📋 Regras de Pontuação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="flex items-center gap-3 bg-emerald-500/5 rounded-xl px-4 py-3 border border-emerald-500/10">
                <span className="text-xl">🎯</span>
                <div>
                  <span className="text-sm font-bold text-emerald-400">Placar Exato</span>
                  <span className="text-xs text-slate-500 block">+3 pontos</span>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-violet-500/5 rounded-xl px-4 py-3 border border-violet-500/10">
                <span className="text-xl">✅</span>
                <div>
                  <span className="text-sm font-bold text-violet-400">Resultado Certo</span>
                  <span className="text-xs text-slate-500 block">+1 ponto (vitória/empate/derrota)</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
      {activeTab === 'admin' && isAdmin && bolaoId && (
        <TabAdmin bolaoId={bolaoId} jogos={jogos} onRefresh={() => { loadJogos(); loadRanking(); }} authFetch={apiFetch} />
      )}
      {selectedCollab && bolaoId && (
        <ColaboradorDetalhesModal
          entry={selectedCollab}
          myUid={user?.uid || ''}
          bolaoId={bolaoId}
          onClose={() => setSelectedCollab(null)}
          apiFetch={apiFetch}
        />
      )}
    </div>
  );
}
