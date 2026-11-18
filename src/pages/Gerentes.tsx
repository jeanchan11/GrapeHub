// Gerentes de IA (18/11/2026) — substitui o Fred. Servidor em src/routes/gerentes.ts.
// Layout v2 (pedido do Jean, 18/11): app de conversa em três colunas —
//   esquerda: a equipe (4 gerentes) + as conversas do gerente escolhido;
//   centro:   o gerente — resumo de hoje (Andou / Travou / Espera sua decisão) quando a
//             conversa está vazia, mensagens centralizadas e a caixa de texto embaixo;
//   direita:  a fila "Para decidir", sempre à vista.
// v1 em backup-menu-antes-materna/fred/Gerentes.v1.tsx.orig.
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Sparkles, Wallet, TrendingUp, LayoutGrid, ArrowUp, Plus, Trash2, FileText,
  Check, X, RotateCcw, Loader2, Inbox, Wrench, ChevronDown, CheckCircle2, Megaphone, Brain,
} from 'lucide-react';
import {
  ResponsiveContainer, LineChart, Line, AreaChart, Area, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ReferenceLine,
} from 'recharts';
import type { LucideIcon } from 'lucide-react';
import SplitHeadline from '../components/SplitHeadline';
import { Abas } from '../components/ui/Abas';
import { EstadoVazio } from '../components/ui/EstadoVazio';
import { CarregandoBloco } from '../components/LoadingSpinner';
import { toast } from '../lib/toast';
import { confirmDialog, promptDialog } from '../lib/confirm';
import { auth } from '../firebase';

type GerenteId = 'assistente' | 'financeiro' | 'comercial' | 'marketing' | 'operacional';
type Gerente = {
  id: GerenteId; nome: string; area: string; descricao: string; pendentes: number;
  ultimo_relatorio: { dia: string; status: string; concluido_em: string | null } | null;
};
type Mensagem = { id?: number; papel: 'usuario' | 'assistente'; texto: string; ferramentas?: string[] | null; erro?: boolean };
type Conversa = { id: number; titulo: string; atualizado_em: string };
type Relatorio = { id: number; dia: string; status: string; texto: string | null; erro: string | null; concluido_em: string | null };
type Decisao = {
  id: number; gerente: GerenteId; titulo: string; contexto: string; recomendacao: string;
  urgencia: 'alta' | 'media' | 'baixa'; status: 'pendente' | 'aprovado' | 'descartado' | 'feito';
  criado_em: string; decidido_por: string | null; decidido_em: string | null; observacao: string | null;
  responsavel?: string | null; responsavel_nome?: string | null; prazo?: string | null; concluido_em?: string | null;
};

const VISUAL: Record<GerenteId, { Icone: LucideIcon; cor: string; cor2: string; curto: string }> = {
  assistente: { Icone: Sparkles, cor: '#8b5cf6', cor2: '#6d28d9', curto: 'CEO' },
  financeiro: { Icone: Wallet, cor: '#10b981', cor2: '#047857', curto: 'Financeiro' },
  comercial: { Icone: TrendingUp, cor: '#38bdf8', cor2: '#0369a1', curto: 'Comercial' },
  marketing: { Icone: Megaphone, cor: '#ec4899', cor2: '#be185d', curto: 'Marketing' },
  operacional: { Icone: LayoutGrid, cor: '#f59e0b', cor2: '#b45309', curto: 'Operacional' },
};

const SUGESTOES: Record<GerenteId, string[]> = {
  assistente: ['O que precisa da minha atenção hoje?', 'Resuma a semana em todas as áreas', 'O que está pendente na fila?'],
  financeiro: ['Gráfico do saldo previsto para 30 dias', 'Quem está inadimplente e qual foi o último contato?', 'Compare os últimos 3 meses fechados'],
  comercial: ['Como está o funil deste mês?', 'Quais leads estão parados e com quem?', 'Quais tarefas estão atrasadas?'],
  marketing: ['Qual criativo tem o melhor CPL este mês?', 'Faça um gráfico do gasto por dia em novembro', 'O que escalar e o que pausar?'],
  operacional: ['Quais projetos estão ruins e de quem são?', 'Gráfico da evolução da carteira', 'Quem está em risco de sair?'],
};

const NOME_FERRAMENTA: Record<string, string> = {
  caixa_atual: 'caixa', previsao_caixa: 'previsão de caixa', inadimplentes: 'inadimplentes', contas_a_pagar: 'contas a pagar',
  meses_fechados: 'meses fechados', funil_periodo: 'funil', leads_parados: 'leads parados', tarefas_atrasadas: 'tarefas',
  fechamentos_recentes: 'fechamentos', carteira: 'carteira', evolucao_carteira: 'evolução da carteira', retencao: 'retenção',
  propor_decisao: 'fila de decisões', decisoes_pendentes: 'fila de decisões',
  anuncios_grape: 'anúncios da Grape', postagens_instagram: 'postagens', buscar_conversas: 'conversas antigas',
};

const URGENCIA: Record<string, { rotulo: string; cor: string }> = {
  alta: { rotulo: 'Urgente', cor: '#f43f5e' },
  media: { rotulo: 'Esta semana', cor: '#f59e0b' },
  baixa: { rotulo: 'Quando der', cor: '#94a3b8' },
};

const hojeLocal = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};
const ddmm = (iso?: string | null) => (iso ? `${iso.slice(8, 10)}/${iso.slice(5, 7)}` : '');
const hora = (iso?: string | null) => (iso ? new Date(iso).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : '');
const quando = (iso?: string | null) => {
  if (!iso) return '';
  const d = new Date(iso);
  const dia = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
  return dia === hojeLocal() ? hora(iso) : ddmm(dia);
};

// ── Peças visuais ──────────────────────────────────────────────────────────────
function Avatar({ id, tamanho = 36 }: { id: GerenteId; tamanho?: number }) {
  const v = VISUAL[id];
  return (
    <div className="shrink-0 flex items-center justify-center text-white"
      style={{
        width: tamanho, height: tamanho, borderRadius: tamanho * 0.32,
        background: `linear-gradient(140deg, ${v.cor}, ${v.cor2})`,
        boxShadow: `0 8px 18px -10px ${v.cor}`,
      }}>
      <v.Icone size={Math.round(tamanho * 0.46)} strokeWidth={2.2} />
    </div>
  );
}

function Inline({ texto }: { texto: string }) {
  const partes = texto.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);
  return (
    <>
      {partes.map((p, i) =>
        p.startsWith('**') && p.endsWith('**') ? <strong key={i} className="font-semibold text-dark-text">{p.slice(2, -2)}</strong>
          : p.startsWith('`') && p.endsWith('`') ? <code key={i} className="px-1 py-0.5 rounded bg-black/5 dark:bg-white/10 text-[0.9em]">{p.slice(1, -1)}</code>
            : <React.Fragment key={i}>{p}</React.Fragment>)}
    </>
  );
}

function Markdown({ texto, tamanho = 'text-[14.5px]' }: { texto: string; tamanho?: string }) {
  const blocos: React.ReactNode[] = [];
  let lista: { tipo: 'ul' | 'ol'; itens: string[] } | null = null;
  const fecharLista = () => {
    if (!lista) return;
    const L = lista; lista = null;
    const Tag = L.tipo;
    blocos.push(
      <Tag key={blocos.length} className={`${L.tipo === 'ul' ? 'list-disc' : 'list-decimal'} pl-5 space-y-1.5 marker:text-slate-400`}>
        {L.itens.map((it, i) => <li key={i} className="pl-0.5"><Inline texto={it} /></li>)}
      </Tag>,
    );
  };
  let cerca: { tipo: string; linhas: string[] } | null = null;
  for (const bruta of texto.replace(/\r/g, '').split('\n')) {
    const l = bruta.trimEnd();
    const marca = l.trim().match(/^```\s*([\w-]*)\s*$/);
    if (cerca) {
      if (marca && !marca[1]) {
        const c = cerca; cerca = null;
        blocos.push(c.tipo === 'grafico'
          ? <GraficoIA key={blocos.length} fonte={c.linhas.join('\n')} />
          : <pre key={blocos.length} className="text-[12.5px] rounded-xl bg-black/[0.04] dark:bg-white/[0.05] p-3 overflow-x-auto whitespace-pre-wrap">{c.linhas.join('\n')}</pre>);
      } else cerca.linhas.push(bruta);
      continue;
    }
    if (marca) { fecharLista(); cerca = { tipo: marca[1].toLowerCase(), linhas: [] }; continue; }
    const ul = l.match(/^\s*[-*•]\s+(.*)$/);
    const ol = l.match(/^\s*\d+[.)]\s+(.*)$/);
    if (ul || ol) {
      const tipo = ul ? 'ul' : 'ol';
      if (lista && lista.tipo !== tipo) fecharLista();
      if (!lista) lista = { tipo, itens: [] };
      lista.itens.push((ul || ol)![1]);
      continue;
    }
    fecharLista();
    if (!l.trim()) continue;
    const h = l.match(/^#{1,4}\s+(.*)$/);
    if (h) { blocos.push(<p key={blocos.length} className="font-semibold text-dark-text pt-1"><Inline texto={h[1]} /></p>); continue; }
    if (/^-{3,}$/.test(l.trim())) continue;
    blocos.push(<p key={blocos.length}><Inline texto={l} /></p>);
  }
  fecharLista();
  // Bloco que não fechou (resposta cortada): gráfico incompleto não é desenhado
  return <div className={`space-y-3 ${tamanho} leading-[1.65] text-slate-700 dark:text-slate-300`}>{blocos}</div>;
}

// ── Gráfico pedido pelo gerente (bloco ```grafico com JSON) ─────────────────────
const PALETA = ['#8b5cf6', '#38bdf8', '#f59e0b', '#ec4899', '#a3e635', '#14b8a6'];
const COR_NOMEADA: Record<string, string> = {
  vermelho: '#f43f5e', verde: '#10b981', amarelo: '#facc15', laranja: '#f97316', azul: '#38bdf8',
  roxo: '#8b5cf6', violeta: '#8b5cf6', cinza: '#94a3b8', rosa: '#ec4899', ambar: '#f59e0b', âmbar: '#f59e0b',
};
// Cor pedida (nome ou hex) > cor pelo significado do rótulo > paleta
const corPedida = (c?: string) => {
  if (!c) return null;
  const t = c.trim().toLowerCase();
  return COR_NOMEADA[t] || (/^#[0-9a-f]{3,8}$/.test(t) ? t : null);
};
const corPorSignificado = (nome: string) => {
  const t = nome.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase();
  if (/ruim|perd|atras|negativ|churn|saida|inadimpl|venc|risco|queda|cancel/.test(t)) return '#f43f5e';
  if (/bom|\bok\b|ganh|positiv|recebid|fechad|pago|melhor/.test(t)) return '#10b981';
  if (/outros|testando|pausad|neutr|aguardando/.test(t)) return '#94a3b8';
  return null;
};
const coresDas = (nomes: string[], pedidas: (string | undefined)[]) => {
  let k = 0;
  return nomes.map((nome, i) => corPedida(pedidas[i]) || corPorSignificado(nome) || PALETA[k++ % PALETA.length]);
};

type EspecGrafico = {
  tipo: 'linha' | 'area' | 'barras' | 'barras_empilhadas' | 'pizza';
  titulo?: string; unidade?: string; x: string[];
  series: { nome: string; valores: number[]; cor?: string }[];
  cores?: string[];
  referencia?: { valor: number; rotulo?: string };
};

const fmtValor = (v: number, unidade?: string, curto = false) => {
  if (v == null || !Number.isFinite(v)) return '—';
  if (unidade === '%') return `${v.toLocaleString('pt-BR', { maximumFractionDigits: 1 })}%`;
  const abs = Math.abs(v);
  const num = curto && abs >= 1000
    ? `${(v / 1000).toLocaleString('pt-BR', { maximumFractionDigits: abs >= 10000 ? 0 : 1 })} mil`
    : v.toLocaleString('pt-BR', { minimumFractionDigits: unidade === 'R$' && !curto ? 2 : 0, maximumFractionDigits: unidade === 'R$' ? 2 : 1 });
  return unidade === 'R$' ? `R$ ${num}` : num;
};

function GraficoIA({ fonte }: { fonte: string }) {
  const espec = useMemo<EspecGrafico | null>(() => {
    try {
      const j = JSON.parse(fonte);
      if (!Array.isArray(j?.x) || !Array.isArray(j?.series) || !j.series.length) return null;
      return j;
    } catch { return null; }
  }, [fonte]);
  if (!espec) return <p className="text-[12.5px] text-slate-400 italic">(não consegui desenhar este gráfico)</p>;

  const series = espec.series.slice(0, 4);
  const cor = coresDas(series.map(x => String(x.nome || '')), series.map(x => x.cor));
  const dados = espec.x.slice(0, 60).map((rot, i) => {
    const o: Record<string, any> = { rot };
    series.forEach((s, k) => { o[`s${k}`] = Number(s.valores?.[i]); });
    return o;
  });
  const u = espec.unidade;
  const eixo = { stroke: 'currentColor', tick: { fill: 'currentColor', fontSize: 11 }, tickLine: false, axisLine: false };
  const dica = (
    <Tooltip
      cursor={{ fill: 'rgba(139,92,246,.08)', stroke: 'rgba(139,92,246,.3)' }}
      contentStyle={{ background: 'rgb(var(--dark-card))', border: '1px solid rgb(var(--dark-text) / .1)', borderRadius: 12, fontSize: 12, color: 'rgb(var(--dark-text))' }}
      labelStyle={{ color: 'rgb(var(--dark-text))', fontWeight: 600, marginBottom: 4 }}
      formatter={(v: any, nome: any) => [fmtValor(Number(v), u), nome]}
    />
  );
  const legenda = series.length > 1 ? <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: 12, paddingTop: 8 }} /> : null;
  const ref = espec.referencia && Number.isFinite(Number(espec.referencia.valor))
    ? <ReferenceLine y={Number(espec.referencia.valor)} stroke="#f43f5e" strokeDasharray="4 4" label={{ value: espec.referencia.rotulo || '', fill: '#f43f5e', fontSize: 11, position: 'insideTopRight' }} />
    : null;
  const comum = (
    <>
      <CartesianGrid vertical={false} stroke="currentColor" strokeOpacity={0.08} />
      <XAxis dataKey="rot" {...eixo} minTickGap={12} />
      <YAxis {...eixo} width={64} tickFormatter={(v: number) => fmtValor(v, u, true)} />
      {dica}{legenda}{ref}
    </>
  );

  let corpo: React.ReactNode;
  if (espec.tipo === 'pizza') {
    const s = series[0];
    const coresX = coresDas(espec.x.map(String), espec.x.map((_, i) => espec.cores?.[i]));
    const fatias = espec.x.map((rot, i) => ({ nome: rot, valor: Number(s.valores?.[i]) || 0, cor: coresX[i] })).filter(f => f.valor > 0);
    const total = fatias.reduce((t, f) => t + f.valor, 0);
    corpo = (
      <div className="flex items-center gap-6 flex-wrap">
        <div className="w-[180px] h-[180px]">
          <ResponsiveContainer>
            <PieChart>
              <Pie data={fatias} dataKey="valor" nameKey="nome" innerRadius={52} outerRadius={84} paddingAngle={2} stroke="none">
                {fatias.map((f, i) => <Cell key={i} fill={f.cor} />)}
              </Pie>
              {dica}
            </PieChart>
          </ResponsiveContainer>
        </div>
        <ul className="space-y-1.5 text-[12.5px] min-w-[180px] flex-1">
          {fatias.map((f, i) => (
            <li key={f.nome} className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full shrink-0" style={{ background: f.cor }} />
              <span className="flex-1 truncate text-slate-600 dark:text-slate-300">{f.nome}</span>
              <span className="font-semibold text-dark-text numero">{fmtValor(f.valor, u)}</span>
              <span className="text-slate-400 w-10 text-right">{total ? Math.round((f.valor / total) * 100) : 0}%</span>
            </li>
          ))}
        </ul>
      </div>
    );
  } else {
    const grafico =
      espec.tipo === 'barras' || espec.tipo === 'barras_empilhadas' ? (
        <BarChart data={dados} barCategoryGap="22%">
          {comum}
          {series.map((s, k) => (
            <Bar key={k} dataKey={`s${k}`} name={s.nome} fill={cor[k]} radius={espec.tipo === 'barras_empilhadas' && k < series.length - 1 ? 0 : [6, 6, 0, 0]}
              stackId={espec.tipo === 'barras_empilhadas' ? 'a' : undefined} maxBarSize={44} />
          ))}
        </BarChart>
      ) : espec.tipo === 'area' ? (
        <AreaChart data={dados}>
          <defs>
            {series.map((_, k) => (
              <linearGradient key={k} id={`gia${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={cor[k]} stopOpacity={0.35} />
                <stop offset="100%" stopColor={cor[k]} stopOpacity={0} />
              </linearGradient>
            ))}
          </defs>
          {comum}
          {series.map((s, k) => <Area key={k} type="monotone" dataKey={`s${k}`} name={s.nome} stroke={cor[k]} strokeWidth={2.2} fill={`url(#gia${k})`} />)}
        </AreaChart>
      ) : (
        <LineChart data={dados}>
          {comum}
          {series.map((s, k) => <Line key={k} type="monotone" dataKey={`s${k}`} name={s.nome} stroke={cor[k]} strokeWidth={2.4} dot={dados.length <= 14 ? { r: 3, strokeWidth: 0, fill: cor[k] } : false} activeDot={{ r: 5 }} />)}
        </LineChart>
      );
    corpo = <div className="h-[260px] text-slate-400"><ResponsiveContainer>{grafico}</ResponsiveContainer></div>;
  }

  return (
    <div className="rounded-2xl ring-1 ring-black/5 dark:ring-white/[0.07] bg-black/[0.015] dark:bg-white/[0.025] px-4 pt-4 pb-3 my-1">
      {espec.titulo && <p className="text-[13px] font-semibold text-dark-text mb-3">{espec.titulo}</p>}
      {corpo}
    </div>
  );
}

// Divide o relatório nas três partes (o que vem antes de "Andou" é a conclusão)
const SECOES = [
  { chave: 'andou', rotulo: 'Andou', cor: '#10b981', re: /^andou\b/i },
  { chave: 'travou', rotulo: 'Travou', cor: '#f59e0b', re: /^travou\b/i },
  { chave: 'decisao', rotulo: 'Espera sua decisão', cor: '#8b5cf6', re: /^espera/i },
] as const;

function partesDoRelatorio(texto: string) {
  const out: Record<string, string[]> = { intro: [], andou: [], travou: [], decisao: [] };
  let atual = 'intro';
  for (const l of texto.split('\n')) {
    const t = l.trim();
    if ((t.startsWith('**') || t.startsWith('#')) && t.length < 120) {
      const m = t.match(/^(?:#{1,4}\s*)?\*{0,2}([^*]+?)\*{0,2}\s*(?:[—–:-]\s*(.*))?$/);
      const cab = m ? SECOES.find(s => s.re.test(m[1].trim())) : null;
      if (cab) {
        atual = cab.chave;
        if (m?.[2]) out[atual].push(m[2]);
        continue;
      }
    }
    out[atual].push(l);
  }
  const j = (k: string) => out[k].join('\n').trim();
  return { intro: j('intro'), andou: j('andou'), travou: j('travou'), decisao: j('decisao') } as Record<string, string>;
}

function RelatorioVisual({ texto, compacto = false }: { texto: string; compacto?: boolean }) {
  const p = partesDoRelatorio(texto);
  if (!p.andou && !p.travou && !p.decisao) return <Markdown texto={texto} />;
  const tamIntro = compacto ? 'text-[15.5px]' : 'text-[17px]';
  return (
    <div className="space-y-6">
      {p.intro && (
        <div className="[&_strong]:text-violet-600 dark:[&_strong]:text-violet-300 [&_p]:text-dark-text">
          <Markdown texto={p.intro} tamanho={tamIntro} />
        </div>
      )}
      <div className="space-y-5">
        {SECOES.map(s => p[s.chave] && (
          <div key={s.chave} className="relative pl-4">
            <span className="absolute left-0 top-0.5 bottom-0.5 w-[3px] rounded-full" style={{ background: s.cor }} />
            <p className="text-[11px] font-bold uppercase tracking-[0.12em] mb-2" style={{ color: s.cor }}>{s.rotulo}</p>
            <Markdown texto={p[s.chave]} tamanho="text-[13.5px]" />
          </div>
        ))}
      </div>
    </div>
  );
}

// ── Página ─────────────────────────────────────────────────────────────────────
export default function Gerentes({ pageLabel }: { pageLabel?: string }) {
  const [gerentes, setGerentes] = useState<Gerente[] | null>(null);
  const [configurado, setConfigurado] = useState(true);
  const [ativo, setAtivo] = useState<GerenteId | null>(null);
  const [decisoes, setDecisoes] = useState<Decisao[]>([]);
  const [conversas, setConversas] = useState<Conversa[]>([]);
  const [conversaAtual, setConversaAtual] = useState<number | null>(null);

  const carregarGerentes = useCallback(async () => {
    try {
      const r = await fetch('/api/gerentes');
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      setGerentes(j.gerentes);
      setConfigurado(j.configurado);
      setAtivo(a => a || j.gerentes[0]?.id || null);
    } catch (e: any) {
      setGerentes([]);
      toast.error(e?.message || 'Não foi possível carregar os gerentes');
    }
  }, []);

  const carregarDecisoes = useCallback(async () => {
    try { const r = await fetch('/api/gerentes-decisoes'); if (r.ok) setDecisoes(await r.json()); } catch { /* fica como está */ }
  }, []);

  const carregarConversas = useCallback(async (g: GerenteId) => {
    const r = await fetch(`/api/gerentes/${g}/conversas`);
    if (r.ok) setConversas(await r.json());
  }, []);

  useEffect(() => { carregarGerentes(); carregarDecisoes(); }, [carregarGerentes, carregarDecisoes]);
  useEffect(() => { if (ativo) { setConversaAtual(null); setConversas([]); carregarConversas(ativo); } }, [ativo, carregarConversas]);

  const atualizarFila = () => { carregarDecisoes(); carregarGerentes(); };

  const nome = pageLabel || 'Gerentes IA';
  const i = nome.lastIndexOf(' ');
  const gerente = gerentes?.find(g => g.id === ativo) || null;

  if (!gerentes) return <div className="p-6 lg:p-8"><CarregandoBloco /></div>;

  return (
    <div className="px-6 lg:px-8 pt-6 pb-5 flex flex-col gap-5 2xl:h-screen">
      <div className="shrink-0">
        <SplitHeadline text={i > 0 ? nome.slice(0, i + 1) : ''} highlight={i > 0 ? nome.slice(i + 1) : nome}
          subtitle="Eles leem o sistema e trazem o que importa. Quem decide é você." />
      </div>

      {!configurado && (
        <div className="shrink-0 rounded-xl px-4 py-3 text-sm bg-amber-500/10 text-amber-700 dark:text-amber-300">
          A chave da IA (ANTHROPIC_API_KEY) não está configurada neste servidor. A conversa e os relatórios não vão funcionar.
        </div>
      )}

      {gerentes.length === 0 ? (
        <EstadoVazio Icone={Inbox} titulo="Nenhum gerente liberado para você" descricao="Os gerentes aparecem conforme a sua função. Fale com o administrador se precisar de acesso." />
      ) : (
        <div className="flex-1 min-h-0 grid grid-cols-1 lg:grid-cols-[250px_minmax(0,1fr)] 2xl:grid-cols-[250px_minmax(0,1fr)_340px] gap-5">
          {/* ── Equipe + conversas ── */}
          <div className="flex flex-col gap-6 min-h-0">
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400 px-2 mb-2">Sua equipe</p>
              <div className="flex flex-col gap-1">
                {gerentes.map(g => {
                  const sel = g.id === ativo;
                  const rel = g.ultimo_relatorio;
                  const hoje = rel?.dia === hojeLocal() && rel.status === 'pronto';
                  return (
                    <button key={g.id} type="button" onClick={() => setAtivo(g.id)}
                      className={`relative flex items-center gap-3 px-2.5 py-2.5 rounded-2xl text-left transition-colors ${sel ? '' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'}`}>
                      {sel && <motion.span layoutId="gerente-ativo" className="absolute inset-0 rounded-2xl bg-black/[0.04] dark:bg-white/[0.06] ring-1 ring-black/5 dark:ring-white/10" transition={{ type: 'spring', stiffness: 500, damping: 40 }} />}
                      <span className="relative"><Avatar id={g.id} tamanho={38} /></span>
                      <span className="relative min-w-0 flex-1">
                        <span className="flex items-center gap-2">
                          <span className={`text-[14px] truncate ${sel ? 'font-semibold text-dark-text' : 'font-medium text-slate-600 dark:text-slate-300'}`}>{g.nome}</span>
                          {g.pendentes > 0 && <span className="ml-auto text-[10.5px] font-bold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center bg-rose-500 text-white">{g.pendentes}</span>}
                        </span>
                        <span className="block text-[12px] text-slate-400 truncate mt-0.5">
                          {hoje ? <>Relatório de hoje · {hora(rel!.concluido_em)}</> : rel?.status === 'gerando' ? 'Escrevendo o relatório…' : g.area}
                        </span>
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="hidden lg:flex flex-col min-h-0 flex-1">
              <div className="flex items-center justify-between px-2 mb-2">
                <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-slate-400">Conversas</p>
                <button type="button" title="Nova conversa" onClick={() => setConversaAtual(null)}
                  className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 transition-colors">
                  <Plus size={16} />
                </button>
              </div>
              <div className="flex-1 min-h-0 overflow-y-auto scrollbar-hide flex flex-col gap-0.5">
                {conversas.length === 0 && <p className="text-[12.5px] text-slate-400 px-2 py-1">As conversas com o {VISUAL[ativo || 'assistente'].curto} ficam aqui.</p>}
                {conversas.map(c => (
                  <div key={c.id} onClick={() => setConversaAtual(c.id)}
                    className={`group flex items-center gap-2 rounded-xl px-2.5 py-2 cursor-pointer transition-colors ${conversaAtual === c.id ? 'bg-violet-500/10' : 'hover:bg-black/[0.03] dark:hover:bg-white/[0.04]'}`}>
                    <span className={`min-w-0 flex-1 truncate text-[13px] ${conversaAtual === c.id ? 'text-violet-600 dark:text-violet-300 font-medium' : 'text-slate-500 dark:text-slate-400'}`}>{c.titulo}</span>
                    <span className="text-[11px] text-slate-400 group-hover:hidden">{quando(c.atualizado_em)}</span>
                    <button type="button" title="Apagar" className="hidden group-hover:block text-slate-400 hover:text-rose-500"
                      onClick={async e => {
                        e.stopPropagation();
                        if (!(await confirmDialog({ title: 'Apagar conversa?', message: `"${c.titulo}" sai do seu histórico.`, confirmText: 'Apagar', danger: true }))) return;
                        await fetch(`/api/gerentes/${ativo}/conversas/${c.id}`, { method: 'DELETE' });
                        if (conversaAtual === c.id) setConversaAtual(null);
                        if (ativo) carregarConversas(ativo);
                      }}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ── Gerente ── */}
          {gerente && (
            <PainelGerente
              key={gerente.id}
              gerente={gerente}
              conversaId={conversaAtual}
              aoCriarConversa={id => { setConversaAtual(id); carregarConversas(gerente.id); }}
              aoNovaConversa={() => setConversaAtual(null)}
              aoMudarFila={atualizarFila}
            />
          )}

          {/* ── Para decidir ── */}
          <div className="lg:col-span-2 2xl:col-span-1 min-h-0">
            <ParaDecidir decisoes={decisoes} aoMudar={atualizarFila} />
          </div>
        </div>
      )}
    </div>
  );
}

// ── Centro: gerente (resumo de hoje + conversa) ────────────────────────────────
function PainelGerente({ gerente, conversaId, aoCriarConversa, aoNovaConversa, aoMudarFila }: {
  gerente: Gerente; conversaId: number | null;
  aoCriarConversa: (id: number) => void; aoNovaConversa: () => void; aoMudarFila: () => void;
}) {
  const [aba, setAba] = useState<'conversa' | 'relatorios' | 'memoria'>('conversa');
  const [mensagens, setMensagens] = useState<Mensagem[]>([]);
  const [carregando, setCarregando] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const [texto, setTexto] = useState('');
  const [relatorios, setRelatorios] = useState<Relatorio[] | null>(null);
  const [diaSel, setDiaSel] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const rolagem = useRef<HTMLDivElement>(null);
  const campo = useRef<HTMLTextAreaElement>(null);
  const criadaAqui = useRef<number | null>(null);

  const carregarRelatorios = useCallback(async () => {
    const r = await fetch(`/api/gerentes/${gerente.id}/relatorios`);
    const j: Relatorio[] = r.ok ? await r.json() : [];
    setRelatorios(j);
    setDiaSel(s => (s && j.some(x => x.dia === s) ? s : j[0]?.dia || null));
  }, [gerente.id]);
  useEffect(() => { carregarRelatorios(); }, [carregarRelatorios]);

  // Troca de conversa (pela lista da esquerda)
  useEffect(() => {
    if (conversaId != null && conversaId === criadaAqui.current) return; // nasceu aqui: mensagens já estão na tela
    criadaAqui.current = null;
    setAba('conversa');
    if (!conversaId) { setMensagens([]); return; }
    setCarregando(true);
    fetch(`/api/gerentes/${gerente.id}/conversas/${conversaId}`)
      .then(r => (r.ok ? r.json() : []))
      .then(setMensagens)
      .finally(() => setCarregando(false));
  }, [conversaId, gerente.id]);

  useEffect(() => {
    const el = rolagem.current;
    if (el && mensagens.length) el.scrollTo({ top: el.scrollHeight, behavior: 'smooth' });
  }, [mensagens, enviando]);

  const enviar = async (msg?: string) => {
    const t = (msg ?? texto).trim();
    if (!t || enviando) return;
    setAba('conversa');
    setTexto('');
    setMensagens(m => [...m, { papel: 'usuario', texto: t }]);
    setEnviando(true);
    try {
      const r = await fetch(`/api/gerentes/${gerente.id}/chat`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mensagem: t, conversa_id: conversaId }),
      });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error || 'Erro');
      setMensagens(m => [...m, { papel: 'assistente', texto: j.resposta, ferramentas: j.ferramentas }]);
      if (j.conversa_id !== conversaId) { criadaAqui.current = j.conversa_id; aoCriarConversa(j.conversa_id); }
      if ((j.ferramentas || []).includes('propor_decisao')) aoMudarFila();
    } catch (e: any) {
      setMensagens(m => [...m, { papel: 'assistente', texto: e?.message || 'Não consegui responder agora.', erro: true }]);
    } finally {
      setEnviando(false);
      setTimeout(() => campo.current?.focus(), 0);
    }
  };

  const gerar = async () => {
    setGerando(true);
    try {
      const r = await fetch(`/api/gerentes/${gerente.id}/relatorios/gerar`, { method: 'POST' });
      const j = await r.json();
      if (!r.ok) throw new Error(j.error);
      await carregarRelatorios();
      setDiaSel(j.dia);
      aoMudarFila();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível gerar o relatório');
    } finally { setGerando(false); }
  };

  const doDia = relatorios?.find(r => r.dia === hojeLocal() && r.status === 'pronto') || null;
  const relSel = relatorios?.find(r => r.dia === diaSel) || null;
  const v = VISUAL[gerente.id];
  const vazia = mensagens.length === 0 && !carregando;

  return (
    <section className="gf-cartao flex flex-col h-[calc(100vh-150px)] min-h-[560px] 2xl:h-auto 2xl:min-h-0 overflow-hidden">
      {/* Cabeçalho */}
      <header className="flex items-center gap-3 px-6 pt-5 pb-4 border-b border-black/5 dark:border-white/[0.06] shrink-0">
        <Avatar id={gerente.id} tamanho={42} />
        <div className="min-w-0 flex-1">
          <p className="text-[16px] font-semibold text-dark-text leading-tight">{gerente.nome}</p>
          <p className="text-[12.5px] text-slate-400 truncate">{gerente.descricao}</p>
        </div>
        <Abas
          variante="segmentado"
          abas={[{ id: 'conversa', rotulo: 'Conversa' }, { id: 'relatorios', rotulo: 'Relatórios' }, { id: 'memoria', rotulo: 'Memória' }]}
          ativa={aba}
          onChange={id => setAba(id as typeof aba)}
        />
      </header>

      {/* Corpo */}
      <div ref={rolagem} className="flex-1 min-h-0 overflow-y-auto">
        <div className="max-w-[760px] mx-auto px-6 py-7">
          {aba === 'memoria' ? <Memoria gerente={gerente} /> : aba === 'relatorios' ? (
            !relatorios ? <CarregandoBloco /> : (
              <div className="space-y-5">
                <div className="flex items-center gap-2 flex-wrap">
                  {relatorios.slice(0, 7).map(r => (
                    <button key={r.dia} type="button" onClick={() => setDiaSel(r.dia)}
                      className={`h-8 px-3 rounded-full text-[12.5px] font-medium transition-colors ${diaSel === r.dia ? 'bg-violet-600 text-white' : 'text-slate-500 hover:text-dark-text bg-black/[0.04] dark:bg-white/[0.05]'}`}>
                      {r.dia === hojeLocal() ? 'Hoje' : ddmm(r.dia)}
                    </button>
                  ))}
                  <button type="button" onClick={gerar} disabled={gerando}
                    className="ml-auto h-8 px-3 rounded-full text-[12.5px] font-medium inline-flex items-center gap-1.5 text-slate-500 hover:text-violet-600 dark:hover:text-violet-300 disabled:opacity-50">
                    {gerando ? <Loader2 size={13} className="animate-spin" /> : <RotateCcw size={13} />}
                    {gerando ? 'Escrevendo…' : doDia ? 'Refazer o de hoje' : 'Gerar agora'}
                  </button>
                </div>
                {!relSel ? (
                  <EstadoVazio Icone={FileText} titulo="Ainda não há relatório" descricao="Todo dia às 7h sai um novo. Para ver agora, clique em Gerar agora (leva cerca de um minuto)." />
                ) : relSel.status === 'erro' ? <p className="text-sm text-rose-500">Falhou ao gerar: {relSel.erro}</p>
                  : relSel.status === 'gerando' ? <p className="text-sm text-slate-400 flex items-center gap-2"><Loader2 size={14} className="animate-spin" /> Escrevendo…</p>
                    : (
                      <>
                        <p className="text-[12px] text-slate-400">Escrito às {hora(relSel.concluido_em)} de {ddmm(relSel.dia)}</p>
                        <RelatorioVisual texto={relSel.texto || ''} />
                      </>
                    )}
              </div>
            )
          ) : carregando ? <CarregandoBloco /> : vazia ? (
            /* Conversa vazia: o resumo de hoje */
            doDia ? (
              <div>
                <p className="text-[12px] text-slate-400 mb-4 flex items-center gap-1.5">
                  <span className="w-1.5 h-1.5 rounded-full" style={{ background: v.cor }} />
                  Resumo de hoje · {hora(doDia.concluido_em)}
                </p>
                <RelatorioVisual texto={doDia.texto || ''} compacto />
              </div>
            ) : (
              <div className="pt-16 text-center">
                <div className="inline-flex"><Avatar id={gerente.id} tamanho={52} /></div>
                <p className="text-[20px] font-semibold text-dark-text mt-4">Em que posso ajudar?</p>
                <p className="text-[13.5px] text-slate-400 mt-1">O resumo de hoje sai às 7h. Enquanto isso, pergunte o que quiser.</p>
              </div>
            )
          ) : (
            <div className="space-y-7">
              <AnimatePresence initial={false}>
                {mensagens.map((m, idx) => (
                  <motion.div key={m.id ?? `n${idx}`} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.22 }}>
                    {m.papel === 'usuario' ? (
                      <div className="flex justify-end">
                        <div className="max-w-[85%] rounded-[20px] rounded-br-md px-4 py-2.5 bg-black/[0.05] dark:bg-white/[0.07] text-dark-text text-[14.5px] leading-relaxed whitespace-pre-wrap">{m.texto}</div>
                      </div>
                    ) : (
                      <div className="flex gap-3.5">
                        <Avatar id={gerente.id} tamanho={28} />
                        <div className="min-w-0 flex-1 pt-0.5">
                          {m.erro ? <p className="text-[14px] text-rose-500">{m.texto}</p> : <Markdown texto={m.texto} />}
                          {(m.ferramentas || []).includes('lembrar') && (
                            <button type="button" onClick={() => setAba('memoria')}
                              className="mt-3 inline-flex items-center gap-1.5 text-[11.5px] font-medium px-2 py-1 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300 hover:bg-violet-500/15">
                              <Brain size={12} /> Guardou na memória
                            </button>
                          )}
                          {!!m.ferramentas?.filter(f => f !== 'lembrar' && f !== 'esquecer').length && (
                            <p className="mt-2 text-[11.5px] text-slate-400 flex items-center gap-1.5">
                              <Wrench size={11} /> Consultou {[...new Set(m.ferramentas.filter(f => f !== 'lembrar' && f !== 'esquecer').map(f => NOME_FERRAMENTA[f] || f))].join(', ')}
                            </p>
                          )}
                        </div>
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              {enviando && (
                <div className="flex gap-3.5 items-center">
                  <Avatar id={gerente.id} tamanho={28} />
                  <span className="flex gap-1">
                    {[0, 1, 2].map(k => (
                      <motion.span key={k} className="w-1.5 h-1.5 rounded-full" style={{ background: v.cor }}
                        animate={{ opacity: [0.25, 1, 0.25] }} transition={{ duration: 1, repeat: Infinity, delay: k * 0.18 }} />
                    ))}
                  </span>
                  <span className="text-[12.5px] text-slate-400">consultando o sistema</span>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Caixa de texto */}
      <div className="shrink-0 px-6 pb-5 pt-3 border-t border-black/5 dark:border-white/[0.04]">
        <div className="max-w-[760px] mx-auto">
          {vazia && aba === 'conversa' && (
            <div className="flex flex-wrap gap-2 mb-3">
              {SUGESTOES[gerente.id].map(s => (
                <button key={s} type="button" onClick={() => enviar(s)}
                  className="text-[12.5px] px-3 py-1.5 rounded-full bg-black/[0.04] dark:bg-white/[0.05] text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-300 hover:bg-violet-500/10 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
          <div className="flex items-end gap-2 rounded-[22px] bg-black/[0.035] dark:bg-white/[0.05] ring-1 ring-black/5 dark:ring-white/[0.08] focus-within:ring-violet-500/50 pl-5 pr-2 py-2 transition-shadow">
            <textarea
              ref={campo}
              value={texto}
              onChange={e => setTexto(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); enviar(); } }}
              placeholder={`Pergunte ao ${gerente.nome}…`}
              rows={1}
              className="flex-1 resize-none bg-transparent outline-none text-[14.5px] text-dark-text placeholder:text-slate-400 max-h-40 py-2"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
            <button type="button" onClick={() => enviar()} disabled={!texto.trim() || enviando} title="Enviar (Enter)"
              className="w-9 h-9 rounded-full bg-violet-600 hover:bg-violet-700 text-white flex items-center justify-center shrink-0 disabled:opacity-30 transition-all">
              <ArrowUp size={17} strokeWidth={2.4} />
            </button>
          </div>
          {conversaId != null && mensagens.length > 0 && (
            <button type="button" onClick={aoNovaConversa} className="mt-2 text-[12px] text-slate-400 hover:text-violet-500 inline-flex items-center gap-1">
              <Plus size={12} /> Nova conversa
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

// ── Memória do gerente ─────────────────────────────────────────────────────────
type Anotacao = { id: number; gerente: GerenteId; texto: string; tipo: string | null; origem: string; criado_por: string | null; criado_em: string };
const ROTULO_ORIGEM: Record<string, string> = { conversa: 'anotou na conversa', manual: 'escrita à mão', decisao: 'decisão na fila' };

function Memoria({ gerente }: { gerente: Gerente }) {
  const [itens, setItens] = useState<Anotacao[] | null>(null);
  const [nova, setNova] = useState('');
  const [salvando, setSalvando] = useState(false);

  const carregar = useCallback(async () => {
    const r = await fetch(`/api/gerentes/${gerente.id}/memoria`);
    setItens(r.ok ? await r.json() : []);
  }, [gerente.id]);
  useEffect(() => { carregar(); }, [carregar]);

  const adicionar = async () => {
    const t = nova.trim();
    if (!t) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/gerentes/${gerente.id}/memoria`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ texto: t }) });
      if (!r.ok) throw new Error((await r.json()).error);
      setNova('');
      carregar();
    } catch (e: any) { toast.error(e?.message || 'Não foi possível salvar'); } finally { setSalvando(false); }
  };

  const apagar = async (a: Anotacao) => {
    if (!(await confirmDialog({ title: 'Apagar da memória?', message: `O gerente deixa de considerar: "${a.texto.slice(0, 140)}"`, confirmText: 'Apagar', danger: true }))) return;
    await fetch(`/api/gerentes/${gerente.id}/memoria/${a.id}`, { method: 'DELETE' });
    carregar();
  };

  return (
    <div className="space-y-5">
      <div>
        <p className="text-[15px] font-semibold text-dark-text">O que o {gerente.nome} sabe</p>
        <p className="text-[13px] text-slate-400 mt-0.5">
          Vale em toda conversa e todo relatório. Ele anota sozinho quando você conta algo que deve valer depois; você também pode escrever aqui.
          {gerente.id === 'assistente' && ' O CEO vê a memória de todos os gerentes.'}
        </p>
      </div>
      <div className="flex gap-2">
        <input value={nova} onChange={e => setNova(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') adicionar(); }}
          placeholder="Ex.: o pró-labore passou para o dia 5"
          className="flex-1 h-10 rounded-xl px-3.5 text-[14px] bg-black/[0.035] dark:bg-white/[0.05] ring-1 ring-black/5 dark:ring-white/[0.08] focus:ring-violet-500/50 outline-none text-dark-text placeholder:text-slate-400" />
        <button type="button" onClick={adicionar} disabled={!nova.trim() || salvando}
          className="h-10 px-4 rounded-xl bg-violet-600 hover:bg-violet-700 text-white text-sm font-semibold disabled:opacity-40 inline-flex items-center gap-1.5">
          <Plus size={15} /> Anotar
        </button>
      </div>
      {!itens ? <CarregandoBloco /> : itens.length === 0 ? (
        <EstadoVazio Icone={Brain} titulo="Memória vazia" descricao='Conte algo na conversa ("lembra que…") ou escreva acima.' />
      ) : (
        <ul className="space-y-1">
          {itens.map(a => (
            <li key={a.id} className="group flex items-start gap-3 rounded-xl px-3 py-2.5 hover:bg-black/[0.025] dark:hover:bg-white/[0.03]">
              <Brain size={14} className="mt-1 shrink-0" style={{ color: VISUAL[a.gerente]?.cor || '#8b5cf6' }} />
              <div className="min-w-0 flex-1">
                <p className="text-[14px] text-slate-700 dark:text-slate-200 leading-relaxed">{a.texto}</p>
                <p className="text-[11.5px] text-slate-400 mt-0.5">
                  {ddmm(String(a.criado_em).slice(0, 10))} · {ROTULO_ORIGEM[a.origem] || a.origem}
                  {a.criado_por && a.criado_por !== 'rotina' ? ` · ${a.criado_por.split('@')[0]}` : ''}
                  {gerente.id === 'assistente' && a.gerente !== 'assistente' ? ` · ${VISUAL[a.gerente]?.curto || a.gerente}` : ''}
                </p>
              </div>
              <button type="button" title="Apagar" onClick={() => apagar(a)} className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-rose-500 transition-opacity">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

// ── Direita: Para decidir + tarefas ────────────────────────────────────────────
// Aprovar ("Vou fazer") transforma o item em tarefa desta página: responsável e prazo.
// Os gerentes acompanham as tarefas em andamento nos relatórios das 7h.
type Pessoa = { email: string; name: string; picture?: string | null };
const prazoPadrao = (urg: string) => {
  const d = new Date();
  d.setDate(d.getDate() + (urg === 'alta' ? 2 : urg === 'media' ? 7 : 14));
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
};

function ParaDecidir({ decisoes, aoMudar }: { decisoes: Decisao[]; aoMudar: () => void }) {
  const [aba, setAba] = useState<'decidir' | 'andamento' | 'feitos'>('decidir');
  const [aberto, setAberto] = useState<number | null>(null);
  const [aprovando, setAprovando] = useState<number | null>(null);
  const [form, setForm] = useState<{ responsavel: string; prazo: string }>({ responsavel: '', prazo: '' });
  const [ocupado, setOcupado] = useState<number | null>(null);
  const [pessoas, setPessoas] = useState<Pessoa[]>([]);
  const [eu, setEu] = useState('');

  useEffect(() => {
    fetch('/api/users').then(r => (r.ok ? r.json() : [])).then((l: any[]) =>
      setPessoas(l.filter(p => p.email && p.name).map(p => ({ email: String(p.email).toLowerCase(), name: p.name, picture: p.picture }))
        .sort((a, b) => a.name.localeCompare(b.name)))).catch(() => {});
    setEu(String(auth.currentUser?.email || '').toLowerCase());
  }, []);

  const pendentes = useMemo(() => decisoes.filter(d => d.status === 'pendente'), [decisoes]);
  const andamento = useMemo(() => decisoes.filter(d => d.status === 'aprovado')
    .sort((a, b) => String(a.prazo || '9').localeCompare(String(b.prazo || '9'))), [decisoes]);
  const feitos = useMemo(() => decisoes.filter(d => d.status === 'feito' || d.status === 'descartado'), [decisoes]);
  const lista = aba === 'decidir' ? pendentes : aba === 'andamento' ? andamento : feitos;
  const atrasadas = andamento.filter(d => d.prazo && d.prazo < hojeLocal()).length;

  const salvar = async (d: Decisao, corpo: Record<string, any>, aviso: string) => {
    setOcupado(d.id);
    try {
      const r = await fetch(`/api/gerentes-decisoes/${d.id}`, {
        method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(corpo),
      });
      if (!r.ok) throw new Error((await r.json()).error);
      toast.success(aviso);
      setAprovando(null);
      aoMudar();
    } catch (e: any) {
      toast.error(e?.message || 'Não foi possível salvar');
    } finally { setOcupado(null); }
  };

  const abrirAprovacao = (d: Decisao) => {
    setAprovando(d.id);
    setAberto(d.id);
    setForm({ responsavel: eu || pessoas[0]?.email || '', prazo: prazoPadrao(d.urgencia) });
  };

  const descartar = async (d: Decisao) => {
    const r = await promptDialog({
      title: 'Descartar',
      message: 'Por quê? (opcional) O gerente guarda na memória e não volta a sugerir a mesma coisa pelo mesmo motivo.',
      placeholder: 'Ex.: o JEAN PRESO é criativo de alcance, não de lead',
      confirmText: 'Descartar',
    });
    if (r === null) return;
    salvar(d, { status: 'descartado', observacao: r.trim() || null }, 'Descartado');
  };

  const nomeDe = (email?: string | null, nome?: string | null) =>
    (nome || pessoas.find(p => p.email === String(email || '').toLowerCase())?.name || String(email || '').split('@')[0] || '').split(' ')[0];
  const fotoDe = (email?: string | null) => pessoas.find(p => p.email === String(email || '').toLowerCase())?.picture;

  const botao = 'h-7 px-2.5 rounded-lg text-[12px] font-semibold inline-flex items-center gap-1 transition-colors disabled:opacity-50';
  const fantasma = `${botao} text-slate-500 hover:text-dark-text hover:bg-black/[0.05] dark:hover:bg-white/[0.06]`;

  return (
    <section className="gf-cartao flex flex-col h-full min-h-[320px] overflow-hidden">
      <header className="px-4 pt-4 pb-3 shrink-0">
        <div className="flex items-center gap-1 p-1 rounded-xl bg-black/[0.04] dark:bg-white/[0.04]">
          {([
            ['decidir', 'Decidir', pendentes.length, true],
            ['andamento', 'Em andamento', andamento.length, atrasadas > 0],
            ['feitos', 'Feitos', 0, false],
          ] as const).map(([id, rotulo, qtd, alerta]) => (
            <button key={id} type="button" onClick={() => { setAba(id); setAprovando(null); }}
              className={`flex-1 h-8 rounded-lg text-[12.5px] font-semibold inline-flex items-center justify-center gap-1.5 transition-colors ${aba === id ? 'bg-white dark:bg-white/10 text-dark-text shadow-sm' : 'text-slate-400 hover:text-dark-text'}`}>
              {rotulo}
              {qtd > 0 && <span className={`text-[10.5px] font-bold min-w-[18px] h-[18px] px-1 rounded-full inline-flex items-center justify-center ${alerta ? 'bg-rose-500 text-white' : 'bg-black/10 dark:bg-white/10'}`}>{qtd}</span>}
            </button>
          ))}
        </div>
        {aba === 'andamento' && atrasadas > 0 && <p className="text-[11.5px] text-rose-500 mt-2 px-1">{atrasadas} com prazo vencido</p>}
      </header>

      <div className="flex-1 min-h-0 overflow-y-auto px-3 pb-3 space-y-1.5">
        {lista.length === 0 ? (
          <EstadoVazio Icone={CheckCircle2}
            titulo={aba === 'decidir' ? 'Nada esperando você' : aba === 'andamento' ? 'Nenhuma tarefa em andamento' : 'Nada concluído nos últimos 30 dias'}
            descricao={aba === 'decidir' ? 'Os gerentes trazem para cá o que precisa da sua decisão.' : aba === 'andamento' ? 'O que você aprovar vira tarefa aqui, com responsável e prazo.' : undefined} />
        ) : lista.map(d => {
          const v = VISUAL[d.gerente] || VISUAL.assistente;
          const u = URGENCIA[d.urgencia] || URGENCIA.media;
          const exp = aberto === d.id;
          const atrasada = d.status === 'aprovado' && !!d.prazo && d.prazo < hojeLocal();
          return (
            <div key={d.id} className={`rounded-2xl px-3.5 py-3 transition-colors ${exp ? 'bg-black/[0.035] dark:bg-white/[0.05]' : 'hover:bg-black/[0.025] dark:hover:bg-white/[0.03]'}`}>
              <div className="flex items-start gap-2.5">
                {d.status === 'aprovado' && (
                  <button type="button" title="Marcar como feito" disabled={ocupado === d.id}
                    onClick={() => salvar(d, { status: 'feito' }, 'Feito')}
                    className="mt-0.5 w-[18px] h-[18px] rounded-md border-2 border-slate-300 dark:border-white/25 hover:border-emerald-500 hover:bg-emerald-500/10 shrink-0 transition-colors" />
                )}
                {d.status === 'feito' && (
                  <span className="mt-0.5 w-[18px] h-[18px] rounded-md bg-emerald-500 text-white flex items-center justify-center shrink-0"><Check size={12} strokeWidth={3} /></span>
                )}
                <button type="button" className="w-full text-left min-w-0" onClick={() => setAberto(exp ? null : d.id)}>
                  <div className="flex items-center gap-2 text-[11.5px]">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: v.cor }} />
                    <span className="text-slate-400 truncate">{v.curto} · {ddmm(String(d.criado_em).slice(0, 10))}</span>
                    {d.status === 'pendente' && <span className="ml-auto font-semibold shrink-0" style={{ color: u.cor }}>{u.rotulo}</span>}
                    {d.status === 'descartado' && <span className="ml-auto font-semibold text-slate-400 shrink-0">Descartado</span>}
                    {d.status === 'feito' && <span className="ml-auto font-semibold text-emerald-500 shrink-0">Feito {ddmm(String(d.concluido_em || '').slice(0, 10))}</span>}
                  </div>
                  <p className={`mt-1.5 text-[13.5px] font-medium leading-snug flex gap-1.5 ${d.status === 'feito' || d.status === 'descartado' ? 'text-slate-400 line-through decoration-slate-400/50' : 'text-dark-text'}`}>
                    <span className="flex-1">{d.titulo}</span>
                    <ChevronDown size={14} className={`shrink-0 mt-0.5 text-slate-400 transition-transform ${exp ? 'rotate-180' : ''}`} />
                  </p>
                  {d.status === 'aprovado' && (
                    <span className="mt-2 flex items-center gap-2 text-[11.5px]">
                      {fotoDe(d.responsavel)
                        ? <img src={fotoDe(d.responsavel)!} alt="" className="w-4 h-4 rounded-full object-cover" referrerPolicy="no-referrer" />
                        : <span className="w-4 h-4 rounded-full bg-violet-500/20 text-violet-500 text-[9px] font-bold flex items-center justify-center">{nomeDe(d.responsavel, d.responsavel_nome).slice(0, 1)}</span>}
                      <span className="text-slate-500 dark:text-slate-400">{nomeDe(d.responsavel, d.responsavel_nome)}</span>
                      {d.prazo && <span className={`ml-auto font-semibold ${atrasada ? 'text-rose-500' : 'text-slate-400'}`}>{atrasada ? 'venceu ' : 'até '}{ddmm(d.prazo)}</span>}
                    </span>
                  )}
                </button>
              </div>

              <AnimatePresence initial={false}>
                {exp && (
                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2 }} className="overflow-hidden">
                    <div className="pt-2.5 space-y-2.5 text-[12.5px] leading-relaxed">
                      {d.contexto && <p className="text-slate-500 dark:text-slate-400">{d.contexto}</p>}
                      {d.recomendacao && <p className="text-slate-700 dark:text-slate-300"><span className="font-semibold text-violet-600 dark:text-violet-300">Recomendação: </span>{d.recomendacao}</p>}
                      {d.observacao && <p className="text-slate-400 italic">"{d.observacao}"</p>}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Aprovar: escolher responsável e prazo */}
              {aprovando === d.id ? (
                <div className="mt-3 space-y-2">
                  <div className="grid grid-cols-[1fr_auto] gap-2">
                    <select value={form.responsavel} onChange={e => setForm(f => ({ ...f, responsavel: e.target.value }))}
                      className="h-8 rounded-lg px-2 text-[12.5px] bg-white dark:bg-white/[0.06] ring-1 ring-black/10 dark:ring-white/10 text-dark-text outline-none min-w-0">
                      {pessoas.map(p => <option key={p.email} value={p.email}>{p.name}</option>)}
                    </select>
                    <input type="date" value={form.prazo} onChange={e => setForm(f => ({ ...f, prazo: e.target.value }))}
                      className="h-8 rounded-lg px-2 text-[12.5px] bg-white dark:bg-white/[0.06] ring-1 ring-black/10 dark:ring-white/10 text-dark-text outline-none [color-scheme:light] dark:[color-scheme:dark]" />
                  </div>
                  <div className="flex items-center gap-1.5">
                    <button type="button" disabled={ocupado === d.id || !form.responsavel}
                      onClick={() => salvar(d, { status: 'aprovado', responsavel: form.responsavel, prazo: form.prazo }, 'Virou tarefa em andamento')}
                      className={`${botao} bg-violet-600 hover:bg-violet-700 text-white`}>
                      <Check size={13} strokeWidth={2.6} /> Criar tarefa
                    </button>
                    <button type="button" onClick={() => setAprovando(null)} className={fantasma}>Cancelar</button>
                  </div>
                </div>
              ) : (
                <div className={`flex items-center gap-1.5 mt-2.5 ${d.status === 'aprovado' ? 'pl-7' : ''}`}>
                  {d.status === 'pendente' && (
                    <>
                      <button type="button" disabled={ocupado === d.id} onClick={() => abrirAprovacao(d)} className={`${botao} bg-violet-600 hover:bg-violet-700 text-white`}>
                        <Check size={13} strokeWidth={2.6} /> Vou fazer
                      </button>
                      <button type="button" disabled={ocupado === d.id} onClick={() => descartar(d)} className={fantasma}>
                        <X size={13} strokeWidth={2.6} /> Descartar
                      </button>
                    </>
                  )}
                  {d.status === 'aprovado' && exp && (
                    <>
                      <button type="button" onClick={() => { setAprovando(d.id); setForm({ responsavel: d.responsavel || eu, prazo: d.prazo || prazoPadrao(d.urgencia) }); }} className={fantasma}>
                        Trocar responsável/prazo
                      </button>
                      <button type="button" disabled={ocupado === d.id} onClick={() => salvar(d, { status: 'pendente' }, 'Voltou para decidir')} className={fantasma}>
                        <RotateCcw size={12} /> Desfazer
                      </button>
                    </>
                  )}
                  {(d.status === 'feito' || d.status === 'descartado') && exp && (
                    <button type="button" disabled={ocupado === d.id}
                      onClick={() => salvar(d, { status: d.status === 'feito' ? 'aprovado' : 'pendente' }, d.status === 'feito' ? 'Reaberta' : 'Voltou para decidir')} className={fantasma}>
                      <RotateCcw size={12} /> {d.status === 'feito' ? 'Reabrir' : 'Voltar para decidir'}
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </section>
  );
}
