import React, { useState, useEffect, useRef } from 'react';
import ReactDOM from 'react-dom';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, LineController, BarController } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MoreVertical, DollarSign, TrendingUp, TrendingDown, AlertCircle, Wallet, Calendar, AlertTriangle, ArrowUpRight, ShieldAlert, Users, ChevronDown, ChevronUp, X, ArrowUp, ArrowDown } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { designSystem } from '../design-system';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, LineController, BarController);

interface Resumo {
  saldo_caixa: number;
  previsto_fim_mes: number;
  recebido: number;
  a_receber: number;
  faturamento_total: number;
  pago: number;
  a_pagar: number;
  despesas_total: number;
  saldo_periodo: number;
}

interface FluxoDiario {
  dia: string;
  dia_numero: number;
  entradas_realizadas: string;
  entradas_previstas: string;
  saidas_realizadas: string;
  saidas_previstas: string;
  saidas: string;
  tem_realizado: boolean;
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

interface Previsto {
  entradas_previstas: string;
  despesas_previstas: string;
  saldo_projetado: string;
}

interface Despesa {
  description: string;
  movement_value: string;
  value: string;
  movement_date: string;
  expiration_date: string;
  status: string;
  type_column: string;
  category_l1_ext_id: number;
  category_l2_ext_id: number;
  category_l3_ext_id: number;
  payment_method: string;
  document_code: string;
}

interface Receita extends Despesa {}

const StatCard = ({ icon: Icon, title, value, subtitle, colorClass, isNegative = false }: { 
  icon: any, title: string, value: string, subtitle?: string | React.ReactNode, colorClass: string, isNegative?: boolean
}) => (
  <div className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden transition-all duration-200 flex flex-col min-h-[160px]">
    <div className="flex items-center justify-between mb-4">
      <div className={`p-2.5 rounded-2xl ${colorClass}`}>
        <Icon size={20} className="text-white" />
      </div>
      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">{title}</p>
    </div>
    <div className="flex flex-col mt-auto">
      <h3 className={`text-3xl font-black tracking-tight mb-3 ${isNegative ? 'text-red-500/80 dark:text-red-400/80' : 'text-dark-text'}`}>
        {value}
      </h3>
      {subtitle && (
        <div className="pt-3 border-t border-white/10">
          {subtitle}
        </div>
      )}
    </div>
  </div>
);

const CATEGORIES_CONFIG = [
  { name: 'Impostos', icon: '📊', keywords: ['Simples Nacional', 'ISS', 'IRPJ', 'Imposto', 'DAS', 'PIS', 'COFINS', 'CSLL', 'Taxa Municipal', 'Alvará'] },
  { name: 'Salários e Pessoal', icon: '👥', keywords: ['Remuneração', 'Salário', 'Bonificação', 'Business Partner', 'FGTS', 'IRRF', 'Folha', 'Férias', '13º', 'Rescisão', 'Benefício', 'Vale', 'Plano de Saúde', 'Odonto', 'Seguro de Vida'] },
  { name: 'Prestação de Serviço', icon: '🛠️', keywords: ['Ferramenta', 'Software', 'VPS', 'Domínio', 'Hospedagem', 'AWS', 'Google Cloud', 'Vercel', 'OpenAI', 'Claude', 'Github', 'Cursor', 'Slack', 'Zoom', 'Canva', 'Adobe', 'Figma', 'Notion', 'Trello', 'Jira'] },
  { name: 'Marketing e Vendas', icon: '📣', keywords: ['Comissão', 'Tráfego Pago', 'Facebook Ads', 'Google Ads', 'Meta Ads', 'Marketing', 'Publicidade', 'Influenciador', 'RD Station', 'Hubspot', 'ActiveCampaign', 'LinkedIn Ads', 'TikTok Ads'] },
  { name: 'Administrativo', icon: '🏢', keywords: ['Aluguel', 'Condomínio', 'Energia', 'Internet', 'Assessoria Financeira', 'Contabilidade', 'Limpeza', 'Escritório', 'Material', 'Seguro', 'Água', 'Telefone', 'Correios', 'Cartório'] },
  { name: 'Despesas Financeiras', icon: '💳', keywords: ['Taxa', 'Tarifa Asaas', 'Taxa de antecipação', 'Juros', 'IOF', 'Banco', 'Tarifa', 'Anuidade', 'TED', 'Boleto'] },
  { name: 'Distribuição de Lucros', icon: '💰', keywords: ['Pró-labore', 'Dividendo', 'INSS', 'Retirada', 'Lucro', 'Sócio'] },
  { name: 'Não Operacional', icon: '📦', keywords: ['Compra de cotas', 'Investimento', 'Empréstimo', 'Amortização', 'Aporte', 'Financiamento'] },
];

const PIE_COLORS = ['#8B5CF6', '#10B981', '#F59E0B', '#EF4444', '#3B82F6', '#EC4899', '#6366F1', '#14B8A6', '#94A3B8'];

const extractCreditCardTool = (description: string) => {
  if (!description.includes('-')) return description;
  let tool = description.split('-')[1].trim();
  
  // Mapeamentos específicos solicitados
  if (tool.toLowerCase().includes('google worksp')) return 'Google Workspace';
  
  return tool;
};

const categorizeExpense = (description: string) => {
  const desc = description.toLowerCase();
  
  // Regra de prioridade para Cartão de Crédito
  if (desc.includes('cartão de crédito') || desc.includes('cartao de credito') || desc.includes('cartão de cred') || desc.includes('cartao de cred')) {
    return { name: 'Cartão de Crédito', icon: '💳' };
  }

  for (const cat of CATEGORIES_CONFIG) {
    if (cat.keywords.some(k => desc.includes(k.toLowerCase()))) {
      return cat;
    }
  }
  return { name: 'Outros', icon: '📁' };
};

const CollapsibleGroup = ({ category, items, total, icon, formatCurrency }: any) => {
  const [isOpen, setIsOpen] = useState(false);
  
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
          <span className="text-sm font-bold text-dark-text">{formatCurrency(total)}</span>
          {isOpen ? <ChevronUp size={16} className="text-slate-400" /> : <ChevronDown size={16} className="text-slate-400" />}
        </div>
      </button>
      
      {isOpen && (
        <div className="bg-dark-bg p-2 space-y-1 border-t border-white/10">
          {items.map((item, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 hover:bg-dark-card rounded-lg transition-colors">
              <div className="flex flex-col">
                <span className="text-xs font-medium text-dark-text">{item.description}</span>
                <span className="text-[10px] text-slate-500">{item.date}</span>
              </div>
              <span className="text-xs font-bold text-dark-text">{formatCurrency(item.value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload;
    
    const entradasRealizadas = data.entradas_realizadas || 0;
    const entradasPrevistas = data.entradas_previstas || 0;
    const saidasRealizadas = data.saidas_realizadas || 0;
    const saidasPrevistas = data.saidas_previstas || 0;
    
    const totalEntradas = entradasRealizadas + entradasPrevistas;
    const totalSaidas = saidasRealizadas + saidasPrevistas;
    const saldo = totalEntradas - totalSaidas;
    
    const formatCurrency = (val: number) => 'R$ ' + val.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    
    return (
      <div className="bg-white rounded-[8px] shadow-[0_4px_12px_rgba(0,0,0,0.1)] p-3 border border-slate-100 font-sans text-[13px] min-w-[220px]">
        <div className="font-bold text-slate-700 mb-2">{label}</div>
        <hr className="border-slate-200 mb-2" />
        
        <div className="flex justify-between items-center mb-1">
          <span className="text-slate-600">↑ Entradas:</span>
          <span className="font-medium text-slate-800">
            {formatCurrency(totalEntradas)}
            {entradasPrevistas > 0 && <span className="text-slate-400 ml-1 text-xs">(previsto)</span>}
          </span>
        </div>
        
        <div className="flex justify-between items-center mb-2">
          <span className="text-slate-600">↓ Saídas:</span>
          <span className="font-medium text-slate-800">
            {formatCurrency(totalSaidas)}
            {saidasPrevistas > 0 && <span className="text-slate-400 ml-1 text-xs">(previsto)</span>}
          </span>
        </div>
        
        <hr className="border-slate-200 my-2" />
        
        <div className="flex justify-between items-center font-bold">
          <span className="text-slate-700">Saldo do dia:</span>
          <span className={saldo >= 0 ? 'text-emerald-500' : 'text-red-500'}>
            {saldo < 0 ? '- ' : ''}{formatCurrency(Math.abs(saldo))}
          </span>
        </div>
      </div>
    );
  }
  return null;
};

const MESES_FULL_FIN = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];

export default function FinanceiroDashboard() {
  const [selectedMonth, setSelectedMonth] = useState(() => new Date().toISOString().slice(0, 7));
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [fluxo, setFluxo] = useState<FluxoDiario[]>([]);
  const [saldoAnterior, setSaldoAnterior] = useState<number>(0);
  const [clientes, setClientes] = useState<ClienteRecente[]>([]);
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([]);
  const [previsto, setPrevisto] = useState<Previsto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [dayPopup, setDayPopup] = useState<{ iso: string; label: string; items: any[] } | null>(null);
  const [dayLoading, setDayLoading] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const m = selectedMonth;
        const [resResumo, resFluxo, resClientes, resInadimplentes, resPrevisto] = await Promise.all([
          fetch(`/api/financeiro/resumo?mes=${m}`),
          fetch(`/api/financeiro/fluxo-diario?mes=${m}`),
          fetch(`/api/financeiro/clientes-recentes?mes=${m}`),
          fetch(`/api/financeiro/inadimplentes?mes=${m}`),
          fetch(`/api/financeiro/previsto?mes=${m}`),
        ]);

        if (!resResumo.ok || !resFluxo.ok || !resClientes.ok || !resInadimplentes.ok || !resPrevisto.ok) {
          throw new Error('Falha ao carregar dados financeiros');
        }

        const fluxoData = await resFluxo.json();

        setResumo(await resResumo.json());
        setFluxo(fluxoData.diario || (Array.isArray(fluxoData) ? fluxoData : []));
        setSaldoAnterior(fluxoData.saldo_anterior || 0);
        setClientes(await resClientes.json());
        setInadimplentes(await resInadimplentes.json());
        setPrevisto(await resPrevisto.json());
      } catch (err: any) {
        setError(err.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [selectedMonth]);

  const formatCurrency = (value: string | number) => {
    const num = typeof value === 'string' ? parseFloat(value) : value;
    return (num || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-8 h-8 border-4 border-violet-600 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="bg-white/80 dark:bg-dark-bg/80 p-6 rounded-3xl border border-red-200 dark:border-red-900/30 text-red-600 dark:text-red-400 font-sans shadow-2xl">
          {error}
        </div>
      </div>
    );
  }

  const safeFluxo = Array.isArray(fluxo) ? fluxo : [];
  
  // Usar o mês SELECIONADO, não o mês atual do calendário
  const [anoSel, mesSel] = selectedMonth.split('-').map(Number);
  const diasNoMes = new Date(anoSel, mesSel, 0).getDate();
  
  const todosOsDias = Array.from({ length: diasNoMes }, (_, i) => {
    const dia = i + 1;
    const diaStr = dia.toString().padStart(2, '0');
    const mesStr = String(mesSel).padStart(2, '0');
    const dataFormatada = `${diaStr}/${mesStr}`;
    
    const fluxoDoDia = safeFluxo.find(f => f.dia === dataFormatada);
    
    return {
      dia: dataFormatada,
      dia_numero: dia,
      entradas_realizadas: fluxoDoDia ? parseFloat(fluxoDoDia.entradas_realizadas) : 0,
      entradas_previstas: fluxoDoDia ? parseFloat(fluxoDoDia.entradas_previstas) : 0,
      saidas_realizadas: fluxoDoDia ? parseFloat(fluxoDoDia.saidas_realizadas) : 0,
      saidas_previstas: fluxoDoDia ? parseFloat(fluxoDoDia.saidas_previstas) : 0,
      tem_realizado: fluxoDoDia ? fluxoDoDia.tem_realizado : false
    };
  });

  const mesRef = selectedMonth.split('-').map(Number);
  const mesAbrev = ['JAN','FEV','MAR','ABR','MAI','JUN','JUL','AGO','SET','OUT','NOV','DEZ'][mesRef[1]-1];
  const labels = todosOsDias.map(f => `${f.dia} ${mesAbrev}`);

  const saldoCaixa = resumo?.saldo_caixa ?? 0;
  
  let ultimoIndiceRealizado = -1;
  for (let i = todosOsDias.length - 1; i >= 0; i--) {
    if (todosOsDias[i].tem_realizado) {
      ultimoIndiceRealizado = i;
      break;
    }
  }

  const saldoRealizadoData: (number | null)[] = [];
  const saldoPrevistoData: (number | null)[] = [];
  
  let saldoRealizadoAtual = saldoAnterior;
  
  for (let i = 0; i < todosOsDias.length; i++) {
    const f = todosOsDias[i];
    
    if (i <= ultimoIndiceRealizado) {
      const entradasDoDia = f.entradas_realizadas;
      const saidasDoDia = f.saidas_realizadas;
      saldoRealizadoAtual += (entradasDoDia - saidasDoDia);
      saldoRealizadoData.push(saldoRealizadoAtual);
      
      if (i === ultimoIndiceRealizado) {
        saldoPrevistoData.push(saldoRealizadoAtual);
      } else {
        saldoPrevistoData.push(null);
      }
    } else {
      saldoRealizadoData.push(null);
      
      let saldoPrevistoAnterior = i > 0 && saldoPrevistoData[i - 1] !== null ? saldoPrevistoData[i - 1]! : saldoRealizadoAtual;
      const entradasDoDia = f.entradas_previstas;
      const saidasDoDia = f.saidas_previstas;
      saldoPrevistoData.push(saldoPrevistoAnterior + (entradasDoDia - saidasDoDia));
    }
  }

  const saldoAcumulado = resumo?.previsto_fim_mes ?? saldoPrevistoData[saldoPrevistoData.length - 1] ?? saldoRealizadoData[saldoRealizadoData.length - 1] ?? 0;

  const chartSaudeData = {
    labels,
    datasets: [
      {
        type: 'line' as const,
        label: 'Realizado',
        data: saldoRealizadoData,
        borderColor: '#8B5CF6', // Roxo
        backgroundColor: 'rgba(139, 92, 246, 0.1)',
        borderWidth: 3,
        pointBackgroundColor: '#8B5CF6',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.4,
        fill: true,
      },
      {
        type: 'line' as const,
        label: 'Previsto',
        data: saldoPrevistoData,
        borderColor: '#C4B5FD', // Lilás
        borderWidth: 3,
        borderDash: [5, 5],
        pointBackgroundColor: '#C4B5FD',
        pointBorderColor: '#fff',
        pointBorderWidth: 2,
        pointRadius: 4,
        tension: 0.4,
        fill: false,
      }
    ]
  };

  const lineChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { 
        display: true,
        position: 'bottom' as const,
        labels: {
          font: { family: 'Inter', size: 12 },
          color: 'rgba(150, 150, 150, 1)',
          usePointStyle: true,
          padding: 20
        }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 17, 27, 0.9)',
        titleFont: { family: 'Inter', size: 12 },
        bodyFont: { family: 'Inter', size: 12 },
        padding: 12,
        cornerRadius: 8,
        displayColors: false,
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        grid: { color: 'rgba(150, 150, 150, 0.1)' },
        ticks: { 
          font: { family: 'Inter', size: 10 }, 
          color: 'rgba(150, 150, 150, 1)',
          callback: (value: any) => 'R$ ' + value.toLocaleString('pt-BR')
        }
      },
      x: {
        grid: { display: false },
        ticks: { font: { family: 'Inter', size: 10 }, color: 'rgba(150, 150, 150, 1)' }
      }
    }
  };

  const getInitials = (name: string) => (name || '??').substring(0, 2).toUpperCase();

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

  const totalInadimplencia = inadimplentes.reduce((acc, curr) => acc + parseFloat(curr.valor), 0);
  const maxAtraso = inadimplentes.length > 0 ? Math.max(...inadimplentes.map(i => i.dias_atraso)) : 0;

  // ── Bar click handler ──────────────────────────────────────────────────
  const handleBarClick = (barData: any) => {
    if (!barData?.dia) return;
    const diaStr: string = barData.dia;
    const [dd, mm] = diaStr.split('/');
    const [year] = selectedMonth.split('-');
    const iso = `${year}-${mm}-${dd}`;
    const label = `${dd}/${mm}/${year}`;
    setDayPopup({ iso, label, items: [] });
    setDayLoading(true);
    fetch(`/api/financeiro/extrato?start=${iso}&end=${iso}`)
      .then(res => res.ok ? res.json() : [])
      .then(items => setDayPopup({ iso, label, items: Array.isArray(items) ? items : [] }))
      .catch(() => setDayPopup({ iso, label, items: [] }))
      .finally(() => setDayLoading(false));
  };

  // Valores do resumo (agora vêm direto do backend)
  const saldoPeriodo = resumo?.saldo_periodo ?? 0;
  const valorRecebido = resumo?.recebido ?? 0;
  const valorAReceber = resumo?.a_receber ?? 0;
  const faturamentoTotal = resumo?.faturamento_total ?? 0;
  const valorPago = resumo?.pago ?? 0;
  const valorAPagar = resumo?.a_pagar ?? 0;
  const totalDespesasMes = resumo?.despesas_total ?? 0;

  return (
    <div className="min-h-screen bg-dark-bg p-8 font-sans text-dark-text transition-colors duration-300">
      <style>{`
        .recharts-surface:focus,
        .recharts-wrapper:focus,
        .recharts-wrapper svg:focus,
        .recharts-surface { outline: none !important; -webkit-tap-highlight-color: transparent; }
      `}</style>
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <PageHeader 
          title="Finan" 
          titleAccent="ceiro" 
          subtitle="Gestão integrada de caixa e indicadores de saúde do negócio"
        >
          <div className="flex items-center gap-1">
            {/* Seta esquerda */}
            <button
              onClick={() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                let nm = m - 1; let ny = y;
                if (nm < 1) { nm = 12; ny -= 1; }
                setSelectedMonth(`${ny}-${String(nm).padStart(2,'0')}`);
              }}
              className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover"
              title="Mês anterior"
            >
              <ChevronDown size={14} className="text-slate-400 rotate-90" />
            </button>
            {/* Label */}
            <div className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-violet-500/60 rounded-xl">
              <Calendar size={16} className="text-violet-500" />
              <span className="text-sm font-bold text-dark-text">
                {MESES_FULL_FIN[parseInt(selectedMonth.split('-')[1]) - 1]} {selectedMonth.split('-')[0]}
              </span>
            </div>
            {/* Seta direita */}
            <button
              onClick={() => {
                const [y, m] = selectedMonth.split('-').map(Number);
                let nm = m + 1; let ny = y;
                if (nm > 12) { nm = 1; ny += 1; }
                setSelectedMonth(`${ny}-${String(nm).padStart(2,'0')}`);
              }}
              className="w-9 h-9 rounded-xl bg-dark-card border border-white/10 hover:border-violet-500/60 flex items-center justify-center transition-all hover:bg-dark-card-hover"
              title="Próximo mês"
            >
              <ChevronDown size={14} className="text-slate-400 -rotate-90" />
            </button>
          </div>
        </PageHeader>

        {/* Visão Geral */}
        <>
            {/* Linha 1 - KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            icon={ArrowUpRight}
            title="Caixa"
            value={formatCurrency(saldoCaixa)}
            subtitle={
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Atual</span>
                    <span className={`font-semibold ${saldoCaixa >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                      {formatCurrency(saldoCaixa)}
                    </span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Previsto fim do mês</span>
                    <span className={`font-semibold ${saldoAcumulado >= 0 ? 'text-violet-400' : 'text-rose-400'}`}>
                      {formatCurrency(saldoAcumulado)}
                    </span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all duration-500 ${
                          saldoAcumulado >= saldoCaixa ? 'bg-violet-500' : 'bg-rose-400'
                        }`}
                        style={{ width: `${Math.min(100, Math.max(0, saldoCaixa > 0 ? (saldoAcumulado / saldoCaixa) * 100 : 0))}%` }}
                      />
                    </div>
                    <span className="text-[10px] font-bold text-slate-400">
                      {saldoCaixa > 0
                        ? `${saldoAcumulado >= saldoCaixa ? '+' : ''}${Math.round(((saldoAcumulado - saldoCaixa) / saldoCaixa) * 100)}%`
                        : '—'
                      }
                    </span>
                  </div>
                </div>
              </div>
            }
            colorClass="bg-emerald-600"
            isNegative={saldoCaixa < 0}
          />
          <StatCard 
            icon={TrendingUp} 
            title="Faturamento do Mês" 
            value={formatCurrency(faturamentoTotal)} 
            subtitle={
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Recebido</span>
                    <span className="font-semibold text-emerald-500">{formatCurrency(valorRecebido)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">A receber</span>
                    <span className="font-semibold text-slate-700 dark:text-slate-300">{formatCurrency(valorAReceber)}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (valorRecebido / (faturamentoTotal || 1)) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="ml-3 text-[10px] font-bold text-slate-400">
                      {Math.round((valorRecebido / (faturamentoTotal || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            }
            colorClass="bg-violet-600"
          />
          <StatCard 
            icon={TrendingDown} 
            title="Total de Despesas do Mês" 
            value={formatCurrency(totalDespesasMes)} 
            subtitle={
              <div className="space-y-3">
                <div className="flex flex-col gap-2">
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">Pago</span>
                    <span className="font-semibold text-emerald-500">{formatCurrency(valorPago)}</span>
                  </div>
                  <div className="flex justify-between items-center text-sm">
                    <span className="text-slate-500">A pagar</span>
                    <span className="font-semibold text-rose-400">{formatCurrency(valorAPagar)}</span>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center">
                    <div className="flex-1 h-1.5 bg-slate-100 dark:bg-white/10 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-emerald-500 rounded-full transition-all duration-500" 
                        style={{ width: `${Math.min(100, (valorPago / (totalDespesasMes || 1)) * 100)}%` }}
                      ></div>
                    </div>
                    <span className="ml-3 text-[10px] font-bold text-slate-400">
                      {Math.round((valorPago / (totalDespesasMes || 1)) * 100)}%
                    </span>
                  </div>
                </div>
              </div>
            }
            colorClass="bg-violet-600"
          />
          <StatCard 
            icon={Wallet} 
            title="Saldo do Período" 
            value={formatCurrency(saldoPeriodo)} 
            subtitle={
              <div className="pt-1">
                <span className={`text-sm font-semibold ${saldoPeriodo >= 0 ? 'text-emerald-500' : 'text-rose-400'}`}>
                  {saldoPeriodo >= 0 ? "Positivo" : "Negativo"}
                </span>
              </div>
            }
            colorClass="bg-violet-500"
            isNegative={saldoPeriodo < 0}
          />
        </div>

        {/* Linha 2 - Gráficos */}
        <div className="grid grid-cols-1 gap-6">
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <div className="mb-6">
              <h2 className="text-lg font-bold text-slate-900 dark:text-white">Movimentação Diária</h2>
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Entradas (Verde) vs Saídas (Vermelho)</p>
            </div>
            <div className="h-[300px]" style={{ userSelect: 'none' }}>
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={todosOsDias}
                  barSize={18}
                  barCategoryGap="20%"
                  style={{ cursor: 'pointer' }}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.1)" />
                  <XAxis
                    dataKey="dia"
                    tickFormatter={(val) => `${val} ${mesAbrev}`}
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(150, 150, 150, 1)', fontSize: 10, fontFamily: 'Inter' }}
                    dy={10}
                  />
                  <YAxis
                    axisLine={false}
                    tickLine={false}
                    tick={{ fill: 'rgba(150, 150, 150, 1)', fontSize: 10, fontFamily: 'Inter' }}
                    tickFormatter={(val) => 'R$ ' + val.toLocaleString('pt-BR')}
                  />
                  <RechartsTooltip content={<CustomTooltip />} cursor={{ fill: 'rgba(0,0,0,0.05)' }} />
                  <RechartsLegend
                    wrapperStyle={{ paddingTop: '20px', fontSize: '12px', fontFamily: 'Inter', color: 'rgba(150, 150, 150, 1)' }}
                    iconType="circle"
                  />
                  <Bar dataKey="entradas_realizadas" name="Entradas" stackId="entradas" fill="#10B981" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} />
                  <Bar dataKey="entradas_previstas" name="Entradas Previstas" stackId="entradas" fill="rgba(16, 185, 129, 0.4)" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} />
                  <Bar dataKey="saidas_realizadas" name="Saídas" stackId="saidas" fill="#EF4444" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} />
                  <Bar dataKey="saidas_previstas" name="Saídas Previstas" stackId="saidas" fill="rgba(239, 68, 68, 0.4)" radius={[4, 4, 0, 0]} onClick={handleBarClick} style={{ cursor: 'pointer' }} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
            <div className="flex justify-between items-start mb-6">
              <div>
                <h2 className="text-lg font-bold text-slate-900 dark:text-white">Saúde do Caixa Diário</h2>
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Evolução do Saldo Acumulado (Roxo)</p>
              </div>
              <div className="text-right">
                <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Saldo Projetado (Fim do Mês)</p>
                <h3 className={`text-2xl font-bold ${saldoAcumulado < 0 ? 'text-red-500/80 dark:text-red-400/80' : 'text-violet-600 dark:text-violet-400'}`}>
                  {formatCurrency(saldoAcumulado)}
                </h3>
              </div>
            </div>
            <div className="h-[300px]">
              <Chart type="line" data={chartSaudeData} options={lineChartOptions} />
            </div>
          </div>
        </div>

        {/* Linha 3 - Clientes e Inadimplência */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Clientes Recentes */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col transition-colors duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Clientes recentes</h2>
              <button className="text-[10px] font-bold text-[#7C3AED] uppercase tracking-widest hover:underline">ver todos</button>
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4 max-h-[300px]">
              {clientes.map((cliente, idx) => (
                <div key={idx} className="flex items-center justify-between p-3 bg-dark-bg border border-white/10 rounded-xl">
                  <div className="flex items-center gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold text-white ${getStatusDotColor(cliente.status)}`}>
                      {getInitials(cliente.fantasy_name || cliente.name)}
                    </div>
                    <div>
                      <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{cliente.fantasy_name || cliente.name}</p>
                      <p className="text-[10px] text-slate-500 dark:text-slate-400 truncate max-w-[150px] uppercase tracking-wider">Parc. {cliente.installment_number || '1'} • {cliente.payment_method || 'N/A'}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-bold text-slate-900 dark:text-white">{formatCurrency(cliente.valor)}</p>
                    <span className={`inline-block mt-1 px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${getStatusColor(cliente.status)}`}>
                      {cliente.status}
                    </span>
                  </div>
                </div>
              ))}
              {clientes.length === 0 && (
                <p className="text-sm text-slate-500 dark:text-slate-400 text-center py-4">Nenhum cliente recente.</p>
              )}
            </div>
          </div>

          {/* Inadimplência */}
          <div className="bg-dark-card border border-white/10 rounded-2xl p-6 flex flex-col transition-colors duration-200">
            <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest mb-6">Inadimplência</h2>
            <div className="space-y-4 flex-1">
            <div className="flex justify-between items-center p-4 bg-dark-bg border border-white/10 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Clientes atrasados</span>
              <span className="text-xl font-black text-dark-text">{inadimplentes.length}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-bg border border-white/10 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Valor em risco</span>
              <span className="text-xl font-black text-red-500">{formatCurrency(totalInadimplencia)}</span>
            </div>
            <div className="flex justify-between items-center p-4 bg-dark-bg border border-white/10 rounded-xl">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Maior atraso</span>
              <span className="text-xl font-black text-dark-text">{maxAtraso} dias</span>
            </div>
            </div>
            <button className="w-full mt-6 py-3 bg-[#EDE9FE] dark:bg-[#7C3AED]/20 text-[#7C3AED] dark:text-[#A78BFA] font-bold text-[11px] uppercase tracking-widest rounded-xl hover:bg-[#DDD6FE] dark:hover:bg-[#7C3AED]/30 transition-colors">
              Ver inadimplentes
            </button>
          </div>
        </div>
          </>

      </div>

      {/* ── Day Popup Modal (Portal) ── */}
      {dayPopup && ReactDOM.createPortal(
        <div className="fixed inset-0 z-[9999] flex items-center justify-center">
          {/* backdrop */}
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setDayPopup(null)} />

          {/* panel */}
          <div className="relative z-10 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-2xl mx-4 max-h-[85vh] flex flex-col">
            {/* header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 dark:border-white/10">
              <div>
                <h2 className="text-base font-black text-dark-text">Movimentações de <span className="text-violet-500">{dayPopup.label}</span></h2>
                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-0.5">
                  {dayLoading ? 'Carregando...' : `${dayPopup.items.length} movimentações`}
                </p>
              </div>
              <button onClick={() => setDayPopup(null)}
                className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/10 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/20 transition-colors">
                <X size={16} className="text-slate-500 dark:text-slate-300" />
              </button>
            </div>

            {/* summary cards */}
            {!dayLoading && dayPopup.items.length > 0 && (() => {
              const ent = dayPopup.items.filter((i: any) => i.type === 1).reduce((s: number, i: any) => s + parseFloat(i.value || i.movement_value || '0'), 0);
              const sai = dayPopup.items.filter((i: any) => i.type === -1).reduce((s: number, i: any) => s + parseFloat(i.value || i.movement_value || '0'), 0);
              return (
                <div className="grid grid-cols-3 gap-3 px-6 py-4 border-b border-slate-100 dark:border-white/10">
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">↑ Entradas</p>
                    <p className="text-base font-black text-emerald-500">{formatCurrency(ent)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">↓ Saídas</p>
                    <p className="text-base font-black text-rose-500">{formatCurrency(sai)}</p>
                  </div>
                  <div>
                    <p className="text-[9px] font-bold text-slate-400 uppercase tracking-wider mb-1">Saldo do dia</p>
                    <p className={`text-base font-black ${ent - sai >= 0 ? 'text-emerald-500' : 'text-rose-500'}`}>
                      {ent - sai >= 0 ? '+' : ''}{formatCurrency(ent - sai)}
                    </p>
                  </div>
                </div>
              );
            })()}

            {/* list */}
            <div className="overflow-y-auto flex-1">
              {dayLoading ? (
                <div className="flex flex-col items-center justify-center py-16 gap-3">
                  <div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
                  <p className="text-sm text-slate-400">Carregando movimentações...</p>
                </div>
              ) : dayPopup.items.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-16">
                  <p className="text-sm font-bold text-slate-400">Nenhuma movimentação neste dia</p>
                </div>
              ) : (
                <div className="divide-y divide-slate-100 dark:divide-white/5">
                  {dayPopup.items.map((item: any, idx: number) => {
                    const valor = parseFloat(item.value || item.movement_value || '0');
                    const isEntrada = item.type === 1;
                    const isReal = item.type_column === 'realizado';
                    const contra = item.person_fantasy_name || item.person_name;
                    return (
                      <div key={item.id || idx} className="flex items-center gap-4 px-6 py-3.5 hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-colors">
                        <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${isEntrada ? 'bg-emerald-500/10' : 'bg-rose-500/10'}`}>
                          {isEntrada ? <ArrowUp size={14} className="text-emerald-500" /> : <ArrowDown size={14} className="text-rose-500" />}
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-dark-text truncate">{item.description || '—'}</p>
                          {contra && <p className="text-[11px] text-slate-400 truncate">{contra}</p>}
                        </div>
                        <span className={`px-2.5 py-1 rounded-full text-[10px] font-bold shrink-0 ${
                          isReal ? 'bg-violet-500/10 text-violet-500' : 'bg-slate-100 dark:bg-white/5 text-slate-400'
                        }`}>{isReal ? 'Realizado' : 'Previsto'}</span>
                        <span className={`text-sm font-bold shrink-0 ${isEntrada ? 'text-emerald-500' : 'text-rose-500'}`}>
                          {isEntrada ? '+' : '-'}{formatCurrency(Math.abs(valor))}
                        </span>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
