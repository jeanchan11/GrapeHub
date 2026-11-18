// Comercial › Leads — todos os negócios do CRM comercial, com filtros e detalhe.
// Redesenho de 18/11/2026 (o original está no histórico do git). Mesmas chamadas de API:
// GET /api/crm-comercial/leads-list e /kanbans aqui; lead-history e notes no detalhe
// (src/components/leads/LeadDetalhe.tsx). Filtro, ordenação, indicadores e paginação são
// feitos no navegador sobre a lista inteira (508 leads em 18/11/2026).
import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { Search, Download, Users, X, ArrowUp, ArrowDown, Columns3, Check, FilterX } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { auth } from '../firebase';
import { EstadoVazio } from '../components/ui/EstadoVazio';
import { CarregandoBloco } from '../components/LoadingSpinner';
import { Abas } from '../components/ui/Abas';
import DateRangePicker, { type DateRange } from '../components/ui/DateRangePicker';
import ThemedDropdown from '../components/ui/ThemedDropdown';
import { Cartao } from '../components/graficos';
import { designSystem } from '../design-system';
import LeadDetalhe from '../components/leads/LeadDetalhe';
import {
  type Lead, type Kanban, type LeadStatus, getLeadStatus, STATUS, brl, valorNum, formatPhone,
  diaLocal, timeAgo, formatData, fmtBR, tagNome, tagCor, corAvatar, inicial, primeiroNome,
} from '../components/leads/leadsUtil';

// ── Filtros ──────────────────────────────────────────────
type StatusFilter = 'todos' | 'ativos' | 'ganhos' | 'perdidos';
interface Filtros { busca: string; kanban: string; status: StatusFilter; range: DateRange }

function defaultDateRange(): DateRange {
  const hoje = new Date();
  const y = hoje.getFullYear(), m = hoje.getMonth() + 1;
  const ultimo = new Date(y, m, 0).getDate();
  return { start: `${y}-${String(m).padStart(2, '0')}-01`, end: `${y}-${String(m).padStart(2, '0')}-${String(ultimo).padStart(2, '0')}` };
}

/**
 * Mesma regra da tela antiga. Período: Ganhos e Perdidos contam pela data em que o lead mudou
 * de etapa (`etapa_updated_at`); Todos e Em aberto, pela data de criação. Lead sem data passa.
 * Diferença: o dia agora é o local (BRT), não o do ISO em UTC — lead criado depois das 21h
 * contava no dia seguinte.
 */
function aplicarFiltros(leads: Lead[], f: Filtros): Lead[] {
  const s = f.busca.trim().toLowerCase();
  return leads.filter(l => {
    if (s && !((l.nome && l.nome.toLowerCase().includes(s)) || (l.telefone && l.telefone.toLowerCase().includes(s)) || (l.email && l.email.toLowerCase().includes(s)))) return false;
    if (f.kanban && l.kanban_name !== f.kanban) return false;
    const st = getLeadStatus(l);
    if (f.status === 'ativos' && st !== 'aberto') return false;
    if (f.status === 'ganhos' && st !== 'ganho') return false;
    if (f.status === 'perdidos' && st !== 'perdido') return false;
    if (f.range.start && f.range.end) {
      const usaDataStatus = (f.status === 'ganhos' || f.status === 'perdidos') && l.etapa_updated_at;
      const ref = usaDataStatus ? l.etapa_updated_at! : l.created_at;
      if (ref) {
        const dia = diaLocal(ref);
        if (dia < f.range.start || dia > f.range.end) return false;
      }
    }
    return true;
  });
}

// ── Ordenação ────────────────────────────────────────────
type CampoOrdem = 'nome' | 'origem' | 'etapa' | 'status' | 'responsavel' | 'valor' | 'criado' | 'mudou';
const ORDEM_STATUS: Record<LeadStatus, number> = { aberto: 0, ganho: 1, perdido: 2 };

function chaveOrdem(l: Lead, c: CampoOrdem): string | number | null {
  switch (c) {
    case 'nome': return (l.nome || '').trim() || null;
    case 'origem': return (l.origem || '').trim() || null;
    case 'etapa': return l.coluna_nome || null;
    case 'status': return ORDEM_STATUS[getLeadStatus(l)];
    case 'responsavel': return l.responsavel_name || null;
    case 'valor': return valorNum(l.valor);
    case 'criado': return l.created_at ? new Date(l.created_at).getTime() : null;
    case 'mudou': return l.etapa_updated_at ? new Date(l.etapa_updated_at).getTime() : null;
  }
}

function ordenar(lista: Lead[], campo: CampoOrdem, dir: 'asc' | 'desc'): Lead[] {
  const sinal = dir === 'asc' ? 1 : -1;
  return [...lista].sort((a, b) => {
    const va = chaveOrdem(a, campo), vb = chaveOrdem(b, campo);
    if (va == null && vb == null) return 0;
    if (va == null) return 1; // vazio sempre no fim
    if (vb == null) return -1;
    if (typeof va === 'number' && typeof vb === 'number') return (va - vb) * sinal;
    return String(va).localeCompare(String(vb), 'pt-BR', { sensitivity: 'base' }) * sinal;
  });
}

// ── Colunas opcionais (preferência de quem vê, no navegador) ─
type ColunaExtra = 'tags' | 'mudou';
const COLUNAS_EXTRAS: { id: ColunaExtra; rotulo: string }[] = [
  { id: 'tags', rotulo: 'Tags' },
  { id: 'mudou', rotulo: 'Mudou de etapa' },
];
const CHAVE_COLUNAS = 'crmLeads.colunasExtras';
function lerColunas(): Record<ColunaExtra, boolean> {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE_COLUNAS) || '{}');
    return { tags: !!v.tags, mudou: !!v.mudou };
  } catch { return { tags: false, mudou: false }; }
}

const POR_PAGINA = 50;

// ── Peças ────────────────────────────────────────────────
function Indicador({ rotulo, valor, apoio, cor }: { rotulo: string; valor: React.ReactNode; apoio?: string; cor?: string }) {
  return (
    <div className="px-5 py-4 min-w-0" title={apoio}>
      <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{rotulo}</p>
      <p className={`numero mt-1 text-[24px] leading-none ${cor || 'text-dark-text'}`}>{valor}</p>
    </div>
  );
}

function SeletorColunas({ valor, onChange }: { valor: Record<ColunaExtra, boolean>; onChange: (v: Record<ColunaExtra, boolean>) => void }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!aberto) return;
    const fora = (e: MouseEvent) => { if (ref.current && !ref.current.contains(e.target as Node)) setAberto(false); };
    document.addEventListener('mousedown', fora);
    return () => document.removeEventListener('mousedown', fora);
  }, [aberto]);
  const n = COLUNAS_EXTRAS.filter(c => valor[c.id]).length;
  return (
    <div ref={ref} className="relative">
      <button type="button" onClick={() => setAberto(a => !a)} className={designSystem.button.secundario} title="Colunas visíveis">
        <Columns3 size={14} />
        <span className="hidden sm:inline">Colunas</span>
        {n > 0 && <span className="numero text-[11px] text-violet-600 dark:text-violet-400">+{n}</span>}
      </button>
      {aberto && (
        <div className="absolute right-0 top-full mt-2 z-30 w-56 rounded-xl bg-dark-card border border-black/10 dark:border-white/10 shadow-2xl py-1.5">
          <p className="px-3 pt-1 pb-2 text-[11px] text-slate-500 dark:text-slate-400">Colunas extras na tabela</p>
          {COLUNAS_EXTRAS.map(c => (
            <button
              key={c.id}
              type="button"
              onClick={() => onChange({ ...valor, [c.id]: !valor[c.id] })}
              className="w-full flex items-center gap-2.5 px-3 py-2 text-[13px] text-dark-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              <span className={`w-4 h-4 rounded border flex items-center justify-center shrink-0 ${valor[c.id] ? 'bg-violet-600 border-violet-600' : 'border-black/20 dark:border-white/20'}`}>
                {valor[c.id] && <Check size={11} className="text-white" />}
              </span>
              {c.rotulo}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ── Página ───────────────────────────────────────────────
export default function CrmLeads() {
  const { user } = useAuth();
  const [leads, setLeads] = useState<Lead[]>([]);
  const [kanbans, setKanbans] = useState<Kanban[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [kanbanFilter, setKanbanFilter] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('todos');
  const [selectedLead, setSelectedLead] = useState<Lead | null>(null);
  const [dateRange, setDateRange] = useState<DateRange>(defaultDateRange);
  const [ordem, setOrdem] = useState<{ campo: CampoOrdem; dir: 'asc' | 'desc' }>({ campo: 'criado', dir: 'desc' });
  const [limite, setLimite] = useState(POR_PAGINA);
  const [colunas, setColunas] = useState<Record<ColunaExtra, boolean>>(lerColunas);

  const getToken = useCallback(async (): Promise<string | null> => {
    try {
      return (await auth.currentUser?.getIdToken()) ?? null;
    } catch {
      return null;
    }
  }, []);

  const fetchLeads = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      setLoading(true);
      const res = await fetch('/api/crm-comercial/leads-list', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const data: Lead[] = await res.json();
        setLeads(data);
      }
    } catch (err) {
      console.error('Falha ao buscar leads', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchKanbans = async () => {
    const token = await getToken();
    if (!token) return;
    try {
      const res = await fetch('/api/crm-comercial/kanbans', {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setKanbans(await res.json());
      }
    } catch (err) {
      console.error('Falha ao buscar kanbans', err);
    }
  };

  useEffect(() => {
    fetchLeads();
    fetchKanbans();
  }, [user]);

  const mudarColunas = (v: Record<ColunaExtra, boolean>) => {
    setColunas(v);
    try { localStorage.setItem(CHAVE_COLUNAS, JSON.stringify(v)); } catch { /* sem armazenamento: vale só nesta visita */ }
  };

  // ---------- Filtros, contadores e indicadores ----------
  const filtros: Filtros = { busca: searchQuery, kanban: kanbanFilter, status: statusFilter, range: dateRange };
  const filteredLeads = useMemo(() => aplicarFiltros(leads, filtros), [leads, searchQuery, kanbanFilter, statusFilter, dateRange]);

  // Cada status contado com a própria regra de data — o número da aba é o que ela mostra ao clicar.
  const contagem = useMemo(() => {
    const n = (status: StatusFilter) => aplicarFiltros(leads, { ...filtros, status }).length;
    return { todos: n('todos'), ativos: n('ativos'), ganhos: n('ganhos'), perdidos: n('perdidos') };
  }, [leads, searchQuery, kanbanFilter, dateRange]);
  const decididos = contagem.ganhos + contagem.perdidos;
  const conversao = decididos > 0 ? `${((contagem.ganhos / decididos) * 100).toFixed(1).replace('.', ',')}%` : '—';

  const padrao = defaultDateRange();
  const periodoMudou = dateRange.start !== padrao.start || dateRange.end !== padrao.end;
  const temFiltro = !!searchQuery.trim() || !!kanbanFilter || statusFilter !== 'todos' || periodoMudou;
  const limparFiltros = () => { setSearchQuery(''); setKanbanFilter(''); setStatusFilter('todos'); setDateRange(defaultDateRange()); };

  const ordenados = useMemo(() => ordenar(filteredLeads, ordem.campo, ordem.dir), [filteredLeads, ordem]);
  useEffect(() => { setLimite(POR_PAGINA); }, [searchQuery, kanbanFilter, statusFilter, dateRange, ordem]);
  const visiveis = ordenados.slice(0, limite);

  const clicarCabecalho = (campo: CampoOrdem) => {
    setOrdem(o => o.campo === campo
      ? { campo, dir: o.dir === 'asc' ? 'desc' : 'asc' }
      : { campo, dir: campo === 'valor' || campo === 'criado' || campo === 'mudou' ? 'desc' : 'asc' });
  };

  const rotuloPeriodo = dateRange.start && dateRange.end
    ? (dateRange.start === dateRange.end ? fmtBR(dateRange.start) : `${fmtBR(dateRange.start)} a ${fmtBR(dateRange.end)}`)
    : 'todo o período';

  // Vazio: quanto cada filtro esconde (quantos leads apareceriam sem ele)
  const diagnostico = useMemo(() => {
    if (loading || filteredLeads.length > 0 || leads.length === 0) return [];
    const itens: { rotulo: string; sem: number; limpar: () => void }[] = [];
    const statusRot: Record<StatusFilter, string> = { todos: 'Todos', ativos: 'Em aberto', ganhos: 'Ganhos', perdidos: 'Perdidos' };
    if (searchQuery.trim()) itens.push({ rotulo: `Busca “${searchQuery.trim()}”`, sem: aplicarFiltros(leads, { ...filtros, busca: '' }).length, limpar: () => setSearchQuery('') });
    if (kanbanFilter) itens.push({ rotulo: `Pipeline ${kanbanFilter}`, sem: aplicarFiltros(leads, { ...filtros, kanban: '' }).length, limpar: () => setKanbanFilter('') });
    if (statusFilter !== 'todos') itens.push({ rotulo: `Status ${statusRot[statusFilter]}`, sem: aplicarFiltros(leads, { ...filtros, status: 'todos' }).length, limpar: () => setStatusFilter('todos') });
    if (dateRange.start && dateRange.end) itens.push({ rotulo: `Período ${rotuloPeriodo}`, sem: aplicarFiltros(leads, { ...filtros, range: { start: '', end: '' } }).length, limpar: () => setDateRange({ start: '', end: '' }) });
    return itens;
  }, [loading, filteredLeads, leads, searchQuery, kanbanFilter, statusFilter, dateRange]);

  // ---------- CSV Export (mesmo conteúdo de antes: a lista filtrada, 12 colunas) ----------
  const handleExportCSV = () => {
    const headers = [
      'Nome', 'Telefone', 'Email', 'Origem', 'Valor', 'Etapa', 'Status',
      'Responsável', 'Tags', 'Kanban', 'Criado em', 'Mudou status',
    ];
    const statusCsv: Record<LeadStatus, string> = { aberto: 'Aberto', ganho: 'Ganho', perdido: 'Perdido' };
    const rows = filteredLeads.map((l) => [
      `"${l.nome || ''}"`,
      `"${l.telefone || ''}"`,
      `"${l.email || ''}"`,
      `"${l.origem || ''}"`,
      `"${l.valor ?? ''}"`,
      `"${l.coluna_nome || ''}"`,
      `"${statusCsv[getLeadStatus(l)]}"`,
      `"${l.responsavel_name || ''}"`,
      `"${(l.tags || []).map(t => tagNome(t)).join(', ')}"`,
      `"${l.kanban_name || ''}"`,
      `"${l.created_at || ''}"`,
      `"${l.etapa_updated_at || ''}"`,
    ]);

    const csvContent =
      'data:text/csv;charset=utf-8,' +
      [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const link = document.createElement('a');
    link.setAttribute('href', encodeURI(csvContent));
    link.setAttribute('download', `Leads_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Cabeçalho de coluna (função, não componente: não remonta a cada render)
  const th = (rotulo: string, campo?: CampoOrdem, { direita = false, className = '' } = {}) => {
    const ativo = campo && ordem.campo === campo;
    return (
      <th key={rotulo} className={`px-4 py-3 font-medium text-[12px] text-slate-500 dark:text-slate-400 ${direita ? 'text-right' : 'text-left'} ${className}`}>
        {campo ? (
          <button
            type="button"
            onClick={() => clicarCabecalho(campo)}
            className={`inline-flex items-center gap-1 hover:text-dark-text transition-colors ${ativo ? 'text-dark-text' : ''} ${direita ? 'flex-row-reverse' : ''}`}
            title="Ordenar"
          >
            {rotulo}
            {ativo
              ? (ordem.dir === 'asc' ? <ArrowUp size={12} className="text-violet-500" /> : <ArrowDown size={12} className="text-violet-500" />)
              : <ArrowDown size={12} className="opacity-0" />}
          </button>
        ) : rotulo}
      </th>
    );
  };

  return (
    <div className="min-h-full w-full bg-dark-bg text-dark-text overflow-y-auto px-6 md:px-8 pt-8 pb-10 space-y-5">

      {/* ── Cabeçalho ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <SplitHeadline text="" highlight="Leads" />
          <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500 dark:text-slate-400 mt-0.5">
            Todos os negócios do comercial
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SeletorColunas valor={colunas} onChange={mudarColunas} />
          <button onClick={handleExportCSV} className={designSystem.button.secundario} title="Exporta a lista filtrada em CSV">
            <Download size={14} />
            <span className="hidden sm:inline">Exportar</span>
          </button>
        </div>
      </div>

      {/* ── Indicadores (da lista já carregada, com busca e pipeline aplicados) ── */}
      <Cartao semPadding>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 lg:divide-x divide-black/5 dark:divide-white/5">
          <Indicador rotulo="Leads no período" valor={loading ? '—' : contagem.todos} apoio="Criados no período" />
          <Indicador rotulo="Em aberto" valor={loading ? '—' : contagem.ativos} apoio="Criados no período e ainda em aberto" />
          <Indicador rotulo="Ganhos" valor={loading ? '—' : contagem.ganhos} cor="text-emerald-600 dark:text-emerald-400" apoio="Pela data em que mudaram de etapa" />
          <Indicador rotulo="Perdidos" valor={loading ? '—' : contagem.perdidos} cor="text-rose-600 dark:text-rose-400" apoio="Pela data em que mudaram de etapa" />
          <Indicador rotulo="Conversão" valor={loading ? '—' : conversao} apoio="Ganhos ÷ (ganhos + perdidos) do período" />
        </div>
      </Cartao>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[220px] max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Buscar por nome, telefone ou e-mail"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full h-10 pl-9 pr-8 text-sm rounded-xl bg-dark-card text-dark-text border border-black/10 dark:border-white/10 outline-none focus:border-violet-500/50 transition-colors placeholder:text-slate-400"
          />
          {searchQuery && (
            <button type="button" onClick={() => setSearchQuery('')} aria-label="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 p-1 rounded-md text-slate-400 hover:text-dark-text">
              <X size={13} />
            </button>
          )}
        </div>

        <Abas<StatusFilter>
          variante="segmentado"
          abas={[
            { id: 'todos', rotulo: 'Todos', contador: contagem.todos },
            { id: 'ativos', rotulo: 'Em aberto', contador: contagem.ativos },
            { id: 'ganhos', rotulo: 'Ganhos', contador: contagem.ganhos, dica: 'Ganhos pela data em que mudaram de etapa' },
            { id: 'perdidos', rotulo: 'Perdidos', contador: contagem.perdidos, dica: 'Perdidos pela data em que mudaram de etapa' },
          ]}
          ativa={statusFilter}
          onChange={setStatusFilter}
        />

        <ThemedDropdown
          value={kanbanFilter}
          options={[{ value: '', label: 'Todos os pipelines' }, ...kanbans.map(k => ({ value: k.nome, label: k.nome }))]}
          onChange={setKanbanFilter}
          title="Pipeline"
          buttonClassName="h-10 min-w-[190px]"
        />

        <DateRangePicker range={dateRange} onChange={setDateRange} placeholder="Todo o período" />

        {temFiltro && (
          <button type="button" onClick={limparFiltros} className="inline-flex items-center gap-1.5 h-10 px-2 text-[13px] font-medium text-slate-500 hover:text-dark-text transition-colors">
            <FilterX size={14} /> Limpar filtros
          </button>
        )}
      </div>

      {/* ── Tabela ── */}
      <Cartao semPadding className="overflow-hidden">
        {loading ? (
          <CarregandoBloco className="h-64" />
        ) : filteredLeads.length === 0 ? (
          <EstadoVazio
            Icone={Users}
            className="py-20"
            titulo={leads.length === 0 ? 'Nenhum lead no CRM.' : 'Nenhum lead com estes filtros.'}
            descricao={diagnostico.length > 0 && (
              <span className="block space-y-1">
                {diagnostico.map(d => (
                  <span key={d.rotulo} className="block">
                    {d.rotulo}: sem ele, <b className="font-semibold text-slate-600 dark:text-slate-300">{d.sem} {d.sem === 1 ? 'lead' : 'leads'}</b>
                    {' · '}
                    <button type="button" onClick={d.limpar} className="text-violet-600 dark:text-violet-400 hover:underline">tirar</button>
                  </span>
                ))}
              </span>
            )}
            acao={temFiltro && <button type="button" onClick={limparFiltros} className={designSystem.button.secundario}><FilterX size={14} /> Limpar filtros</button>}
          />
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full text-sm whitespace-nowrap">
                <thead>
                  <tr className="border-b border-black/5 dark:border-white/5">
                    {th('Lead', 'nome', { className: 'pl-5' })}
                    {th('Origem', 'origem')}
                    {th('Etapa', 'etapa')}
                    {th('Status', 'status')}
                    {th('Responsável', 'responsavel')}
                    {th('Valor', 'valor', { direita: true })}
                    {colunas.tags && th('Tags')}
                    {th('Criado em', 'criado', { className: colunas.mudou ? '' : 'pr-5' })}
                    {colunas.mudou && th('Mudou de etapa', 'mudou', { className: 'pr-5' })}
                  </tr>
                </thead>
                <tbody>
                  {visiveis.map((l) => {
                    const st = STATUS[getLeadStatus(l)];
                    const valor = valorNum(l.valor);
                    const contato = [formatPhone(l.telefone), l.email].filter(Boolean).join(' · ');
                    const origem = (l.origem || '').trim();
                    return (
                      <tr
                        key={l.id}
                        onClick={() => setSelectedLead(l)}
                        onKeyDown={(e) => { if (e.key === 'Enter') setSelectedLead(l); }}
                        tabIndex={0}
                        className="border-b border-black/5 dark:border-white/5 last:border-0 hover:bg-black/[0.02] dark:hover:bg-white/[0.03] focus:bg-black/[0.03] dark:focus:bg-white/[0.04] outline-none transition-colors cursor-pointer"
                      >
                        {/* Lead */}
                        <td className="pl-5 pr-4 py-3 max-w-[320px]">
                          <div className="flex items-center gap-3 min-w-0">
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0 ${corAvatar(l.nome)}`}>
                              {inicial(l.nome)}
                            </div>
                            <div className="min-w-0">
                              <p className="font-medium text-dark-text truncate">{l.nome}</p>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate">{contato || 'Sem contato'}</p>
                            </div>
                          </div>
                        </td>

                        {/* Origem */}
                        <td className="px-4 py-3 text-[13px] text-slate-600 dark:text-slate-300">
                          {origem || <span className="text-slate-400">—</span>}
                        </td>

                        {/* Etapa + pipeline */}
                        <td className="px-4 py-3 max-w-[220px]">
                          {l.coluna_nome ? (
                            <div className="min-w-0">
                              <p className="flex items-center gap-1.5 text-[13px] text-dark-text truncate">
                                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: l.coluna_color || '#94a3b8' }} />
                                <span className="truncate">{l.coluna_nome}</span>
                              </p>
                              {l.kanban_name && <p className="text-[12px] text-slate-500 dark:text-slate-400 truncate pl-3.5">{l.kanban_name}</p>}
                            </div>
                          ) : (
                            <span className="text-slate-400">—</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11.5px] font-semibold ${st.pilula}`}>
                            <span className={`w-1.5 h-1.5 rounded-full ${st.ponto}`} />{st.rotulo}
                          </span>
                        </td>

                        {/* Responsável */}
                        <td className="px-4 py-3">
                          {l.responsavel_name ? (
                            <span className="inline-flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300" title={l.responsavel_name}>
                              <span className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold ${corAvatar(l.responsavel_name)}`}>{inicial(l.responsavel_name)}</span>
                              {primeiroNome(l.responsavel_name)}
                            </span>
                          ) : <span className="text-slate-400">—</span>}
                        </td>

                        {/* Valor */}
                        <td className={`px-4 py-3 text-right numero text-[13px] ${valor ? 'text-dark-text' : 'text-slate-400'}`}>
                          {valor != null ? brl.format(valor) : '—'}
                        </td>

                        {/* Tags (opcional) */}
                        {colunas.tags && (
                          <td className="px-4 py-3">
                            {(l.tags || []).length > 0 ? (
                              <div className="flex items-center gap-1">
                                {(l.tags || []).map((t, i) => {
                                  const cor = tagCor(t) || '#8b5cf6';
                                  return <span key={i} className="inline-flex items-center h-5 px-2 rounded-full text-[11px] font-medium" style={{ background: `${cor}22`, color: cor }}>{tagNome(t)}</span>;
                                })}
                              </div>
                            ) : <span className="text-slate-400">—</span>}
                          </td>
                        )}

                        {/* Criado em */}
                        <td className={`px-4 py-3 ${colunas.mudou ? '' : 'pr-5'}`}>
                          {l.created_at ? (
                            <>
                              <p className="numero text-[13px] text-dark-text">{formatData(l.created_at)}</p>
                              <p className="text-[12px] text-slate-500 dark:text-slate-400">{timeAgo(l.created_at)}</p>
                            </>
                          ) : <span className="text-slate-400">—</span>}
                        </td>

                        {/* Mudou de etapa (opcional) */}
                        {colunas.mudou && (
                          <td className="pl-4 pr-5 py-3 text-[12.5px] text-slate-500 dark:text-slate-400">
                            {l.etapa_updated_at ? timeAgo(l.etapa_updated_at) : '—'}
                          </td>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Rodapé: quantos e carregar mais */}
            <div className="flex flex-wrap items-center justify-between gap-3 px-5 py-3 border-t border-black/5 dark:border-white/5 text-[12.5px] text-slate-500 dark:text-slate-400">
              <span>
                Mostrando <span className="numero text-dark-text">{visiveis.length}</span> de <span className="numero text-dark-text">{ordenados.length}</span> {ordenados.length === 1 ? 'lead' : 'leads'}
                {' · '}{rotuloPeriodo}
              </span>
              {ordenados.length > visiveis.length && (
                <button type="button" onClick={() => setLimite(n => n + POR_PAGINA)} className={designSystem.button.secundario}>
                  Carregar mais {Math.min(POR_PAGINA, ordenados.length - visiveis.length)}
                </button>
              )}
            </div>
          </>
        )}
      </Cartao>

      {/* ── Detalhe do lead ── */}
      {selectedLead && (
        <LeadDetalhe
          lead={selectedLead}
          onClose={() => setSelectedLead(null)}
          getToken={getToken}
        />
      )}
    </div>
  );
}
