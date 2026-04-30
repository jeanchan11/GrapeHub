import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Search, ArrowUp, ArrowDown, FileText, Calendar, ChevronDown, ChevronUp, Check, Tag, AlertTriangle, ShieldAlert, Users, TrendingUp, TrendingDown, X, MessageSquare, Copy, ExternalLink, Pencil, Zap, ToggleLeft, ToggleRight, Trash2, Plus, Loader2, Wand2, Link2, EyeOff, Eye, Upload } from 'lucide-react';

// ── Types ──────────────────────────────────────────────
interface ExtratoItem {
  id: number;
  description: string;
  movement_value: string;
  value: string;
  movement_date: string | null;
  expiration_date: string | null;
  status: string;
  type_column: string;
  source: string;
  type: number;
  payment_method: string;
  document_code: string;
  grapehub_category: string | null;
  custom_category: string | null;
  custom_category_id: number | null;
  person_name: string | null;
  person_fantasy_name: string | null;
  comments: string | null;
  original_description: string | null;
  custom_description: string | null;
  is_edited: boolean;
  edited_at: string | null;
  edited_by: string | null;
  is_anticipation_pair: boolean;
  account?: string;
  raw_grapehub_category?: string | null;
}

interface DateRange { start: string; end: string; }

interface Despesa {
  description: string;
  movement_value: string;
  value: string;
  movement_date: string;
  expiration_date: string;
  status: string;
  type_column: string;
  category_l1_ext_id: number;
  payment_method: string;
  document_code: string;
}

interface Inadimplente {
  name: string;
  fantasy_name: string;
  valor: string;
  payment_method: string;
  description: string;
  installment_number: string;
  expiration_date: string;
  dias_atraso: number;
}

interface ClienteRecente {
  name: string;
  fantasy_name: string;
  valor: string;
  payment_method: string;
  status: string;
  installment_number: string;
  movement_date: string;
}

interface Previsto {
  entradas_previstas: string;
  despesas_previstas: string;
  saldo_projetado: string;
}

interface Resumo {
  caixa_realizado: string;
  saidas_operacionais: string;
  distribuicao: string;
  a_receber: string;
  despesas_previstas: string;
  saldo_periodo: string;
}

// ── Categories ────────────────────────────────────────
const CATEGORIES = [
  { name: 'Cartão de Crédito',   icon: '💳' },
  { name: 'Impostos',            icon: '📊' },
  { name: 'Salários e Pessoal',  icon: '👥' },
  { name: 'Prestação de Serviço',icon: '🛠️' },
  { name: 'Marketing e Vendas',  icon: '📣' },
  { name: 'Administrativo',      icon: '🏢' },
  { name: 'Despesas Financeiras',icon: '💳' },
  { name: 'Distribuição de Lucros', icon: '💰' },
  { name: 'transferencia entre contas', icon: '🏦' },
  { name: 'Não Operacional',     icon: '📦' },
  { name: 'Receita de Contratos',icon: '📑' },
  { name: 'Outros',              icon: '📁' },
];

const KEYWORDS_MAP: { name: string; keywords: string[] }[] = [
  { name: 'Impostos',            keywords: ['Simples Nacional', 'ISS', 'IRPJ', 'Imposto', 'DAS', 'PIS', 'COFINS', 'CSLL', 'Taxa Municipal', 'Alvará', 'Alvara'] },
  { name: 'Salários e Pessoal',  keywords: ['Remuneração', 'Remuneracao', 'Salário', 'Salario', 'Bonificação', 'Bonificacao', 'Business Partner', 'FGTS', 'IRRF', 'Folha', 'Férias', 'Ferias', '13º', 'Rescisão', 'Rescisao', 'Benefício', 'Beneficio', 'Vale', 'Plano de Saúde', 'Plano de Saude', 'Odonto', 'Seguro de Vida'] },
  { name: 'Prestação de Serviço',keywords: ['Ferramenta', 'Software', 'VPS', 'Domínio', 'Dominio', 'Hospedagem', 'AWS', 'Google Cloud', 'Vercel', 'OpenAI', 'Claude', 'Github', 'Cursor', 'Slack', 'Zoom', 'Canva', 'Adobe', 'Figma', 'Notion', 'Trello', 'Jira'] },
  { name: 'Marketing e Vendas',  keywords: ['Comissão', 'Comissao', 'Tráfego Pago', 'Trafego Pago', 'Facebook Ads', 'Google Ads', 'Meta Ads', 'Marketing', 'Publicidade', 'Influenciador', 'RD Station', 'Hubspot', 'ActiveCampaign', 'LinkedIn Ads', 'TikTok Ads'] },
  { name: 'Administrativo',      keywords: ['Aluguel', 'Condomínio', 'Condominio', 'Energia', 'Internet', 'Assessoria Financeira', 'Contabilidade', 'Limpeza', 'Escritório', 'Escritorio', 'Material', 'Seguro', 'Água', 'Agua', 'Telefone', 'Correios', 'Cartório', 'Cartorio', 'TIM S A'] },
  { name: 'Despesas Financeiras',keywords: ['Taxa', 'Tarifa Asaas', 'Taxa de antecipação', 'Taxa de antecipacao', 'Baixa da antecipacao', 'Baixa da antecipação', 'Juros', 'IOF', 'Banco', 'Tarifa', 'Anuidade', 'TED', 'Boleto'] },
  { name: 'Distribuição de Lucros', keywords: ['Pró-labore', 'Pro-labore', 'Dividendo', 'INSS', 'Retirada', 'Lucro', 'Sócio', 'Socio', 'GRAPE MIDIA'] },
  { name: 'Não Operacional',     keywords: ['Compra de cotas', 'Pagamento de cotas', 'Investimento', 'Empréstimo', 'Emprestimo', 'Amortização', 'Amortizacao', 'Aporte', 'Financiamento'] },
];

function autoCategory(desc: string): { name: string; icon: string } {
  const d = desc.toLowerCase();
  if (d.includes('cartão de crédito') || d.includes('cartao de credito') || d.includes('cartão de cred')) {
    return { name: 'Cartão de Crédito', icon: '💳' };
  }
  for (const cat of KEYWORDS_MAP) {
    if (cat.keywords.some(k => d.includes(k.toLowerCase()))) {
      const found = CATEGORIES.find(c => c.name === cat.name);
      return found || { name: cat.name, icon: '📁' };
    }
  }
  return { name: 'Outros', icon: '📁' };
}

function getCategory(item: ExtratoItem) {
  if (item.grapehub_category) {
    const found = CATEGORIES.find(c => c.name === item.grapehub_category);
    return found || { name: item.grapehub_category, icon: '📁' };
  }
  return autoCategory(item.description || '');
}

const categorizeExpense = (description: string) => {
  const desc = description.toLowerCase();
  if (desc.includes('cartão de crédito') || desc.includes('cartao de credito') || desc.includes('cartão de cred') || desc.includes('cartao de cred')) {
    return { name: 'Cartão de Crédito', icon: '💳' };
  }
  for (const cat of KEYWORDS_MAP) {
    if (cat.keywords.some(k => desc.includes(k.toLowerCase()))) {
      const found = CATEGORIES.find(c => c.name === cat.name);
      return found || { name: cat.name, icon: '📁' };
    }
  }
  return { name: 'Outros', icon: '📁' };
};

const extractCreditCardTool = (description: string) => {
  if (!description.includes('-')) return description;
  let tool = description.split('-')[1].trim();
  if (tool.toLowerCase().includes('google worksp')) return 'Google Workspace';
  return tool;
};

// ── CategoryPicker ───────────────────────────────────────
// Cached categories tree (shared across all pickers)
let _cachedCatTree: any[] | null = null;
let _catFetchPromise: Promise<any[]> | null = null;

function fetchCatTree(): Promise<any[]> {
  if (_cachedCatTree) return Promise.resolve(_cachedCatTree);
  if (_catFetchPromise) return _catFetchPromise;
  _catFetchPromise = fetch('/api/fin-categories')
    .then(r => r.json())
    .then(data => {
      _cachedCatTree = data.tree || [];
      _catFetchPromise = null;
      return _cachedCatTree!;
    })
    .catch(() => {
      _catFetchPromise = null;
      return [];
    });
  return _catFetchPromise;
}

function CategoryPicker({ item, onSave }: { item: ExtratoItem; onSave: (id: number, category: string) => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dropPos, setDropPos] = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 });
  const [catTree, setCatTree] = useState<any[]>([]);
  const [search, setSearch] = useState('');
  const btnRef = useRef<HTMLButtonElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const cat = getCategory(item);
  const isManual = !!item.grapehub_category;

  // Load categories when dropdown opens
  useEffect(() => {
    if (open) {
      fetchCatTree().then(setCatTree);
      setTimeout(() => searchRef.current?.focus(), 100);
    } else {
      setSearch('');
    }
  }, [open]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const target = e.target as Element;
      if (!target.closest('[data-category-picker]')) setOpen(false);
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  async function select(name: string, categoryId?: number) {
    setSaving(true);
    try {
      const res = await fetch(`/api/financeiro/extrato/${item.id}/category`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ category: name }),
      });
      if (!res.ok) {
        const err = await res.text();
        console.error('[CategoryPicker] Falha ao salvar categoria:', res.status, err);
        return;
      }
      onSave(item.id, name);
    } catch (err) {
      console.error('[CategoryPicker] Erro de rede ao salvar categoria:', err);
    } finally {
      setSaving(false);
      setOpen(false);
    }
  }

  function toggleOpen() {
    if (!open && btnRef.current) {
      const rect = btnRef.current.getBoundingClientRect();
      const MENU_H = 380;
      const spaceBelow = window.innerHeight - rect.bottom;
      if (spaceBelow < MENU_H) {
        setDropPos({ bottom: window.innerHeight - rect.top + 4, left: rect.left });
      } else {
        setDropPos({ top: rect.bottom + 4, left: rect.left });
      }
    }
    setOpen(o => !o);
  }

  // Filter tree by search
  const matchesSearch = (node: any, term: string): boolean => {
    if (!term) return true;
    const t = term.toLowerCase();
    if (node.description?.toLowerCase().includes(t) || node.structure?.includes(t)) return true;
    return node.children?.some((c: any) => matchesSearch(c, t)) || false;
  };

  const currentCat = item.grapehub_category || cat.name;

  const dropdown = open ? (
    <div
      data-category-picker
      style={{
        position: 'fixed',
        top: dropPos.top,
        bottom: dropPos.bottom,
        left: dropPos.left,
        zIndex: 9999,
        width: 320,
      }}
      className="bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
    >
      {/* Search */}
      <div className="p-2 border-b border-slate-100 dark:border-white/5">
        <div className="relative">
          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-text/30" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoria..."
            className="w-full pl-7 pr-3 py-1.5 bg-dark-bg border border-dark-text/5 rounded-lg text-[11px] text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/30"
          />
        </div>
      </div>

      {/* Tree */}
      <div className="max-h-[320px] overflow-y-auto py-1">
        {catTree.length === 0 ? (
          <div className="px-3 py-4 text-center">
            <div className="w-4 h-4 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin mx-auto" />
          </div>
        ) : (
          catTree.map(l1 => {
            if (!matchesSearch(l1, search)) return null;
            return (
              <div key={l1.id}>
                {/* Level 1 — Group header */}
                <div className="px-3 pt-2.5 pb-1 flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                  <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest truncate">{l1.structure} — {l1.description}</span>
                </div>
                {l1.children?.map((l2: any) => {
                  if (!matchesSearch(l2, search)) return null;
                  const l2HasChildren = l2.children && l2.children.length > 0;
                  return (
                    <div key={l2.id}>
                      {/* Level 2 — Subgroup (selectable if no children, header if has children) */}
                      {l2HasChildren ? (
                        <>
                          <div className="px-3 pt-1.5 pb-0.5 ml-3 flex items-center gap-1.5">
                            <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                            <span className="text-[9px] font-semibold text-sky-400/70 uppercase tracking-wider truncate">{l2.structure} — {l2.description}</span>
                          </div>
                          {l2.children.map((l3: any) => {
                            if (search && !l3.description.toLowerCase().includes(search.toLowerCase()) && !l3.structure.includes(search)) return null;
                            const isSelected = currentCat === l3.description;
                            return (
                              <button
                                key={l3.id}
                                onClick={() => select(l3.description, l3.id)}
                                className={`w-full flex items-center gap-2 pl-10 pr-3 py-1.5 text-[11px] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${
                                  isSelected ? 'text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-500/5' : 'text-slate-600 dark:text-slate-300'
                                }`}
                              >
                                <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                <span className="text-[10px] font-mono text-dark-text/20 shrink-0">{l3.structure}</span>
                                <span className="flex-1 truncate">{l3.description}</span>
                                {isSelected && <Check size={11} className="text-violet-500 shrink-0" />}
                              </button>
                            );
                          })}
                        </>
                      ) : (
                        <button
                          key={l2.id}
                          onClick={() => select(l2.description, l2.id)}
                          className={`w-full flex items-center gap-2 pl-6 pr-3 py-1.5 text-[11px] hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left ${
                            currentCat === l2.description ? 'text-violet-600 dark:text-violet-400 font-bold bg-violet-50 dark:bg-violet-500/5' : 'text-slate-600 dark:text-slate-300'
                          }`}
                        >
                          <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                          <span className="text-[10px] font-mono text-dark-text/20 shrink-0">{l2.structure}</span>
                          <span className="flex-1 truncate">{l2.description}</span>
                          {currentCat === l2.description && <Check size={11} className="text-violet-500 shrink-0" />}
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}
      </div>

      {/* Reset option */}
      {item.grapehub_category && (
        <div className="border-t border-slate-100 dark:border-white/5 p-1.5">
          <button
            onClick={() => select('')}
            className="w-full flex items-center gap-2 px-3 py-2 text-xs text-slate-400 hover:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-500/10 rounded-lg transition-colors text-left"
          >
            <Tag size={12} />
            Resetar para automático
          </button>
        </div>
      )}
    </div>
  ) : null;

  return (
    <div data-category-picker className="relative">
      <button
        ref={btnRef}
        onClick={toggleOpen}
        disabled={saving}
        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all border
          ${isManual
            ? 'bg-violet-500/10 border-violet-500/30 text-violet-600 dark:text-violet-300 hover:bg-violet-500/20'
            : 'bg-slate-100 dark:bg-white/5 border-transparent text-slate-500 hover:bg-slate-200 dark:hover:bg-white/10'
          }`}
        title={isManual ? 'Categoria manual — clique para alterar' : 'Categoria automática — clique para fixar'}
      >
        <span>{cat.icon}</span>
        <span className="max-w-[90px] truncate">{cat.name}</span>
        <ChevronDown size={10} className={`shrink-0 transition-transform ${open ? 'rotate-180' : ''}`} />
      </button>
      {typeof document !== 'undefined' && createPortal(dropdown, document.body)}
    </div>
  );
}

// ── SubGroup ─────────────────────────────────────────────
const SubGroup = ({ label, items, formatCurr }: { label: string; items: any[]; formatCurr: (v: number) => string }) => {
  const [isOpen, setIsOpen] = useState(false);
  const total = items.reduce((s: number, i: any) => s + i.value, 0);
  return (
    <div className="mb-1 border border-white/5 rounded-lg overflow-hidden">
      <button
        onClick={() => setIsOpen(v => !v)}
        className="w-full flex items-center justify-between px-3 py-2 bg-dark-card-hover hover:bg-white/5 transition-colors"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-slate-300">{label}</span>
          <span className="text-[10px] text-slate-500">{items.length} itens</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-bold text-dark-text">{formatCurr(total)}</span>
          {isOpen ? <ChevronUp size={12} className="text-slate-500" /> : <ChevronDown size={12} className="text-slate-500" />}
        </div>
      </button>
      {isOpen && (
        <div className="divide-y divide-white/5">
          {items.map((item: any, idx: number) => (
            <div key={idx} className="flex items-center justify-between px-4 py-2 hover:bg-dark-card rounded-lg transition-colors">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-dark-text">{item.description}</span>
                <span className="text-[10px] text-slate-500">{item.date}</span>
              </div>
              <span className="text-xs font-bold text-dark-text">{formatCurr(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

// ── CollapsibleGroup ─────────────────────────────────────
const CollapsibleGroup = ({ category, items, total, icon, formatCurr }: any) => {
  const [isOpen, setIsOpen] = useState(false);

  const isCartao = category === 'Cartão de Crédito';
  const isFacebook = (desc: string) => /facebook|facebk/i.test(desc ?? '');
  const facebook   = isCartao ? items.filter((i: any) => isFacebook(i.description)) : [];
  const aplicativos = isCartao ? items.filter((i: any) => !isFacebook(i.description)) : [];

  return (
    <div className="mb-2 border border-white/10 rounded-xl overflow-hidden">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between p-4 bg-dark-card hover:bg-dark-card-hover transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-xl">{icon}</span>
          <span className="text-sm font-bold text-dark-text">{category}</span>
          <span className="text-[10px] text-slate-500 font-normal ml-2">{items.length} itens</span>
        </div>
        <div className="flex items-center gap-4">
          <span className="text-sm font-bold text-dark-text">{formatCurr(total)}</span>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>
      {isOpen && (
        <div className="bg-dark-bg p-2 space-y-1 border-t border-white/10">
          {isCartao ? (
            <>
              {facebook.length > 0 && <SubGroup label="Facebook" items={facebook} formatCurr={formatCurr} />}
              {aplicativos.length > 0 && <SubGroup label="Aplicativos" items={aplicativos} formatCurr={formatCurr} />}
            </>
          ) : (
            items.map((item: any, idx: number) => (
              <div key={idx} className="flex items-center justify-between p-3 hover:bg-dark-card rounded-lg transition-colors">
                <div className="flex flex-col">
                  <span className="text-xs font-medium text-dark-text">{item.description}</span>
                  <span className="text-[10px] text-slate-500">{item.date}</span>
                </div>
                <span className="text-xs font-bold text-dark-text">{formatCurr(item.value)}</span>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
};

// ── Calendar helpers ────────────────────────────────────
const MESES_FULL = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const WEEK_DAYS  = ['D','S','T','Q','Q','S','S'];

function isoDate(y: number, m: number, d: number) {
  return `${y}-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`;
}
function daysInMonth(y: number, m: number) { return new Date(y, m, 0).getDate(); }
function firstDayOfMonth(y: number, m: number) { return new Date(y, m - 1, 1).getDay(); }
function formatDateBR(iso: string) {
  if (!iso) return '';
  const [y, m, d] = iso.split('-');
  return `${d}/${m}/${y}`;
}

// ── DateRangePicker ──────────────────────────────────────
function DateRangePicker({ range, onChange }: { range: DateRange; onChange: (r: DateRange) => void }) {
  const [open, setOpen]           = useState(false);
  const [hovered, setHovered]     = useState('');
  const [selecting, setSelecting] = useState<string>('');
  const ref = useRef<HTMLDivElement>(null);

  const today = new Date();
  const [viewYear, setViewYear]   = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth() + 1);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) { setOpen(false); setSelecting(''); }
    }
    if (open) document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [open]);

  function stepMonth(dir: 1 | -1) {
    let m = viewMonth + dir, y = viewYear;
    if (m > 12) { m = 1; y++; }
    if (m < 1)  { m = 12; y--; }
    setViewYear(y); setViewMonth(m);
  }

  function handleDayClick(iso: string) {
    if (!selecting) { setSelecting(iso); }
    else {
      const s = selecting < iso ? selecting : iso;
      const e = selecting < iso ? iso : selecting;
      onChange({ start: s, end: e });
      setSelecting(''); setOpen(false);
    }
  }

  function isInRange(iso: string) {
    const lo = selecting ? Math.min(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.start);
    const hi = selecting ? Math.max(...[selecting, hovered || selecting].map(d => +new Date(d))) : +new Date(range.end);
    return +new Date(iso) > lo && +new Date(iso) < hi;
  }
  function isStart(iso: string) { return selecting ? iso === selecting : iso === range.start; }
  function isEnd(iso: string) {
    if (selecting) return hovered ? iso === (selecting < hovered ? hovered : selecting) : false;
    return iso === range.end;
  }

  const days = daysInMonth(viewYear, viewMonth);
  const firstDay = firstDayOfMonth(viewYear, viewMonth);
  const cells: (string | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: days }, (_, i) => isoDate(viewYear, viewMonth, i + 1)),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const label = range.start && range.end
    ? range.start === range.end ? formatDateBR(range.start) : `${formatDateBR(range.start)} → ${formatDateBR(range.end)}`
    : 'Selecionar período';

  const todayIso = today.toISOString().slice(0, 10);
  const d7  = new Date(today); d7.setDate(today.getDate() - 6);
  const d30 = new Date(today); d30.setDate(today.getDate() - 29);
  const mStart = isoDate(today.getFullYear(), today.getMonth() + 1, 1);
  const mEnd   = isoDate(today.getFullYear(), today.getMonth() + 1, daysInMonth(today.getFullYear(), today.getMonth() + 1));
  const pmStart = (() => { const d = new Date(today.getFullYear(), today.getMonth() - 1, 1); return isoDate(d.getFullYear(), d.getMonth() + 1, 1); })();
  const pmEnd   = new Date(today.getFullYear(), today.getMonth(), 0).toISOString().slice(0, 10);

  function preset(lbl: string, start: string, end: string) {
    return (
      <button key={lbl} onClick={() => { onChange({ start, end }); setOpen(false); setSelecting(''); }}
        className="text-xs text-slate-400 hover:text-violet-400 hover:bg-violet-500/10 px-2 py-1 rounded-lg transition-colors text-left whitespace-nowrap">
        {lbl}
      </button>
    );
  }

  return (
    <div ref={ref} className="relative">
      <button onClick={() => setOpen(o => !o)}
        className="flex items-center gap-2.5 bg-dark-card border border-violet-500/60 rounded-xl px-4 py-2.5 transition-all hover:border-violet-500">
        <Calendar size={14} className="text-violet-500" />
        <span className="text-sm font-bold text-dark-text">{label}</span>
        <ChevronDown size={14} className={`text-slate-400 transition-transform duration-200 ${open ? 'rotate-180' : ''}`} />
      </button>

      {open && (
        <div className="absolute right-0 top-full mt-2 z-50 bg-dark-card border border-white/10 rounded-2xl shadow-2xl p-4" style={{ minWidth: 320 }}>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">
            {selecting ? 'Clique na data final' : 'Selecionar Período'}
          </p>
          <div className="flex flex-wrap gap-1 mb-3 pb-3 border-b border-white/10">
            {preset('Hoje', todayIso, todayIso)}
            {preset('Últ. 7 dias', d7.toISOString().slice(0,10), todayIso)}
            {preset('Últ. 30 dias', d30.toISOString().slice(0,10), todayIso)}
            {preset('Este mês', mStart, mEnd)}
            {preset('Mês passado', pmStart, pmEnd)}
          </div>
          <div className="flex items-center justify-between mb-3">
            <button onClick={() => stepMonth(-1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 rotate-90" />
            </button>
            <span className="text-sm font-bold text-dark-text">{MESES_FULL[viewMonth - 1]} {viewYear}</span>
            <button onClick={() => stepMonth(1)} className="w-7 h-7 rounded-lg hover:bg-white/10 flex items-center justify-center transition-colors">
              <ChevronDown size={13} className="text-slate-400 -rotate-90" />
            </button>
          </div>
          <div className="grid grid-cols-7 mb-1">
            {WEEK_DAYS.map((d, i) => <div key={i} className="text-center text-[10px] font-bold text-slate-500 pb-1">{d}</div>)}
          </div>
          <div className="grid grid-cols-7 gap-y-0.5">
            {cells.map((iso, idx) => {
              if (!iso) return <div key={idx} />;
              const start = isStart(iso), end = isEnd(iso), inRng = isInRange(iso), isToday = iso === todayIso;
              return (
                <button key={iso}
                  onClick={() => handleDayClick(iso)}
                  onMouseEnter={() => selecting && setHovered(iso)}
                  onMouseLeave={() => selecting && setHovered('')}
                  className={`relative h-8 w-full text-xs font-semibold transition-all
                    ${start || end ? 'text-white z-10' : inRng ? 'text-violet-700 dark:text-violet-200' : 'text-dark-text hover:text-violet-600'}
                    ${inRng ? 'bg-violet-500/15' : ''}
                    ${start ? 'rounded-l-full' : ''} ${end ? 'rounded-r-full' : ''} ${!start && !end ? 'rounded-full' : ''}`}
                >
                  <span className={`absolute inset-0.5 flex items-center justify-center rounded-full text-xs
                    ${start || end ? 'bg-violet-600 shadow-md shadow-violet-500/30' : ''}
                    ${isToday && !start && !end ? 'ring-1 ring-violet-500/60' : ''}`}>
                    {parseInt(iso.slice(8))}
                  </span>
                </button>
              );
            })}
          </div>
          {range.start && range.end && (
            <div className="mt-3 pt-3 border-t border-white/10 flex items-center justify-between text-xs">
              <span className="text-slate-500">{formatDateBR(range.start)} → {formatDateBR(range.end)}</span>
              <button onClick={() => { onChange({ start: mStart, end: mEnd }); setSelecting(''); }}
                className="text-violet-400 hover:text-violet-300 transition-colors">Limpar</button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ── Helpers ─────────────────────────────────────────────
const formatCurrency = (value: string | number) => {
  const num = typeof value === 'string' ? parseFloat(value) : value;
  return (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const fmtDate = (d: string | null) => {
  if (!d) return '—';
  return new Date(d).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });
};

const getItemDate = (item: ExtratoItem) => item.movement_date || item.expiration_date;

function defaultRange(): DateRange {
  const today = new Date();
  const y = today.getFullYear(), m = today.getMonth() + 1;
  return { start: isoDate(y, m, 1), end: isoDate(y, m, daysInMonth(y, m)) };
}

const getStatusColor = (status: string) => {
  if (status === 'Conciliado') return 'bg-violet-100 text-violet-700 dark:bg-violet-500/20 dark:text-violet-400';
  if (status === 'Pendente') return 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
  if (status === 'Atrasado') return 'bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400';
  return 'bg-slate-100 text-slate-700 dark:bg-white/10 dark:text-slate-300';
};

const getStatusDotColor = (status: string) => {
  if (status === 'Conciliado') return 'bg-violet-600';
  if (status === 'Pendente') return 'bg-amber-500';
  if (status === 'Atrasado') return 'bg-red-600';
  return 'bg-slate-500';
};

const TABS = ['Extrato'] as const;
type TabType = typeof TABS[number];

// ── Reconciliation Rule Types ────────────────────────────
interface ReconciliationRule {
  id: number;
  name: string;
  match_text: string;
  match_type: 'contains' | 'starts_with' | 'exact';
  category_id: number | null;
  category_name: string | null;
  category_structure: string | null;
  is_active: boolean;
  priority: number;
  created_at: string;
  created_by: string | null;
}

const MATCH_TYPE_LABELS: Record<string, string> = {
  contains: 'Contém',
  starts_with: 'Começa com',
  exact: 'É exatamente',
};

// ── ReconciliationModal ──────────────────────────────────
function ReconciliationModal({ open, onClose, onApplied }: { open: boolean; onClose: () => void; onApplied: () => void }) {
  const [tab, setTab] = useState<'rules' | 'apply'>('rules');
  const [rules, setRules] = useState<ReconciliationRule[]>([]);
  const [loading, setLoading] = useState(true);
  const [pendingCount, setPendingCount] = useState(0);
  const [applying, setApplying] = useState(false);
  const [applyResult, setApplyResult] = useState<{ applied: number; details: { rule: string; applied: number }[] } | null>(null);
  // Edit/Create form
  const [editingRule, setEditingRule] = useState<ReconciliationRule | null>(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({ name: '', match_text: '', match_type: 'contains', category_id: null as number | null, category_name: '', priority: 0 });
  const [saving, setSaving] = useState(false);
  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  // Category tree for picker
  const [catTree, setCatTree] = useState<any[]>([]);
  const [catSearch, setCatSearch] = useState('');
  const [showCatPicker, setShowCatPicker] = useState(false);

  const fetchRules = async () => {
    try {
      const res = await fetch('/api/fin-reconciliation-rules');
      setRules(await res.json());
    } catch {} finally { setLoading(false); }
  };

  const fetchStats = async () => {
    try {
      const res = await fetch('/api/fin-reconciliation-rules/stats');
      const data = await res.json();
      setPendingCount(data.pending || 0);
    } catch {}
  };

  const fetchCatTree = async () => {
    try {
      const res = await fetch('/api/fin-categories');
      const data = await res.json();
      setCatTree(data.tree || []);
    } catch {}
  };

  useEffect(() => {
    if (open) { fetchRules(); fetchStats(); fetchCatTree(); }
  }, [open]);

  const handleToggle = async (rule: ReconciliationRule) => {
    await fetch(`/api/fin-reconciliation-rules/${rule.id}`, {
      method: 'PUT', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ is_active: !rule.is_active }),
    });
    fetchRules();
  };

  const handleDelete = (id: number) => {
    setConfirmDeleteId(id);
  };

  const confirmDelete = async () => {
    if (confirmDeleteId === null) return;
    await fetch(`/api/fin-reconciliation-rules/${confirmDeleteId}`, { method: 'DELETE' });
    setConfirmDeleteId(null);
    fetchRules();
  };

  const handleApply = async () => {
    setApplying(true); setApplyResult(null);
    try {
      const res = await fetch('/api/fin-reconciliation-rules/apply', { method: 'POST' });
      const data = await res.json();
      setApplyResult(data);
      fetchStats();
      onApplied();
    } catch {} finally { setApplying(false); }
  };

  const openCreateForm = () => {
    setEditingRule(null);
    setFormData({ name: '', match_text: '', match_type: 'contains', category_id: null, category_name: '', priority: rules.length });
    setShowForm(true);
  };

  const openEditForm = (rule: ReconciliationRule) => {
    setEditingRule(rule);
    setFormData({ name: rule.name, match_text: rule.match_text, match_type: rule.match_type, category_id: rule.category_id, category_name: rule.category_name || '', priority: rule.priority });
    setShowForm(true);
  };

  const handleSaveRule = async () => {
    if (!formData.name || !formData.match_text || !formData.category_name) return;
    setSaving(true);
    try {
      const url = editingRule ? `/api/fin-reconciliation-rules/${editingRule.id}` : '/api/fin-reconciliation-rules';
      const method = editingRule ? 'PUT' : 'POST';
      await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(formData) });
      setShowForm(false); fetchRules();
    } catch {} finally { setSaving(false); }
  };

  // Category picker filter
  const matchesCatSearch = (node: any, term: string): boolean => {
    if (!term) return true;
    const t = term.toLowerCase();
    if (node.description?.toLowerCase().includes(t) || node.structure?.includes(t)) return true;
    return node.children?.some((c: any) => matchesCatSearch(c, t)) || false;
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[9990] flex items-center justify-center" onClick={onClose}>
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
      <div className="relative bg-dark-card border border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[85vh] flex flex-col" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="p-6 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
              <Zap size={20} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-lg font-black text-dark-text">Regras de Conciliação</h2>
              <p className="text-[10px] text-slate-500 uppercase tracking-widest">Automatize a categorização dos lançamentos</p>
            </div>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg bg-dark-text/5 hover:bg-dark-text/10 flex items-center justify-center transition-colors">
            <X size={16} className="text-dark-text/50" />
          </button>
        </div>

        {/* Tabs */}
        <div className="px-6 pt-4 flex gap-1">
          {(['rules', 'apply'] as const).map(t => (
            <button key={t} onClick={() => { setTab(t); setShowForm(false); }}
              className={`px-4 py-2 text-xs font-bold rounded-lg transition-all ${tab === t ? 'bg-violet-500/10 text-violet-400' : 'text-slate-500 hover:text-dark-text hover:bg-dark-text/5'}`}>
              {t === 'rules' ? `Regras (${rules.length})` : `Aplicar (${pendingCount} pendentes)`}
            </button>
          ))}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {/* ── Tab: Rules ── */}
          {tab === 'rules' && !showForm && (
            <div className="space-y-3">
              <button onClick={openCreateForm}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 text-white text-xs font-bold rounded-xl transition-colors">
                <Plus size={14} /> Nova Regra
              </button>
              {loading ? (
                <div className="flex justify-center py-8"><Loader2 size={20} className="text-violet-400 animate-spin" /></div>
              ) : rules.length === 0 ? (
                <div className="text-center py-8">
                  <Zap size={32} className="mx-auto text-dark-text/10 mb-2" />
                  <p className="text-sm text-dark-text/30">Nenhuma regra cadastrada</p>
                  <p className="text-[10px] text-dark-text/20 mt-1">Crie regras para automatizar a categorização</p>
                </div>
              ) : (
                rules.map(rule => (
                  <div key={rule.id} className={`flex items-center gap-3 p-3 rounded-xl border transition-all ${
                    rule.is_active ? 'bg-dark-text/[0.02] border-white/5' : 'bg-dark-text/[0.01] border-white/[0.02] opacity-50'
                  }`}>
                    {/* Toggle */}
                    <button onClick={() => handleToggle(rule)} className="shrink-0" title={rule.is_active ? 'Desativar' : 'Ativar'}>
                      {rule.is_active
                        ? <ToggleRight size={22} className="text-emerald-400" />
                        : <ToggleLeft size={22} className="text-slate-500" />
                      }
                    </button>
                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-dark-text truncate">{rule.name}</span>
                        <span className="text-[9px] px-1.5 py-0.5 bg-dark-text/5 text-dark-text/40 rounded font-mono">{MATCH_TYPE_LABELS[rule.match_type]}: "{rule.match_text}"</span>
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[10px] text-violet-400/70">→ {rule.category_name || 'Sem categoria'}</span>
                        {rule.category_structure && <span className="text-[9px] font-mono text-dark-text/20">{rule.category_structure}</span>}
                        <span className="text-[9px] text-dark-text/20">P{rule.priority}</span>
                      </div>
                    </div>
                    {/* Actions */}
                    {confirmDeleteId === rule.id ? (
                      <div className="flex items-center gap-1.5">
                        <span className="text-[10px] text-rose-400 font-semibold whitespace-nowrap">Excluir?</span>
                        <button onClick={confirmDelete} className="w-7 h-7 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 flex items-center justify-center transition-colors" title="Confirmar exclusão">
                          <Check size={12} className="text-rose-400" />
                        </button>
                        <button onClick={() => setConfirmDeleteId(null)} className="w-7 h-7 rounded-lg bg-dark-text/5 hover:bg-dark-text/10 flex items-center justify-center transition-colors" title="Cancelar">
                          <X size={12} className="text-dark-text/40" />
                        </button>
                      </div>
                    ) : (
                      <>
                        <button onClick={() => openEditForm(rule)} className="w-7 h-7 rounded-lg bg-dark-text/5 hover:bg-violet-500/15 flex items-center justify-center transition-colors" title="Editar">
                          <Pencil size={11} className="text-dark-text/40" />
                        </button>
                        <button onClick={() => handleDelete(rule.id)} className="w-7 h-7 rounded-lg bg-dark-text/5 hover:bg-rose-500/15 flex items-center justify-center transition-colors" title="Excluir">
                          <Trash2 size={11} className="text-dark-text/40" />
                        </button>
                      </>
                    )}
                  </div>
                ))
              )}
            </div>
          )}

          {/* ── Tab: Rules — Form ── */}
          {tab === 'rules' && showForm && (
            <div className="space-y-4">
              <button onClick={() => setShowForm(false)} className="flex items-center gap-1.5 text-xs text-violet-400 hover:text-violet-300 transition-colors">
                <ChevronDown size={12} className="rotate-90" /> Voltar para lista
              </button>
              <h3 className="text-sm font-bold text-dark-text">{editingRule ? 'Editar Regra' : 'Nova Regra'}</h3>

              {/* Name */}
              <div>
                <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Nome da regra</label>
                <input value={formData.name} onChange={e => setFormData(f => ({ ...f, name: e.target.value }))}
                  placeholder="Ex: Taxa do Pix"
                  className="w-full mt-1 px-3 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-sm text-dark-text placeholder-dark-text/20 focus:outline-none focus:border-violet-500/30" />
              </div>

              {/* Match */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Se a descrição</label>
                  <select value={formData.match_type} onChange={e => setFormData(f => ({ ...f, match_type: e.target.value }))}
                    className="w-full mt-1 px-3 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-sm text-dark-text focus:outline-none focus:border-violet-500/30 appearance-none">
                    <option value="contains">Contém</option>
                    <option value="starts_with">Começa com</option>
                    <option value="exact">É exatamente</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Texto</label>
                  <input value={formData.match_text} onChange={e => setFormData(f => ({ ...f, match_text: e.target.value }))}
                    placeholder="Ex: Taxa do Pix"
                    className="w-full mt-1 px-3 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-sm text-dark-text placeholder-dark-text/20 focus:outline-none focus:border-violet-500/30" />
                </div>
              </div>

              {/* Category picker */}
              <div>
                <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Aplicar categoria</label>
                <div className="relative mt-1">
                  <button onClick={() => setShowCatPicker(!showCatPicker)}
                    className={`w-full flex items-center justify-between px-3 py-2.5 bg-dark-bg border rounded-xl text-sm transition-all ${
                      formData.category_name ? 'border-violet-500/30 text-violet-400' : 'border-white/5 text-dark-text/30'
                    }`}>
                    <span className="truncate">{formData.category_name || 'Selecione uma categoria...'}</span>
                    <ChevronDown size={14} className={`text-dark-text/30 transition-transform ${showCatPicker ? 'rotate-180' : ''}`} />
                  </button>

                  {showCatPicker && (
                    <div className="absolute top-full left-0 right-0 mt-1 bg-dark-card border border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden">
                      <div className="p-2 border-b border-white/5">
                        <div className="relative">
                          <Search size={13} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-dark-text/30" />
                          <input type="text" value={catSearch} onChange={e => setCatSearch(e.target.value)}
                            placeholder="Buscar categoria..."
                            className="w-full pl-7 pr-3 py-1.5 bg-dark-bg border border-dark-text/5 rounded-lg text-[11px] text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/30" />
                        </div>
                      </div>
                      <div className="max-h-[250px] overflow-y-auto py-1">
                        {catTree.map((l1: any) => {
                          if (!matchesCatSearch(l1, catSearch)) return null;
                          return (
                            <div key={l1.id}>
                              <div className="px-3 pt-2 pb-0.5 flex items-center gap-1.5">
                                <div className="w-1.5 h-1.5 rounded-full bg-violet-500 shrink-0" />
                                <span className="text-[9px] font-bold text-violet-400 uppercase tracking-widest truncate">{l1.structure} — {l1.description}</span>
                              </div>
                              {l1.children?.map((l2: any) => {
                                if (!matchesCatSearch(l2, catSearch)) return null;
                                const l2Has = l2.children?.length > 0;
                                return (
                                  <div key={l2.id}>
                                    {l2Has ? (
                                      <>
                                        <div className="px-3 pt-1 pb-0.5 ml-3 flex items-center gap-1.5">
                                          <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                          <span className="text-[9px] font-semibold text-sky-400/70 uppercase tracking-wider truncate">{l2.structure} — {l2.description}</span>
                                        </div>
                                        {l2.children.map((l3: any) => {
                                          if (catSearch && !l3.description.toLowerCase().includes(catSearch.toLowerCase()) && !l3.structure.includes(catSearch)) return null;
                                          return (
                                            <button key={l3.id}
                                              onClick={() => { setFormData(f => ({ ...f, category_id: l3.id, category_name: l3.description })); setShowCatPicker(false); setCatSearch(''); }}
                                              className={`w-full flex items-center gap-2 pl-10 pr-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors text-left ${
                                                formData.category_name === l3.description ? 'text-violet-400 font-bold bg-violet-500/5' : 'text-slate-300'
                                              }`}>
                                              <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shrink-0" />
                                              <span className="text-[10px] font-mono text-dark-text/20 shrink-0">{l3.structure}</span>
                                              <span className="flex-1 truncate">{l3.description}</span>
                                              {formData.category_name === l3.description && <Check size={11} className="text-violet-500 shrink-0" />}
                                            </button>
                                          );
                                        })}
                                      </>
                                    ) : (
                                      <button key={l2.id}
                                        onClick={() => { setFormData(f => ({ ...f, category_id: l2.id, category_name: l2.description })); setShowCatPicker(false); setCatSearch(''); }}
                                        className={`w-full flex items-center gap-2 pl-6 pr-3 py-1.5 text-[11px] hover:bg-white/5 transition-colors text-left ${
                                          formData.category_name === l2.description ? 'text-violet-400 font-bold bg-violet-500/5' : 'text-slate-300'
                                        }`}>
                                        <div className="w-1.5 h-1.5 rounded-full bg-sky-500 shrink-0" />
                                        <span className="text-[10px] font-mono text-dark-text/20 shrink-0">{l2.structure}</span>
                                        <span className="flex-1 truncate">{l2.description}</span>
                                        {formData.category_name === l2.description && <Check size={11} className="text-violet-500 shrink-0" />}
                                      </button>
                                    )}
                                  </div>
                                );
                              })}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              {/* Priority */}
              <div>
                <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Prioridade (menor = executa primeiro)</label>
                <input type="number" min="0" value={formData.priority} onChange={e => setFormData(f => ({ ...f, priority: parseInt(e.target.value) || 0 }))}
                  className="w-full mt-1 px-3 py-2.5 bg-dark-bg border border-white/5 rounded-xl text-sm text-dark-text focus:outline-none focus:border-violet-500/30" />
              </div>

              {/* Save */}
              <button onClick={handleSaveRule} disabled={saving || !formData.name || !formData.match_text || !formData.category_name}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl transition-colors">
                {saving ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                {editingRule ? 'Salvar Alterações' : 'Criar Regra'}
              </button>
            </div>
          )}

          {/* ── Tab: Apply ── */}
          {tab === 'apply' && (
            <div className="space-y-4">
              {/* Pending card */}
              <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-5 text-center">
                <p className="text-3xl font-black text-amber-400">{pendingCount}</p>
                <p className="text-xs text-amber-400/70 font-medium mt-1">lançamentos pendentes de conciliação</p>
              </div>

              {/* Active rules summary */}
              <div className="bg-dark-text/[0.02] border border-white/5 rounded-xl p-4">
                <p className="text-[10px] font-bold text-dark-text/40 uppercase tracking-widest mb-2">Regras ativas que serão aplicadas</p>
                {rules.filter(r => r.is_active).length === 0 ? (
                  <p className="text-xs text-dark-text/20">Nenhuma regra ativa. Crie regras na aba "Regras".</p>
                ) : (
                  <div className="space-y-1">
                    {rules.filter(r => r.is_active).map(r => (
                      <div key={r.id} className="flex items-center gap-2 text-xs text-dark-text/50">
                        <span className="text-[9px] font-mono bg-dark-text/5 px-1.5 py-0.5 rounded">P{r.priority}</span>
                        <span className="font-medium text-dark-text/70">{r.name}</span>
                        <span className="text-dark-text/20">→</span>
                        <span className="text-violet-400/60">{r.category_name}</span>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Apply button */}
              <button onClick={handleApply} disabled={applying || pendingCount === 0 || rules.filter(r => r.is_active).length === 0}
                className="w-full flex items-center justify-center gap-2 px-4 py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-colors">
                {applying ? <Loader2 size={16} className="animate-spin" /> : <Wand2 size={16} />}
                Aplicar Regras Agora
              </button>

              {/* Result */}
              {applyResult && (
                <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5">
                  <p className="text-lg font-black text-emerald-400 text-center">{applyResult.applied} lançamentos conciliados</p>
                  {applyResult.details.length > 0 && (
                    <div className="mt-3 space-y-1">
                      {applyResult.details.map((d, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-emerald-400/70">{d.rule}</span>
                          <span className="font-bold text-emerald-400">{d.applied}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// ── Component ────────────────────────────────────────────
export default function Extrato() {
  const [activeTab, setActiveTab] = useState<TabType>('Extrato');

  // ── Extrato tab state ──
  const [range, setRange]       = useState<DateRange>(defaultRange);
  const [extrato, setExtrato]   = useState<ExtratoItem[]>([]);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState<string | null>(null);
  const [search, setSearch]     = useState('');
  const [typeFilter, setTypeFilter] = useState<'todos'|'entradas'|'saidas'|'realizados'|'previstos'>('todos');
  const [categoryFilter, setCategoryFilter] = useState<string>('');
  const [hideAnticipation, setHideAnticipation] = useState(false);
  const [anticipationStats, setAnticipationStats] = useState<{ antecipado_bruto: number; taxas_antecipacao: number; liquido: number; count_pares: number } | null>(null);

  // ── Account filter state ──
  const [accountFilter, setAccountFilter] = useState<'all' | 'asaas' | 'sicredi'>('all');
  const [lastImport, setLastImport] = useState<string | null>(null);
  const [showOfxModal, setShowOfxModal] = useState(false);
  const [ofxFile, setOfxFile] = useState<File | null>(null);
  const [ofxUploading, setOfxUploading] = useState(false);
  const [ofxResult, setOfxResult] = useState<{ inserted: number; skipped: number } | null>(null);

  // ── Transaction detail modal state ──
  const [selectedTransaction, setSelectedTransaction] = useState<ExtratoItem | null>(null);
  const [showRulesModal, setShowRulesModal] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [modalComments, setModalComments] = useState('');
  const [modalDescription, setModalDescription] = useState('');
  const [savingModal, setSavingModal] = useState(false);
  const [modalSaved, setModalSaved] = useState(false);

  // ── Month tabs state ──
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [despesas, setDespesas]           = useState<Despesa[]>([]);
  const [despesasRefreshKey, setDespesasRefreshKey] = useState(0);
  const [receitas, setReceitas]           = useState<Despesa[]>([]);
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([]);
  const [clientes, setClientes]           = useState<ClienteRecente[]>([]);
  const [previsto, setPrevisto]           = useState<Previsto | null>(null);
  const [resumo, setResumo]               = useState<Resumo | null>(null);
  const [tabLoading, setTabLoading]       = useState(false);

  // ── Fetch extrato ──
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true); setError(null);
        const res = await fetch(`/api/financeiro/extrato?start=${range.start}&end=${range.end}&account=${accountFilter}`);
        if (!res.ok) throw new Error('Falha ao carregar extrato');
        setExtrato(await res.json());
      } catch (err: any) {
        setError(err.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };
    const fetchAnticipationStats = async () => {
      try {
        const res = await fetch(`/api/financeiro/extrato/anticipation-stats?start=${range.start}&end=${range.end}`);
        if (res.ok) setAnticipationStats(await res.json());
      } catch {}
    };
    fetchData();
    fetchAnticipationStats();
  }, [range, accountFilter]);

  // ── Fetch last import date for sicredi ──
  useEffect(() => {
    if (accountFilter === 'sicredi') {
      fetch('/api/financeiro/extrato/last-import?account=sicredi')
        .then(r => r.json())
        .then(d => setLastImport(d.last_import))
        .catch(() => setLastImport(null));
    }
  }, [accountFilter, ofxResult]);

  const handleOfxUpload = async () => {
    if (!ofxFile) return;
    setOfxUploading(true); setOfxResult(null);
    try {
      const fd = new FormData();
      fd.append('file', ofxFile);
      fd.append('account', 'sicredi');
      const res = await fetch('/api/financeiro/extrato/importar-ofx', { method: 'POST', body: fd });
      if (!res.ok) throw new Error('Erro na importação');
      const data = await res.json();
      setOfxResult(data);
      // Reload extrato
      setLoading(true);
      const exRes = await fetch(`/api/financeiro/extrato?start=${range.start}&end=${range.end}&account=${accountFilter}`);
      if (exRes.ok) setExtrato(await exRes.json());
      setLoading(false);
    } catch (err) { console.error(err); }
    finally { setOfxUploading(false); }
  };

  // ── Fetch pending count ──
  const fetchPendingCount = async () => {
    try {
      const res = await fetch('/api/fin-reconciliation-rules/stats');
      const data = await res.json();
      setPendingCount(data.pending || 0);
    } catch {}
  };
  useEffect(() => { fetchPendingCount(); }, []);

  // ── Fetch month-based tabs ──
  useEffect(() => {
    if (activeTab === 'Extrato' && despesasRefreshKey === 0) return;
    const fetchMonthData = async () => {
      try {
        setTabLoading(true);
        const m = selectedMonth;
        const [resDespesas, resReceitas, resInadimplentes, resClientes, resPrevisto, resResumo] = await Promise.all([
          fetch(`/api/financeiro/despesas?mes=${m}`),
          fetch(`/api/financeiro/receitas?mes=${m}`),
          fetch(`/api/financeiro/inadimplentes?mes=${m}`),
          fetch(`/api/financeiro/clientes-recentes?mes=${m}`),
          fetch(`/api/financeiro/previsto?mes=${m}`),
          fetch(`/api/financeiro/resumo?mes=${m}`),
        ]);
        setDespesas(resDespesas.ok ? await resDespesas.json() : []);
        setReceitas(resReceitas.ok ? await resReceitas.json() : []);
        setInadimplentes(resInadimplentes.ok ? await resInadimplentes.json() : []);
        setClientes(resClientes.ok ? await resClientes.json() : []);
        setPrevisto(resPrevisto.ok ? await resPrevisto.json() : null);
        setResumo(resResumo.ok ? await resResumo.json() : null);
      } catch (err) {
        console.error('Error fetching month data:', err);
      } finally {
        setTabLoading(false);
      }
    };
    fetchMonthData();
  }, [activeTab, selectedMonth, despesasRefreshKey]);

  // ── Extrato local state ──
  const handleCategorySave = (id: number, category: string) => {
    setExtrato(prev => prev.map(item =>
      item.id === id ? { ...item, grapehub_category: category || null } : item
    ));
    // Força re-fetch da aba Despesas para refletir a nova categoria
    setDespesasRefreshKey(k => k + 1);
  };

  const rangeLabel = range.start && range.end
    ? range.start === range.end ? formatDateBR(range.start) : `${formatDateBR(range.start)} → ${formatDateBR(range.end)}`
    : '';

  const filtered = extrato.filter(item => {
    // Hide anticipation pairs if toggle is on
    if (hideAnticipation && item.is_anticipation_pair) return false;
    const descMatch =
      (item.description || '').toLowerCase().includes(search.toLowerCase()) ||
      (item.person_fantasy_name || item.person_name || '').toLowerCase().includes(search.toLowerCase());
    if (!descMatch) return false;
    if (typeFilter === 'entradas')   return item.type === 1;
    if (typeFilter === 'saidas')     return item.type === -1;
    if (typeFilter === 'realizados') return item.type_column === 'realizado';
    if (typeFilter === 'previstos')  return item.type_column === 'previsto';
    return true;
  }).filter(item => {
    if (!categoryFilter) return true;
    if (categoryFilter === '__sem_categoria__') {
      // Use raw_grapehub_category: null means no real category in DB (ignores autoCategory fallback)
      return !item.raw_grapehub_category && !item.custom_category;
    }
    const itemCat = getCategory(item).name;
    return itemCat === categoryFilter;
  });

  // Categorias únicas presentes no extrato atual (para o dropdown)
  const availableCategories = Array.from(
    new Set(extrato.map(item => getCategory(item).name))
  ).sort();

  const totalEntradas = filtered.filter(i => i.type === 1  && i.type_column === 'realizado').reduce((s, i) => s + parseFloat(i.value || i.movement_value || '0'), 0);
  const totalSaidas   = filtered.filter(i => i.type === -1 && i.type_column === 'realizado').reduce((s, i) => s + parseFloat(i.value || i.movement_value || '0'), 0);
  const resultado     = totalEntradas - totalSaidas;

  // ── Month tabs computed ──
  const totalInadimplencia = inadimplentes.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const maxAtraso = inadimplentes.length > 0 ? Math.max(...inadimplentes.map(i => i.dias_atraso)) : 0;

  // Month picker helpers
  const [selY, selM] = selectedMonth.split('-').map(Number);

  function prevMonth() {
    let m = selM - 1, y = selY;
    if (m < 1) { m = 12; y--; }
    setSelectedMonth(`${y}-${String(m).padStart(2,'0')}`);
  }
  function nextMonth() {
    let m = selM + 1, y = selY;
    if (m > 12) { m = 1; y++; }
    setSelectedMonth(`${y}-${String(m).padStart(2,'0')}`);
  }

  const monthLabel = `${MESES_FULL[selM - 1]} ${selY}`;

  return (
    <>
    <div className="min-h-screen bg-dark-bg transition-colors duration-300">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">
            Extra<span className="text-violet-500">to</span>
          </h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">
            {activeTab === 'Extrato' ? (rangeLabel || 'Todas as movimentações bancárias') : `Referência: ${monthLabel}`}
          </p>
        </div>

        {/* Switcher de data por aba + Rules button */}
        <div className="flex items-center gap-3">
        {activeTab === 'Extrato' ? (
          <DateRangePicker range={range} onChange={setRange} />
        ) : (
          <div className="flex items-center gap-1">
            <button onClick={prevMonth}
              className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover">
              <ChevronDown size={14} className="text-slate-400 rotate-90" />
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-violet-500/60 rounded-xl">
              <Calendar size={16} className="text-violet-500" />
              <span className="text-sm font-bold text-dark-text">{monthLabel}</span>
            </div>
            <button onClick={nextMonth}
              className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover">
              <ChevronDown size={14} className="text-slate-400 -rotate-90" />
            </button>
          </div>
        )}

          {/* Rules button */}
          <button
            onClick={() => setShowRulesModal(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-dark-card border border-white/10 hover:border-violet-500/40 rounded-xl transition-all hover:bg-dark-card-hover group"
          >
            <Zap size={14} className="text-violet-400" />
            <span className="text-xs font-bold text-dark-text/70 group-hover:text-dark-text">Regras</span>
            {pendingCount > 0 && (
              <span className="px-1.5 py-0.5 bg-amber-500/20 text-amber-400 text-[9px] font-bold rounded-full">
                {pendingCount}
              </span>
            )}
          </button>
        </div>
      </div>


      {/* ── Tab: Extrato ── */}
      {activeTab === 'Extrato' && (
        <div className="px-6 md:px-8 pb-8 space-y-6">
          {/* KPI Cards */}
          <div className="grid grid-cols-3 lg:grid-cols-4 gap-4">
            {[
              { label: 'Total Entradas', value: totalEntradas, color: 'text-emerald-400' },
              { label: 'Total Saídas',   value: totalSaidas,   color: 'text-rose-400' },
              { label: 'Resultado',       value: resultado,     color: resultado >= 0 ? 'text-emerald-400' : 'text-rose-400' },
            ].map(({ label, value, color }) => (
              <div key={label} className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">{label}</p>
                {loading
                  ? <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
                  : <p className={`text-2xl font-black ${color}`}>{formatCurrency(value)}</p>
                }
              </div>
            ))}
            {/* Anticipation KPI Card */}
            <div className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Antecipações no Mês</p>
              {loading || !anticipationStats
                ? <div className="h-8 w-32 bg-white/5 rounded animate-pulse" />
                : (
                  <>
                    <p className="text-2xl font-black text-violet-400">{formatCurrency(anticipationStats.liquido)}</p>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] text-slate-500">Bruto: {formatCurrency(anticipationStats.antecipado_bruto)}</span>
                      <span className="text-[9px] text-rose-400">Taxas: -{formatCurrency(anticipationStats.taxas_antecipacao)}</span>
                    </div>
                    {anticipationStats.count_pares > 0 && (
                      <span className="inline-flex items-center gap-1 mt-1.5 text-[9px] font-bold text-slate-500">
                        <Link2 size={8} />{anticipationStats.count_pares} pares identificados
                      </span>
                    )}
                  </>
                )
              }
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative flex-1 min-w-[220px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text" placeholder="Buscar movimentação..."
                value={search} onChange={e => setSearch(e.target.value)}
                className="w-full pl-9 pr-4 py-2.5 text-sm bg-dark-card border border-white/10 rounded-xl text-dark-text placeholder:text-slate-600 outline-none focus:ring-2 focus:ring-violet-500/30"
              />
            </div>
            <div className="flex items-center gap-2 flex-wrap">
              {(['todos','entradas','saidas','realizados','previstos'] as const).map(f => (
                <button key={f} onClick={() => setTypeFilter(f)}
                  className={`px-3.5 py-2 text-xs font-bold rounded-xl transition-all ${
                    typeFilter === f
                      ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/20'
                      : 'bg-dark-card border border-white/10 text-slate-400 hover:text-white'
                  }`}>
                  {f.charAt(0).toUpperCase() + f.slice(1)}
                </button>
              ))}
              {/* Category filter dropdown */}
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                style={{ colorScheme: 'dark', backgroundColor: categoryFilter ? undefined : 'rgb(var(--dark-card))' }}
                className={`px-3 py-2 text-xs font-bold rounded-xl border transition-all outline-none cursor-pointer ${
                  categoryFilter
                    ? 'bg-violet-500/10 border-violet-500/40 text-violet-400'
                    : 'bg-dark-card border-white/10 text-slate-400'
                }`}
              >
                <option value="">Todas categorias</option>
                <option value="__sem_categoria__">⚠️ Sem categoria</option>
                {availableCategories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {/* Account filter */}
              <div className="flex items-center gap-1 ml-1 bg-dark-card border border-white/10 rounded-xl p-0.5">
                {([['all', 'Todas'], ['asaas', 'Asaas'], ['sicredi', 'Sicredi']] as const).map(([val, label]) => (
                  <button key={val} onClick={() => setAccountFilter(val as any)}
                    className={`px-2.5 py-1.5 text-[10px] font-bold rounded-lg transition-all ${
                      accountFilter === val ? 'bg-violet-500 text-white' : 'text-slate-400 hover:text-white'
                    }`}>{label}</button>
                ))}
              </div>
              {accountFilter === 'sicredi' && (
                <>
                  <span className="text-[10px] text-slate-500">
                    {lastImport ? `Última importação: ${new Date(lastImport).toLocaleDateString('pt-BR')}` : 'Nenhuma importação ainda'}
                  </span>
                  <button onClick={() => { setOfxFile(null); setOfxResult(null); setShowOfxModal(true); }}
                    className="flex items-center gap-1.5 px-3 py-2 bg-blue-500/15 border border-blue-500/30 text-blue-400 text-xs font-bold rounded-xl hover:bg-blue-500/25 transition-all">
                    <Upload size={12} /> Importar OFX
                  </button>
                </>
              )}
            </div>
            {/* Hide anticipation toggle */}
            <button
              onClick={() => setHideAnticipation(!hideAnticipation)}
              className={`flex items-center gap-1.5 px-3 py-2 text-xs font-bold rounded-xl transition-all ${
                hideAnticipation
                  ? 'bg-violet-500/15 border border-violet-500/40 text-violet-400'
                  : 'bg-dark-card border border-white/10 text-slate-400 hover:text-white'
              }`}
            >
              {hideAnticipation ? <EyeOff size={12} /> : <Eye size={12} />}
              {hideAnticipation ? 'Antecipações ocultas' : 'Ocultar antecipações'}
            </button>
            <span className="text-xs text-slate-500 ml-1">{loading ? '...' : `${filtered.length} registros`}</span>
          </div>

          {/* Table */}
          <div className="bg-dark-card border border-white/10 rounded-2xl overflow-visible relative">
            <div className={`grid ${accountFilter === 'all' ? 'grid-cols-[1fr_160px_80px_90px_100px_110px_120px]' : 'grid-cols-[1fr_160px_90px_100px_110px_120px]'} px-5 py-3 border-b border-white/5 sticky top-0 z-10 bg-dark-card`}>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Descrição / Contraparte</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Categoria</span>
              {accountFilter === 'all' && <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center">Conta</span>}
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center px-4">Tipo</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-center px-4">Status</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right px-4">Data</span>
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider text-right pl-4">Valor</span>
            </div>
            <div className="divide-y divide-white/5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 320px)' }}>
              {loading ? (
                Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="flex items-center gap-4 px-5 py-4">
                    <div className="flex-1 space-y-1.5">
                      <div className="h-3 w-48 bg-white/5 rounded animate-pulse" />
                      <div className="h-2.5 w-32 bg-white/5 rounded animate-pulse" />
                    </div>
                    <div className="h-6 w-28 bg-white/5 rounded-lg animate-pulse" />
                    <div className="h-5 w-16 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-5 w-16 bg-white/5 rounded-full animate-pulse" />
                    <div className="h-3 w-20 bg-white/5 rounded animate-pulse" />
                    <div className="h-4 w-24 bg-white/5 rounded animate-pulse" />
                  </div>
                ))
              ) : error ? (
                <div className="py-16 text-center">
                  <p className="text-sm font-bold text-rose-400">{error}</p>
                </div>
              ) : filtered.length === 0 ? (
                <div className="py-16 text-center">
                  <FileText size={32} className="mx-auto text-slate-600 mb-3" />
                  <p className="text-sm font-bold text-slate-500">Nenhuma movimentação encontrada</p>
                  {(search || typeFilter !== 'todos') && (
                    <button onClick={() => { setSearch(''); setTypeFilter('todos'); }}
                      className="mt-3 text-xs text-violet-400 hover:text-violet-300 font-bold">
                      Limpar filtros
                    </button>
                  )}
                </div>
              ) : (
                filtered.map((item, idx) => {
                  const valor     = parseFloat(item.value || item.movement_value || '0');
                  const isEntrada = item.type === 1;
                  const isReal    = item.type_column === 'realizado';
                  const contra    = item.person_fantasy_name || item.person_name;
                  return (
                    <div key={item.id || idx}
                      onClick={(e) => {
                        if ((e.target as HTMLElement).closest('[data-category-picker]')) return;
                        setSelectedTransaction(item);
                        setModalComments(item.comments || '');
                        setModalDescription(item.custom_description || item.description || '');
                        setModalSaved(false);
                      }}
                      className={`grid ${accountFilter === 'all' ? 'grid-cols-[1fr_160px_80px_90px_100px_110px_120px]' : 'grid-cols-[1fr_160px_90px_100px_110px_120px]'} px-5 py-3.5 hover:bg-white/[0.02] transition-colors items-center cursor-pointer`}>
                      <div className="min-w-0 pr-4">
                        <div className="flex items-center gap-1.5">
                          <p className={`text-sm font-medium truncate ${item.is_anticipation_pair ? 'text-slate-500' : 'text-dark-text'}`}>{item.description || '—'}</p>
                          {item.is_anticipation_pair && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-slate-500/10 text-slate-400 text-[9px] font-bold rounded-full">
                              <Link2 size={8} /> Antecipação
                            </span>
                          )}
                          {item.is_edited && !item.is_anticipation_pair && (
                            <span className="shrink-0 inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold rounded-full">
                              <Pencil size={8} /> Editado
                            </span>
                          )}
                        </div>
                        {contra && <p className="text-[11px] text-slate-500 truncate mt-0.5">{contra}</p>}
                      </div>
                      <div className="flex justify-center" data-category-picker><CategoryPicker item={item} onSave={handleCategorySave} /></div>
                      {accountFilter === 'all' && (
                        <div className="flex justify-center">
                          <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                            (item.account || 'asaas') === 'sicredi' ? 'bg-blue-500/15 text-blue-400' : 'bg-violet-500/15 text-violet-400'
                          }`}>{(item.account || 'asaas') === 'sicredi' ? 'Sicredi' : 'Asaas'}</span>
                        </div>
                      )}
                      <div className="flex justify-center px-4">
                        <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isEntrada ? 'bg-emerald-500/10 text-emerald-400' : 'bg-rose-500/10 text-rose-400'
                        }`}>
                          {isEntrada ? <ArrowUp size={10} /> : <ArrowDown size={10} />}
                          {isEntrada ? 'Entrada' : 'Saída'}
                        </span>
                      </div>
                      <div className="flex justify-center px-4">
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold ${
                          isReal ? 'bg-violet-500/15 text-violet-400' : 'bg-slate-500/15 text-slate-400'
                        }`}>
                          {isReal ? 'Realizado' : 'Previsto'}
                        </span>
                      </div>
                      <div className="text-right px-4">
                        <span className="text-xs text-slate-400">{fmtDate(getItemDate(item))}</span>
                      </div>
                      <div className="text-right pl-4">
                        <span className={`text-sm font-bold ${item.is_anticipation_pair ? 'text-slate-500 line-through' : isEntrada ? 'text-emerald-400' : 'text-rose-400'}`}>
                          {isEntrada ? '+' : '-'}{formatCurrency(Math.abs(valor))}
                        </span>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── Transaction Detail Modal ── */}
      {selectedTransaction && createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setSelectedTransaction(null)}>
          <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
          <div className="relative w-full max-w-lg mx-4 bg-dark-card border border-dark-text/10 rounded-2xl shadow-2xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}>
            {/* Header */}
            <div className="flex items-center justify-between px-6 pt-5 pb-4 border-b border-dark-text/10">
              <div className="flex items-center gap-3">
                <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${
                  selectedTransaction.type === 1 ? 'bg-emerald-500/15' : 'bg-rose-500/15'
                }`}>
                  {selectedTransaction.type === 1
                    ? <ArrowUp size={20} className="text-emerald-400" />
                    : <ArrowDown size={20} className="text-rose-400" />
                  }
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className="text-sm font-bold text-dark-text">Detalhes da Transação</h3>
                    {selectedTransaction.is_edited && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 bg-amber-500/10 text-amber-400 text-[9px] font-bold rounded-full">
                        <Pencil size={8} /> Editado
                      </span>
                    )}
                  </div>
                  <p className="text-[10px] text-dark-text/50 uppercase tracking-widest mt-0.5">
                    {selectedTransaction.type === 1 ? 'Entrada' : 'Saída'} • {selectedTransaction.status}
                    {selectedTransaction.edited_at && ` • Editado em ${fmtDate(selectedTransaction.edited_at)}`}
                  </p>
                </div>
              </div>
              <button onClick={() => setSelectedTransaction(null)}
                className="w-8 h-8 rounded-lg bg-dark-text/5 hover:bg-dark-text/10 flex items-center justify-center transition-colors">
                <X size={16} className="text-dark-text/50" />
              </button>
            </div>

            {/* Content */}
            <div className="px-6 py-5 space-y-4 max-h-[65vh] overflow-y-auto">
              {/* Description — editable */}
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <Pencil size={12} className="text-violet-400" />
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Descrição</label>
                </div>
                <input
                  type="text"
                  value={modalDescription}
                  onChange={(e) => setModalDescription(e.target.value)}
                  className="w-full bg-dark-bg border border-dark-text/10 rounded-xl px-3 py-2.5 text-sm text-dark-text placeholder-dark-text/30 focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  placeholder="Descrição personalizada..."
                />
                {selectedTransaction.original_description && modalDescription !== selectedTransaction.original_description && (
                  <p className="text-[10px] text-dark-text/30 mt-1 flex items-center gap-1">
                    <span className="text-dark-text/20">Original:</span> {selectedTransaction.original_description}
                  </p>
                )}
              </div>

              {/* Person */}
              {(selectedTransaction.person_fantasy_name || selectedTransaction.person_name) && (
                <div>
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Contraparte</label>
                  <p className="text-sm text-dark-text mt-1">{selectedTransaction.person_fantasy_name || selectedTransaction.person_name}</p>
                </div>
              )}

              {/* Info Grid */}
              <div className="grid grid-cols-2 gap-3">
                <div className="bg-dark-bg rounded-xl p-3 border border-dark-text/5">
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Valor</label>
                  <p className={`text-lg font-black mt-1 ${selectedTransaction.type === 1 ? 'text-emerald-400' : 'text-rose-400'}`}>
                    {selectedTransaction.type === 1 ? '+' : '-'}{formatCurrency(Math.abs(parseFloat(selectedTransaction.value || '0')))}
                  </p>
                </div>
                <div className="bg-dark-bg rounded-xl p-3 border border-dark-text/5">
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Data</label>
                  <p className="text-sm font-bold text-dark-text mt-1">{fmtDate(selectedTransaction.movement_date || selectedTransaction.expiration_date || '')}</p>
                </div>
                {/* Category — editable */}
                <div className="bg-dark-bg rounded-xl p-3 border border-dark-text/5 relative">
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Categoria</label>
                  <div className="mt-1">
                    <CategoryPicker
                      item={selectedTransaction}
                      onSave={(id, cat) => {
                        handleCategorySave(id, cat);
                        setSelectedTransaction({ ...selectedTransaction, grapehub_category: cat, custom_category: cat });
                      }}
                    />
                  </div>
                </div>
                <div className="bg-dark-bg rounded-xl p-3 border border-dark-text/5">
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Método</label>
                  <p className="text-sm font-bold text-dark-text mt-1 capitalize">{selectedTransaction.payment_method || '—'}</p>
                </div>
              </div>

              {/* Document Code */}
              {selectedTransaction.document_code && (
                <div className="flex items-center gap-2 bg-dark-bg rounded-xl p-3 border border-dark-text/5">
                  <div className="flex-1">
                    <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Código do Documento</label>
                    <p className="text-xs text-dark-text mt-1 font-mono">{selectedTransaction.document_code}</p>
                  </div>
                  <button onClick={() => navigator.clipboard.writeText(selectedTransaction.document_code)}
                    className="w-8 h-8 rounded-lg bg-dark-text/5 hover:bg-dark-text/10 flex items-center justify-center transition-colors"
                    title="Copiar código">
                    <Copy size={14} className="text-dark-text/50" />
                  </button>
                </div>
              )}

              {/* Comments */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <MessageSquare size={14} className="text-violet-400" />
                  <label className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest">Comentários</label>
                </div>
                <textarea
                  value={modalComments}
                  onChange={(e) => setModalComments(e.target.value)}
                  placeholder="Adicione um comentário sobre esta transação..."
                  className="w-full bg-dark-bg border border-dark-text/10 rounded-xl p-3 text-sm text-dark-text placeholder-dark-text/30 resize-none focus:outline-none focus:border-violet-500/50 focus:ring-1 focus:ring-violet-500/20 transition-all"
                  rows={3}
                />
              </div>

              {/* Unified Save Button */}
              <button
                onClick={async () => {
                  try {
                    setSavingModal(true);
                    const body: any = {};

                    // Check if description changed from original
                    const origDesc = selectedTransaction.original_description || '';
                    if (modalDescription && modalDescription !== origDesc) {
                      body.custom_description = modalDescription;
                    } else if (modalDescription === origDesc && selectedTransaction.custom_description) {
                      // User reverted to original — clear custom description
                      body.custom_description = null;
                    }

                    // Always send comment
                    body.user_comment = modalComments || null;

                    const res = await fetch(`/api/financeiro/extrato/${selectedTransaction.id}`, {
                      method: 'PATCH',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify(body),
                    });

                    if (res.ok) {
                      setModalSaved(true);
                      const hasCustomDesc = !!(body.custom_description);
                      const newIsEdited = hasCustomDesc;
                      const newDescription = body.custom_description || origDesc;
                      setExtrato(prev => prev.map(e => e.id === selectedTransaction.id ? {
                        ...e,
                        description: newDescription,
                        custom_description: body.custom_description || null,
                        comments: modalComments || null,
                        is_edited: newIsEdited,
                      } : e));
                      setSelectedTransaction({
                        ...selectedTransaction,
                        description: newDescription,
                        custom_description: body.custom_description || null,
                        comments: modalComments || null,
                        is_edited: newIsEdited,
                      });
                      setTimeout(() => setModalSaved(false), 2000);
                    }
                  } catch (err) {
                    console.error('Error saving:', err);
                  } finally {
                    setSavingModal(false);
                  }
                }}
                disabled={savingModal}
                className="w-full py-2.5 bg-violet-600 hover:bg-violet-500 disabled:bg-violet-600/50 text-white text-xs font-bold rounded-xl transition-colors flex items-center justify-center gap-2"
              >
                {savingModal ? (
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                ) : modalSaved ? (
                  <>
                    <Check size={14} />
                    Salvo!
                  </>
                ) : (
                  <>
                    <Check size={14} />
                    Salvar Alterações
                  </>
                )}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}
    <ReconciliationModal
      open={showRulesModal}
      onClose={() => setShowRulesModal(false)}
      onApplied={async () => {
        // Refresh extrato and pending count
        try {
          const res = await fetch(`/api/financeiro/extrato?start=${range.start}&end=${range.end}&account=${accountFilter}`);
          if (res.ok) setExtrato(await res.json());
        } catch {}
        fetchPendingCount();
        // Invalidate category cache
        _cachedCatTree = null;
      }}
    />

    {/* OFX Import Modal */}
    {showOfxModal && createPortal(
      <div className="fixed inset-0 z-[9999] flex items-center justify-center" onClick={() => setShowOfxModal(false)}>
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" />
        <div className="relative bg-dark-bg border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-dark-text">Importar Extrato <span className="text-blue-400">Sicredi</span></h3>
            <button onClick={() => setShowOfxModal(false)} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={14} className="text-slate-400" /></button>
          </div>

          {ofxResult ? (
            <div className="space-y-4">
              <div className="bg-emerald-500/5 border border-emerald-500/20 rounded-xl p-5 text-center">
                <p className="text-2xl font-black text-emerald-400">{ofxResult.inserted}</p>
                <p className="text-xs text-emerald-400/70 mt-1">registros importados</p>
              </div>
              {ofxResult.skipped > 0 && (
                <div className="bg-amber-500/5 border border-amber-500/20 rounded-xl p-4 text-center">
                  <p className="text-sm font-bold text-amber-400">{ofxResult.skipped} já existiam</p>
                </div>
              )}
              <button onClick={() => setShowOfxModal(false)} className="w-full py-2.5 bg-violet-500 hover:bg-violet-600 rounded-xl text-xs font-bold text-white transition-all">Fechar</button>
            </div>
          ) : (
            <div className="space-y-4">
              <div className="border-2 border-dashed border-white/10 rounded-xl p-8 text-center hover:border-blue-500/30 transition-colors">
                <Upload size={28} className="mx-auto text-slate-500 mb-3" />
                <p className="text-xs text-slate-400 mb-3">Selecione o arquivo CSV ou OFX do Sicredi</p>
                <input
                  type="file"
                  accept=".csv,.CSV,.ofx,.OFX"
                  onChange={e => setOfxFile(e.target.files?.[0] || null)}
                  className="block mx-auto text-xs text-slate-400 file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-blue-500/15 file:text-blue-400 hover:file:bg-blue-500/25 file:cursor-pointer file:transition-all"
                />
              </div>
              {ofxFile && (
                <div className="flex items-center gap-2 px-3 py-2 bg-blue-500/5 border border-blue-500/20 rounded-xl">
                  <FileText size={14} className="text-blue-400" />
                  <span className="text-xs text-blue-400 font-medium flex-1 truncate">{ofxFile.name}</span>
                  <span className="text-[10px] text-slate-500">{(ofxFile.size / 1024).toFixed(1)} KB</span>
                </div>
              )}
              <button
                onClick={handleOfxUpload}
                disabled={!ofxFile || ofxUploading}
                className="w-full flex items-center justify-center gap-2 py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 disabled:cursor-not-allowed rounded-xl text-xs font-bold text-white transition-all"
              >
                {ofxUploading ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                {ofxUploading ? 'Importando...' : 'Importar'}
              </button>
            </div>
          )}
        </div>
      </div>,
      document.body
    )}
    </>
  );
}
