import React, { useState, useEffect, useCallback } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { useAuth } from '../contexts/AuthContext';
import { Trophy, Target, Settings, Check, Plus, X, Medal, Crown } from 'lucide-react';

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
  if (url) return <img src={url} alt={name || ''} className={`w-${size} h-${size} rounded-full object-cover ring-2 ring-violet-500/30`} />;
  return <div className={`w-${size} h-${size} rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 font-bold text-xs ring-2 ring-violet-500/20`}>{initials}</div>;
};

// ── GameNode — bracket card ────────────────────────────────────────────────────
interface GameNodeProps {
  jogo: Jogo | null;
  value?: { casa: string; fora: string };
  onChange?: (v: { casa: string; fora: string }) => void;
  onBlurSave?: () => void;
  saved?: boolean;
  isHighlighted?: boolean;
}

const GameNode: React.FC<GameNodeProps> = ({ jogo, value, onChange, onBlurSave, saved, isHighlighted = false }) => {
  const isTravado = jogo?.travado ?? false;
  const isEncerrado = jogo?.status === 'encerrado';
  const acertouExato = jogo?.placar_exato;
  const acertouResult = jogo?.resultado_certo;

  if (!jogo) {
    return (
      <div className="rounded-xl border border-white/5 bg-white/[0.02] flex items-center justify-center"
        style={{ width: CARD_W, height: CARD_H }}>
        <span className="text-[9px] text-slate-700 font-bold tracking-wider">A Definir</span>
      </div>
    );
  }

  return (
    <div
      className={`relative rounded-xl border transition-all overflow-hidden ${
        isHighlighted
          ? 'border-yellow-400/50 shadow-lg shadow-yellow-500/10'
          : isEncerrado ? 'border-white/8' : isTravado ? 'border-amber-500/20' : 'border-white/10'
      }`}
      style={{
        width: CARD_W, height: CARD_H,
        background: isHighlighted
          ? 'linear-gradient(135deg, rgba(234,179,8,0.12) 0%, rgba(124,58,237,0.18) 100%)'
          : 'rgba(255,255,255,0.025)',
      }}
    >
      <div className="h-full px-3 py-2 flex flex-col justify-between">

        {/* Top: status chip + date */}
        <div className="flex items-center justify-between">
          <span className={`text-[7px] font-black uppercase tracking-widest ${
            isHighlighted ? 'text-yellow-400' : isEncerrado ? 'text-emerald-400' : isTravado ? 'text-amber-400/80' : 'text-violet-400'
          }`}>
            {isHighlighted ? '⚽ Final' : isEncerrado ? '✓ Encerrado' : isTravado ? '🔒 Bloqueado' : '✏️ Aberto'}
          </span>
          <span className="text-[7px] text-slate-600">{fmtDate(jogo.inicia_em)}</span>
        </div>

        {/* Middle: team — score — team */}
        <div className="flex items-center gap-1.5">
          <span className="text-[12px] font-black text-white truncate flex-1 leading-none">{jogo.time_casa}</span>

          <div className="flex items-center gap-0.5 shrink-0">
            {isTravado || isEncerrado ? (
              <>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${
                  jogo.palpite_casa !== null ? 'bg-white/8 border-white/15 text-white' : 'bg-transparent border-white/5 text-slate-700'
                }`}>{jogo.palpite_casa ?? '–'}</div>
                <span className="text-[8px] text-slate-600 font-bold">×</span>
                <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-black border ${
                  jogo.palpite_fora !== null ? 'bg-white/8 border-white/15 text-white' : 'bg-transparent border-white/5 text-slate-700'
                }`}>{jogo.palpite_fora ?? '–'}</div>
              </>
            ) : (
              <>
                <input type="number" min={0} max={99} value={value?.casa ?? ''} placeholder="0"
                  onChange={e => onChange?.({ casa: e.target.value, fora: value?.fora ?? '' })}
                  onBlur={onBlurSave}
                  className="w-7 h-7 rounded-lg bg-dark-bg border border-white/10 text-center text-xs font-black text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
                <span className="text-[8px] text-slate-600 font-bold">×</span>
                <input type="number" min={0} max={99} value={value?.fora ?? ''} placeholder="0"
                  onChange={e => onChange?.({ casa: value?.casa ?? '', fora: e.target.value })}
                  onBlur={onBlurSave}
                  className="w-7 h-7 rounded-lg bg-dark-bg border border-white/10 text-center text-xs font-black text-white focus:outline-none focus:border-violet-500 transition-colors"
                />
              </>
            )}
          </div>

          <span className="text-[12px] font-black text-white truncate flex-1 leading-none text-right">{jogo.time_fora}</span>
        </div>

        {/* Bottom: placar real + badge */}
        <div className="flex items-center justify-between">
          {isEncerrado && jogo.gols_casa !== null
            ? <span className="text-[8px] text-slate-500">Real: {jogo.gols_casa}×{jogo.gols_fora}</span>
            : <span />
          }
          {isEncerrado && jogo.pontos !== null
            ? <span className={`text-[8px] font-black px-1.5 py-0.5 rounded-md ${
                acertouExato ? 'bg-emerald-500/20 text-emerald-400' : acertouResult ? 'bg-blue-500/15 text-blue-400' : 'bg-white/5 text-slate-500'
              }`}>{acertouExato ? '🎯' : acertouResult ? '✅' : '❌'} +{jogo.pontos}pts</span>
            : saved
            ? <span className="text-[8px] text-emerald-400 font-bold flex items-center gap-0.5"><Check size={8} /> Salvo</span>
            : null
          }
        </div>
      </div>
    </div>
  );
};

// ── DrawConnector — conectores absolutos pixel-perfect ──────────────────────────
const DrawConnector = ({ y1, y2 }: { y1: number; y2: number }) => {
  const color = 'rgba(148,163,184,0.15)';
  return (
    <>
      <div className="absolute" style={{ top: y1, left: 0, width: '50%', height: 2, backgroundColor: color }} />
      <div className="absolute" style={{ top: y2, left: 0, width: '50%', height: 2, backgroundColor: color }} />
      <div className="absolute" style={{ top: y1, left: '50%', width: 2, height: y2 - y1 + 2, backgroundColor: color }} />
      <div className="absolute" style={{ top: (y1 + y2) / 2, left: '50%', right: 0, height: 2, backgroundColor: color }} />
    </>
  );
};

// ── BracketView — chaveamento: Oitavas → Quartas → Semifinal → Final ──────────
const BracketView = ({
  jogos, inputs, setInputs, onSave,
}: {
  jogos: Jogo[];
  inputs: Record<number, { casa: string; fora: string }>;
  setInputs: React.Dispatch<React.SetStateAction<Record<number, { casa: string; fora: string }>>>;
  onSave: (jogoId: number, casa: number, fora: number) => Promise<void>;
}) => {
  const [saved, setSaved] = useState<Record<number, boolean>>({});

  const pad = <T,>(arr: T[], n: number): (T | null)[] => [...arr, ...Array(n).fill(null)].slice(0, n);
  const oitavas  = pad(jogos.filter(j => j.fase === 'Oitavas'),  8) as (Jogo | null)[];
  const quartas  = pad(jogos.filter(j => j.fase === 'Quartas'),  4) as (Jogo | null)[];
  const semi     = pad(jogos.filter(j => j.fase === 'Semifinal'), 2) as (Jogo | null)[];
  const finalJogo    = jogos.find(j => j.fase === 'Final') ?? null;
  const terceiroJogo = jogos.find(j => j.fase === 'Terceiro Lugar') ?? null;

  const handleChange = (id: number, v: { casa: string; fora: string }) =>
    setInputs(prev => ({ ...prev, [id]: v }));

  const handleSave = async (jogo: Jogo | null) => {
    if (!jogo || jogo.travado || jogo.status === 'encerrado') return;
    const val = inputs[jogo.id];
    if (!val || val.casa === '' || val.fora === '') return;
    const casa = parseInt(val.casa, 10);
    const fora = parseInt(val.fora, 10);
    if (isNaN(casa) || isNaN(fora)) return;
    await onSave(jogo.id, casa, fora);
    setSaved(prev => ({ ...prev, [jogo.id]: true }));
    setTimeout(() => setSaved(prev => ({ ...prev, [jogo.id]: false })), 2000);
  };

  const nodeProps = (jogo: Jogo | null, highlight = false): GameNodeProps => ({
    jogo,
    value: jogo ? (inputs[jogo.id] ?? { casa: jogo.palpite_casa?.toString() ?? '', fora: jogo.palpite_fora?.toString() ?? '' }) : undefined,
    onChange: jogo ? (v) => handleChange(jogo.id, v) : undefined,
    onBlurSave: jogo ? () => handleSave(jogo) : undefined,
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
          <div className="h-px flex-1 bg-white/5" />
          <span className="text-[9px] text-slate-600 font-black uppercase tracking-widest">3° e 4° Lugar</span>
          <div className="h-px flex-1 bg-white/5" />
        </div>
        <GameNode {...nodeProps(terceiroJogo)} />
      </div>

    </div>
  );
};

// ── Pódio ──────────────────────────────────────────────────────────────────────
const Podio = ({ ranking, myUid }: { ranking: RankingEntry[]; myUid: string }) => {
  const top3 = ranking.slice(0, 3);
  const order = [1, 0, 2];
  const medals = [
    { icon: <Crown size={20} className="text-yellow-300" />, ring: 'ring-yellow-400/60', bg: 'from-yellow-500/20 to-yellow-500/5', h: 'h-28', lbl: '🥇' },
    { icon: <Medal size={18} className="text-slate-300" />,  ring: 'ring-slate-400/40',  bg: 'from-slate-500/20 to-slate-500/5', h: 'h-20',  lbl: '🥈' },
    { icon: <Medal size={18} className="text-amber-600" />,  ring: 'ring-amber-700/40',  bg: 'from-amber-800/20 to-amber-800/5', h: 'h-16',  lbl: '🥉' },
  ];
  return (
    <div className="flex items-end justify-center gap-4 mb-10 pt-4">
      {order.map(pos => {
        const entry = top3[pos];
        if (!entry) return <div key={pos} className="w-28" />;
        const m = medals[pos];
        const isMe = entry.user_id === myUid;
        return (
          <div key={pos} className="flex flex-col items-center gap-0">
            <div className={`flex flex-col items-center gap-1.5 px-4 py-3 rounded-2xl bg-gradient-to-b ${m.bg} border ${isMe ? 'border-violet-500/50' : 'border-white/10'} w-28 shadow-lg`}>
              {m.icon}
              <Avatar name={entry.user_name} url={entry.user_picture} size={10} />
              <span className="text-xs font-black text-white text-center truncate w-full">{entry.user_name?.split(' ')[0] || 'Usuário'}</span>
              <span className="text-[11px] text-violet-300 font-black">{entry.total_pontos} pts</span>
              <span className="text-[9px] text-slate-500">{entry.qtd_exatos} exatos</span>
            </div>
            <div className={`${m.h} w-28 rounded-t-xl bg-gradient-to-t ${m.bg} border-t border-x ${isMe ? 'border-violet-500/40' : 'border-white/5'} flex items-start justify-center pt-2`}>
              <span className="text-xl">{m.lbl}</span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

// ── TabLeaderboard ─────────────────────────────────────────────────────────────
const TabLeaderboard = ({ ranking, myUid, loading }: { ranking: RankingEntry[]; myUid: string; loading: boolean }) => {
  if (loading) return <div className="flex justify-center py-24"><div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;
  if (ranking.length === 0) return (
    <div className="text-center py-20 text-slate-600">
      <Trophy size={40} className="mx-auto mb-3 opacity-20" />
      <p className="text-sm">Nenhum palpite computado ainda.</p>
      <p className="text-xs mt-1 opacity-60">Os pontos aparecem após o lançamento de resultados.</p>
    </div>
  );
  return (
    <div>
      <Podio ranking={ranking} myUid={myUid} />
      <div className="bg-dark-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="grid grid-cols-[40px_1fr_80px_80px_80px] px-4 py-2 border-b border-white/5">
          {['#','Participante','Pts','Exatos','Palp.'].map(h => <span key={h} className="text-[9px] text-slate-600 font-bold uppercase text-center first:text-left">{h}</span>)}
        </div>
        {ranking.map((entry, i) => {
          const isMe = entry.user_id === myUid;
          return (
            <div key={entry.user_id} className={`grid grid-cols-[40px_1fr_80px_80px_80px] px-4 py-3 border-b border-white/5 last:border-0 ${isMe ? 'bg-violet-500/10 border-l-2 border-l-violet-500' : 'hover:bg-white/[0.02]'}`}>
              <span className={`text-sm font-black ${i===0?'text-yellow-400':i===1?'text-slate-300':i===2?'text-amber-600':'text-slate-600'}`}>{i+1}</span>
              <div className="flex items-center gap-2 min-w-0">
                <Avatar name={entry.user_name} url={entry.user_picture} size={7} />
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

  const handleAddJogo = async () => {
    if (!form.time_casa.trim() || !form.time_fora.trim() || !form.inicia_em) return;
    setSaving(true);
    try {
      await apiFetch(`/api/bolao/${bolaoId}/jogos`, {
        method: 'POST',
        body: JSON.stringify({ fase: form.fase, time_casa: form.time_casa.trim(), time_fora: form.time_fora.trim(), inicia_em: new Date(form.inicia_em).toISOString() }),
      });
      setForm({ fase: 'Quartas', time_casa: '', time_fora: '', inicia_em: '' });
      onRefresh();
    } catch (e) { console.error(e); }
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
      if (!r.ok) { const err = await r.json(); alert(err.error || 'Erro'); }
      else { setResultModal(null); onRefresh(); }
    } catch (e) { console.error(e); }
    setSavingResult(false);
  };

  const faseOrder: Record<string, number> = { 'Quartas': 0, 'Semifinal': 1, 'Final': 2, 'Terceiro Lugar': 3 };
  const sorted = [...jogos].sort((a, b) => (faseOrder[a.fase] ?? 9) - (faseOrder[b.fase] ?? 9));

  return (
    <div className="space-y-8">
      {/* Add game */}
      <div className="bg-dark-card rounded-2xl border border-white/10 p-6">
        <h3 className="text-sm font-black text-dark-text mb-4 flex items-center gap-2"><Plus size={14} className="text-violet-400" /> Cadastrar Jogo</h3>
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Fase</label>
            <select value={form.fase} onChange={e => setForm(f => ({ ...f, fase: e.target.value }))}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500">
              {FASE_OPTIONS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Data/Hora</label>
            <input type="datetime-local" value={form.inicia_em} onChange={e => setForm(f => ({ ...f, inicia_em: e.target.value }))}
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Time Casa</label>
            <input value={form.time_casa} onChange={e => setForm(f => ({ ...f, time_casa: e.target.value }))} placeholder="Ex: Brasil"
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500" />
          </div>
          <div>
            <label className="text-[10px] text-slate-500 font-semibold uppercase tracking-wider block mb-1">Time Fora</label>
            <input value={form.time_fora} onChange={e => setForm(f => ({ ...f, time_fora: e.target.value }))} placeholder="Ex: França"
              className="w-full bg-dark-bg border border-white/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-slate-600 focus:outline-none focus:border-violet-500" />
          </div>
        </div>
        <button onClick={handleAddJogo} disabled={saving || !form.time_casa || !form.time_fora || !form.inicia_em}
          className="w-full py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 disabled:opacity-40 text-sm font-bold text-white transition-all flex items-center justify-center gap-2">
          {saving ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Plus size={14} />}
          Cadastrar
        </button>
      </div>

      {/* Results list */}
      <div className="bg-dark-card rounded-2xl border border-white/10 overflow-hidden">
        <div className="px-6 py-4 border-b border-white/5">
          <h3 className="text-sm font-black text-dark-text flex items-center gap-2"><Target size={14} className="text-violet-400" /> Lançar Resultados</h3>
        </div>
        {sorted.map(j => (
          <div key={j.id} className="flex items-center justify-between px-6 py-3 border-b border-white/5 last:border-0">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] text-violet-400 font-black uppercase bg-violet-500/10 px-1.5 py-0.5 rounded">{j.fase}</span>
                <p className="text-sm font-bold text-dark-text">{j.time_casa} × {j.time_fora}</p>
              </div>
              <p className="text-[10px] text-slate-500 mt-0.5">{new Date(j.inicia_em).toLocaleString('pt-BR')}</p>
            </div>
            {j.status === 'encerrado'
              ? <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-3 py-1 rounded-lg">{j.gols_casa} × {j.gols_fora} ✓</span>
              : j.travado
              ? <button onClick={() => setResultModal({ jogo: j, casa: '', fora: '' })}
                  className="text-xs font-bold text-violet-400 hover:text-violet-300 bg-violet-500/10 hover:bg-violet-500/20 px-3 py-1.5 rounded-lg transition-colors">
                  Lançar resultado
                </button>
              : <span className="text-[10px] text-slate-600">Aguardando início</span>
            }
          </div>
        ))}
        {sorted.length === 0 && <div className="py-8 text-center text-slate-600 text-xs">Nenhum jogo cadastrado.</div>}
      </div>

      {/* Result modal */}
      {resultModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setResultModal(null)}>
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 w-80 shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-black text-dark-text">Resultado Final</h3>
              <button onClick={() => setResultModal(null)} className="text-slate-500 hover:text-dark-text"><X size={16} /></button>
            </div>
            <p className="text-xs text-slate-400 mb-1 text-center font-bold">{resultModal.jogo.fase}</p>
            <p className="text-sm text-white mb-4 text-center font-black">{resultModal.jogo.time_casa} × {resultModal.jogo.time_fora}</p>
            <div className="flex items-center gap-3 mb-5">
              <input type="number" min={0} value={resultModal.casa} onChange={e => setResultModal(r => r ? { ...r, casa: e.target.value } : r)} placeholder="0"
                className="flex-1 bg-dark-bg border border-white/10 rounded-xl px-3 py-3 text-xl font-black text-white text-center focus:outline-none focus:border-violet-500" />
              <span className="text-slate-500 font-bold text-lg">×</span>
              <input type="number" min={0} value={resultModal.fora} onChange={e => setResultModal(r => r ? { ...r, fora: e.target.value } : r)} placeholder="0"
                className="flex-1 bg-dark-bg border border-white/10 rounded-xl px-3 py-3 text-xl font-black text-white text-center focus:outline-none focus:border-violet-500" />
            </div>
            <button onClick={handleLancarResultado} disabled={savingResult || !resultModal.casa || !resultModal.fora}
              className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-sm font-bold text-white transition-all flex items-center justify-center gap-2">
              {savingResult ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Check size={14} />}
              Confirmar Resultado
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

// ── Main Page ──────────────────────────────────────────────────────────────────
export default function Bolao() {
  const { user, userData } = useAuth();
  const apiFetch = useAuthFetch();
  const isAdmin = userData?.role === 'superadmin';

  const [bolaoId, setBolaoId] = useState<number | null>(null);
  const [jogos, setJogos] = useState<Jogo[]>([]);
  const [ranking, setRanking] = useState<RankingEntry[]>([]);
  const [loadingJogos, setLoadingJogos] = useState(true);
  const [loadingRanking, setLoadingRanking] = useState(true);
  const [activeTab, setActiveTab] = useState<'palpites' | 'leaderboard' | 'admin'>('palpites');
  const [inputs, setInputs] = useState<Record<number, { casa: string; fora: string }>>({});

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
      .then((data: RankingEntry[]) => { setRanking(data); setLoadingRanking(false); })
      .catch(() => setLoadingRanking(false));
  }, [bolaoId, apiFetch]);

  useEffect(() => { loadJogos(); loadRanking(); }, [bolaoId]);

  // Init inputs from palpites (only if not already typed)
  useEffect(() => {
    setInputs(prev => {
      const init: Record<number, { casa: string; fora: string }> = {};
      for (const j of jogos) {
        if (!(j.id in prev)) {
          init[j.id] = {
            casa: j.palpite_casa !== null ? String(j.palpite_casa) : '',
            fora: j.palpite_fora !== null ? String(j.palpite_fora) : '',
          };
        }
      }
      return { ...init, ...prev };
    });
  }, [jogos]);

  const handleSavePalpite = async (jogoId: number, casa: number, fora: number) => {
    const r = await apiFetch(`/api/bolao/jogos/${jogoId}/palpite`, {
      method: 'POST',
      body: JSON.stringify({ palpite_casa: casa, palpite_fora: fora }),
    });
    if (!r.ok) {
      const err = await r.json();
      alert(err.error || 'Erro ao salvar palpite');
    } else {
      loadJogos();
    }
  };

  const tabs = [
    { id: 'palpites' as const, label: 'Chaveamento', icon: Target },
    { id: 'leaderboard' as const, label: 'Ranking', icon: Trophy },
    ...(isAdmin ? [{ id: 'admin' as const, label: 'Admin', icon: Settings }] : []),
  ];

  return (
    <div className="p-6 md:p-8 bg-dark-bg text-white min-h-screen">
      <div className="mb-8">
        <SplitHeadline text="Bolão da " highlight="Copa" subtitle="Mata-mata — faça seus palpites por fase!" />
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-8 bg-dark-card p-1 rounded-xl border border-white/10 w-fit">
        {tabs.map(tab => {
          const Icon = tab.icon;
          return (
            <button key={tab.id} onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-bold transition-all ${
                activeTab === tab.id ? 'bg-violet-600 text-white shadow-lg shadow-violet-500/20' : 'text-slate-400 hover:text-dark-text hover:bg-white/5'
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
          : <BracketView jogos={jogos} inputs={inputs} setInputs={setInputs} onSave={handleSavePalpite} />
      )}
      {activeTab === 'leaderboard' && (
        <TabLeaderboard ranking={ranking} myUid={user?.uid || ''} loading={loadingRanking} />
      )}
      {activeTab === 'admin' && isAdmin && bolaoId && (
        <TabAdmin bolaoId={bolaoId} jogos={jogos} onRefresh={() => { loadJogos(); loadRanking(); }} authFetch={apiFetch} />
      )}
    </div>
  );
}
