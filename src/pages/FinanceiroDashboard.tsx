import React, { useState, useEffect } from 'react';
import { Chart as ChartJS, CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, LineController, BarController } from 'chart.js';
import { Chart } from 'react-chartjs-2';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend as RechartsLegend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { MoreVertical, DollarSign, TrendingUp, TrendingDown, AlertCircle, Wallet, Calendar, AlertTriangle, ArrowUpRight, ShieldAlert, Users, ChevronDown, ChevronUp } from 'lucide-react';
import { PageHeader } from '../components/ui/PageHeader';
import { designSystem } from '../design-system';

ChartJS.register(CategoryScale, LinearScale, BarElement, LineElement, PointElement, Title, Tooltip, Legend, Filler, LineController, BarController);

interface Resumo {
  caixa_realizado: string;
  saidas_operacionais: string;
  distribuicao: string;
  a_receber: string;
  despesas_previstas: string;
  saldo_periodo: string;
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

interface Receita extends Despesa {
}

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
  { name: 'Salários e Pessoal', icon: '👥', keywords: ['Salário', 'Bonificação', 'Business Partner', 'FGTS', 'IRRF', 'Folha', 'Férias', '13º', 'Rescisão', 'Benefício', 'Vale', 'Plano de Saúde', 'Odonto', 'Seguro de Vida'] },
  { name: 'Prestação de Serviço', icon: '🛠️', keywords: ['Ferramenta', 'Software', 'VPS', 'IA', 'Domínio', 'Hospedagem', 'AWS', 'Google Cloud', 'Vercel', 'OpenAI', 'Claude', 'Github', 'Cursor', 'Slack', 'Zoom', 'Canva', 'Adobe', 'Figma', 'Notion', 'Trello', 'Jira'] },
  { name: 'Marketing e Vendas', icon: '📣', keywords: ['Comissão', 'Tráfego Pago', 'Facebook Ads', 'Google Ads', 'Meta Ads', 'Marketing', 'Publicidade', 'Influenciador', 'RD Station', 'Hubspot', 'ActiveCampaign', 'LinkedIn Ads', 'TikTok Ads'] },
  { name: 'Administrativo', icon: '🏢', keywords: ['Aluguel', 'Condomínio', 'Energia', 'Internet', 'Assessoria Financeira', 'Contabilidade', 'Limpeza', 'Escritório', 'Material', 'Seguro', 'Água', 'Telefone', 'Correios', 'Cartório'] },
  { name: 'Despesas Financeiras', icon: '💳', keywords: ['Tarifa Asaas', 'Taxa de antecipação', 'Juros', 'IOF', 'Banco', 'Tarifa', 'Anuidade', 'TED', 'PIX', 'Boleto'] },
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
        <div className="font-bold text-slate-700 mb-2">{label} ABR</div>
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

export default function FinanceiroDashboard() {
  const [activeTab, setActiveTab] = useState('Visão Geral');
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [fluxo, setFluxo] = useState<FluxoDiario[]>([]);
  const [saldoAnterior, setSaldoAnterior] = useState<number>(0);
  const [clientes, setClientes] = useState<ClienteRecente[]>([]);
  const [inadimplentes, setInadimplentes] = useState<Inadimplente[]>([]);
  const [despesas, setDespesas] = useState<Despesa[]>([]);
  const [receitas, setReceitas] = useState<Receita[]>([]);
  const [previsto, setPrevisto] = useState<Previsto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [resResumo, resFluxo, resClientes, resInadimplentes, resPrevisto, resDespesas, resReceitas] = await Promise.all([
          fetch('/api/financeiro/resumo'),
          fetch('/api/financeiro/fluxo-diario'),
          fetch('/api/financeiro/clientes-recentes'),
          fetch('/api/financeiro/inadimplentes'),
          fetch('/api/financeiro/previsto'),
          fetch('/api/financeiro/despesas'),
          fetch('/api/financeiro/receitas')
        ]);

        if (!resResumo.ok || !resFluxo.ok || !resClientes.ok || !resInadimplentes.ok || !resPrevisto.ok || !resDespesas.ok || !resReceitas.ok) {
          throw new Error('Falha ao carregar dados financeiros');
        }

        const fluxoData = await resFluxo.json();

        setResumo(await resResumo.json());
        setFluxo(fluxoData.diario || (Array.isArray(fluxoData) ? fluxoData : []));
        setSaldoAnterior(fluxoData.saldo_anterior || 0);
        setClientes(await resClientes.json());
        setInadimplentes(await resInadimplentes.json());
        setPrevisto(await resPrevisto.json());
        setDespesas(await resDespesas.json());
        setReceitas(await resReceitas.json());
      } catch (err: any) {
        setError(err.message || 'Erro desconhecido');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

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
  
  const hoje = new Date();
  const mesAtual = hoje.getMonth() + 1;
  const anoAtual = hoje.getFullYear();
  const diasNoMes = new Date(anoAtual, mesAtual, 0).getDate();
  
  const todosOsDias = Array.from({ length: diasNoMes }, (_, i) => {
    const dia = i + 1;
    const diaStr = dia.toString().padStart(2, '0');
    const mesStr = mesAtual.toString().padStart(2, '0');
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

  const labels = todosOsDias.map(f => `${f.dia} ABR`);

  // O saldo inicial é o saldo anterior calculado pelo backend (base 70232.04 + histórico conciliado)
  const saldoAncoraHoje = 26538.35; // Saldo real atual do Asaas
  
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
      if (i === ultimoIndiceRealizado) {
        saldoRealizadoAtual = saldoAncoraHoje;
      } else {
        const entradasDoDia = f.entradas_realizadas;
        const saidasDoDia = f.saidas_realizadas;
        saldoRealizadoAtual += (entradasDoDia - saidasDoDia);
      }
      saldoRealizadoData.push(saldoRealizadoAtual);
      
      if (i === ultimoIndiceRealizado) {
        saldoPrevistoData.push(saldoRealizadoAtual); // Conecta as linhas
      } else {
        saldoPrevistoData.push(null);
      }
    } else {
      saldoRealizadoData.push(null);
      
      let saldoPrevistoAnterior = i > 0 && saldoPrevistoData[i - 1] !== null ? saldoPrevistoData[i - 1]! : saldoAncoraHoje;
      const entradasDoDia = f.entradas_previstas;
      const saidasDoDia = f.saidas_previstas;
      saldoPrevistoData.push(saldoPrevistoAnterior + (entradasDoDia - saidasDoDia));
    }
  }

  const saldoAcumulado = saldoPrevistoData[saldoPrevistoData.length - 1] ?? saldoRealizadoData[saldoRealizadoData.length - 1] ?? 0;

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

  const getInitials = (name: string) => name.substring(0, 2).toUpperCase();

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
  const despesasRealizadas = parseFloat(resumo?.saidas_operacionais || '0') + parseFloat(resumo?.distribuicao || '0');
  const saldoPeriodo = parseFloat(resumo?.saldo_periodo || '0');
  const saldoProjetado = parseFloat(previsto?.saldo_projetado || '0');

  const receitasRealizadas = receitas.filter(r => r.type_column === 'realizado' && r.status === 'Conciliado');
  const valorRecebido = receitasRealizadas.reduce((acc, curr) => acc + parseFloat(curr.value || '0'), 0);
  const conciliadosCodes = new Set(receitasRealizadas.map(r => r.document_code).filter(Boolean));
  const receitasPrevistas = receitas.filter(r => 
    r.type_column === 'previsto' && 
    ['Pendente', 'Vence Hoje'].includes(r.status) &&
    (!r.document_code || !conciliadosCodes.has(r.document_code))
  );
  const valorAReceber = receitasPrevistas.reduce((acc, curr) => acc + parseFloat(curr.movement_value || '0'), 0);
  const faturamentoTotal = valorRecebido + valorAReceber;

  const despesasPagasItems = despesas.filter(d => d.type_column === 'realizado' && d.status === 'Conciliado');
  const valorPago = despesasPagasItems.reduce((acc, curr) => acc + parseFloat(curr.value || '0'), 0);
  const despesasConciliadasCodes = new Set(despesasPagasItems.map(d => d.document_code).filter(Boolean));
  const despesasPrevistasItems = despesas.filter(d => 
    d.type_column === 'previsto' && 
    ['Pendente', 'Vence Hoje'].includes(d.status) &&
    (!d.document_code || !despesasConciliadasCodes.has(d.document_code))
  );
  const valorAPagar = despesasPrevistasItems.reduce((acc, curr) => acc + parseFloat(curr.movement_value || '0'), 0);
  const totalDespesasMes = valorPago + valorAPagar;

  return (
    <div className="min-h-screen bg-dark-bg p-8 font-sans text-dark-text transition-colors duration-300">
      <div className="max-w-[1600px] mx-auto space-y-6">
        
        {/* Header */}
        <PageHeader 
          title="Finan" 
          titleAccent="ceiro" 
          subtitle="Gestão integrada de caixa e indicadores de saúde do negócio"
        >
          <div className="flex items-center gap-2 px-4 py-2 bg-dark-card border border-white/10 rounded-xl">
            <Calendar size={16} className="text-gray-500" />
            <span className="text-sm font-bold text-gray-700 dark:text-gray-300">Abril 2026</span>
          </div>
        </PageHeader>

        {/* Tabs */}
        <div className="flex mb-8">
          <div className="inline-flex items-center p-1.5 bg-dark-bg border border-white/10 rounded-full">
            {['Visão Geral', 'Despesas', 'Inadimplentes', 'Clientes'].map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveTab(tab)}
                className={`relative flex items-center px-6 py-2.5 text-sm font-bold rounded-full transition-all duration-200 ${
                  activeTab === tab 
                    ? 'bg-dark-card text-dark-text shadow-sm' 
                    : 'text-slate-500 hover:text-dark-text'
                }`}
              >
                {tab}
                {tab === 'Inadimplentes' && inadimplentes.length > 0 && (
                  <span className="ml-2 flex items-center justify-center min-w-[20px] h-[20px] px-1.5 bg-rose-600 text-white text-[10px] font-bold rounded-full">
                    {inadimplentes.length}
                  </span>
                )}
              </button>
            ))}
          </div>
        </div>

        {activeTab === 'Visão Geral' && (
          <>
            {/* Linha 1 - KPIs */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={todosOsDias} barSize={18} barCategoryGap="20%">
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="rgba(150, 150, 150, 0.1)" />
                  <XAxis 
                    dataKey="dia" 
                    tickFormatter={(val) => `${val} ABR`}
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
                  <Bar dataKey="entradas_realizadas" name="Entradas" stackId="entradas" fill="#10B981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="entradas_previstas" name="Entradas Previstas" stackId="entradas" fill="rgba(16, 185, 129, 0.4)" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas_realizadas" name="Saídas" stackId="saidas" fill="#EF4444" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="saidas_previstas" name="Saídas Previstas" stackId="saidas" fill="rgba(239, 68, 68, 0.4)" radius={[4, 4, 0, 0]} />
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
        )}

        {activeTab === 'Despesas' && (
          <div className="space-y-6">
            {/* Cards de Resumo */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {(() => {
                const totalPrevisto = despesas.filter(d => d.type_column === 'previsto' && d.status === 'Pendente').reduce((acc, curr) => acc + parseFloat(curr.movement_value), 0);
                const jaPago = despesas.filter(d => d.type_column === 'realizado' && d.status === 'Conciliado' && parseFloat(d.value) !== 0).reduce((acc, curr) => acc + parseFloat(curr.value), 0);
                const operacionalReal = despesas.filter(d => d.type_column === 'realizado' && d.status === 'Conciliado' && parseFloat(d.value) !== 0 && d.category_l1_ext_id !== 176913).reduce((acc, curr) => acc + parseFloat(curr.value), 0);
                
                const today = new Date().toISOString().slice(0, 10);
                const tomorrowDate = new Date();
                tomorrowDate.setDate(tomorrowDate.getDate() + 1);
                const tomorrow = tomorrowDate.toISOString().slice(0, 10);
                
                const venceHojeAmanha = despesas.filter(d => d.status === 'Pendente' && (d.expiration_date?.slice(0, 10) === today || d.expiration_date?.slice(0, 10) === tomorrow)).reduce((acc, curr) => acc + parseFloat(curr.movement_value), 0);

                return (
                  <>
                    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Total Previsto</p>
                      <div className="flex items-center justify-between mt-1">
                        <h3 className="text-2xl font-black text-dark-text">{formatCurrency(totalPrevisto)}</h3>
                        <span className="px-2 py-0.5 bg-amber-100 dark:bg-amber-500/20 text-amber-700 dark:text-amber-400 text-[10px] font-bold rounded-full uppercase tracking-wider">a pagar</span>
                      </div>
                    </div>
                    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Já Pago</p>
                      <div className="flex items-center justify-between mt-1">
                        <h3 className="text-2xl font-black text-dark-text">{formatCurrency(jaPago)}</h3>
                        <span className="px-2 py-0.5 bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 text-[10px] font-bold rounded-full uppercase tracking-wider">conciliado</span>
                      </div>
                    </div>
                    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 transition-colors duration-200">
                      <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mb-1">Operacional Real</p>
                      <div className="flex items-center justify-between mt-1">
                        <h3 className="text-2xl font-black text-dark-text">{formatCurrency(operacionalReal)}</h3>
                        <span className="px-2 py-0.5 bg-dark-bg text-slate-500 text-[10px] font-bold rounded-full uppercase tracking-wider border border-white/10">excl. distribuição</span>
                      </div>
                    </div>
                    <div className="bg-dark-card border-2 border-rose-500/30 rounded-2xl p-5 transition-colors duration-200">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vence Hoje/Amanhã</p>
                      <div className="flex items-center justify-between">
                        <h3 className="text-2xl font-black text-rose-500">{formatCurrency(venceHojeAmanha)}</h3>
                        <span className="px-2 py-0.5 bg-rose-600 text-white text-[10px] font-bold rounded-full uppercase tracking-wider">urgente</span>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Painel Esquerdo - Despesas Pagas Agrupadas */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-colors duration-200">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Despesas pagas</h2>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Conciliado</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                  {(() => {
                    const pagas = despesas.filter(d => d.type_column === 'realizado' && d.status === 'Conciliado' && parseFloat(d.value) !== 0);
                    
                    const groupedByCategory = pagas.reduce((acc: any, curr) => {
                      const cat = categorizeExpense(curr.description);
                      if (!acc[cat.name]) {
                        acc[cat.name] = { name: cat.name, icon: cat.icon, total: 0, items: [] };
                      }
                      const valor = parseFloat(curr.value);
                      acc[cat.name].total += valor;
                      
                      const displayDescription = cat.name === 'Cartão de Crédito' 
                        ? extractCreditCardTool(curr.description) 
                        : curr.description;

                      acc[cat.name].items.push({
                        description: displayDescription,
                        value: valor,
                        date: curr.movement_date?.slice(0, 10),
                        status: curr.status
                      });
                      return acc;
                    }, {});

                    const sortedCategories = Object.values(groupedByCategory).sort((a: any, b: any) => b.total - a.total) as any[];

                    if (sortedCategories.length === 0) {
                      return <p className="text-center py-12 text-slate-500">Nenhuma despesa paga encontrada.</p>;
                    }

                    return sortedCategories.map((cat: any, idx) => (
                      <CollapsibleGroup 
                        key={idx}
                        category={cat.name}
                        icon={cat.icon}
                        total={cat.total}
                        items={cat.items}
                        formatCurrency={(val: number) => formatCurrency(val)}
                      />
                    ));
                  })()}
                </div>
              </div>

              {/* Painel Direito - Despesas Previstas Agrupadas */}
              <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-colors duration-200">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Despesas previstas</h2>
                  <span className="px-3 py-1 bg-amber-100 text-amber-700 text-[10px] font-bold rounded-full uppercase tracking-wider">Pendente</span>
                </div>
                <div className="flex-1 overflow-y-auto max-h-[600px] p-4">
                  {(() => {
                    const previstas = despesas.filter(d => d.type_column === 'previsto' && ['Pendente', 'Vence Hoje'].includes(d.status));
                    
                    const groupedByCategory = previstas.reduce((acc: any, curr) => {
                      const cat = categorizeExpense(curr.description);
                      if (!acc[cat.name]) {
                        acc[cat.name] = { name: cat.name, icon: cat.icon, total: 0, items: [] };
                      }
                      const valor = parseFloat(curr.movement_value);
                      acc[cat.name].total += valor;

                      const displayDescription = cat.name === 'Cartão de Crédito' 
                        ? extractCreditCardTool(curr.description) 
                        : curr.description;

                      acc[cat.name].items.push({
                        description: displayDescription,
                        value: valor,
                        date: curr.expiration_date?.slice(0, 10),
                        status: curr.status
                      });
                      return acc;
                    }, {});

                    const sortedCategories = Object.values(groupedByCategory).sort((a: any, b: any) => b.total - a.total) as any[];

                    if (sortedCategories.length === 0) {
                      return <p className="text-center py-12 text-slate-500">Nenhuma despesa prevista encontrada.</p>;
                    }

                    return sortedCategories.map((cat: any, idx) => (
                      <CollapsibleGroup 
                        key={idx}
                        category={cat.name}
                        icon={cat.icon}
                        total={cat.total}
                        items={cat.items}
                        formatCurrency={(val: number) => formatCurrency(val)}
                      />
                    ));
                  })()}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'Inadimplentes' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Painel Esquerdo - Lista */}
            <div className="lg:col-span-2 bg-dark-card border border-white/10 rounded-2xl overflow-hidden flex flex-col transition-colors duration-200">
              {/* Banner de Alerta */}
              <div className="bg-rose-50 dark:bg-rose-500/10 p-4 flex items-start gap-3 border-b border-rose-100 dark:border-rose-500/20">
                <AlertTriangle className="text-rose-500 shrink-0 mt-0.5" size={20} />
                <div>
                  <h3 className="text-sm font-bold text-rose-800 dark:text-rose-400">
                    {inadimplentes.length} clientes com pagamento atrasado — {formatCurrency(totalInadimplencia)} em risco.
                  </h3>
                  <p className="text-xs text-rose-600 dark:text-rose-300 mt-1">
                    Contato imediato recomendado para casos acima de 15 dias.
                  </p>
                </div>
              </div>

              {/* Lista */}
              <div className="flex-1 overflow-y-auto p-2">
                {inadimplentes.map((cliente, index) => {
                  const dias = cliente.dias_atraso;
                  let badgeColor = 'bg-amber-100 text-amber-700 dark:bg-amber-500/20 dark:text-amber-400';
                  if (dias > 10 && dias <= 20) badgeColor = 'bg-orange-100 text-orange-700 dark:bg-orange-500/20 dark:text-orange-400';
                  if (dias > 20) badgeColor = 'bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400';

                  return (
                    <div key={index} className="flex items-center justify-between p-4 hover:bg-dark-card-hover rounded-2xl transition-colors border-b border-white/5 last:border-0">
                      <div className="flex items-center gap-4">
                        <div className="w-10 h-10 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-sm font-bold text-slate-600 dark:text-slate-300 shrink-0">
                          {cliente.fantasy_name ? cliente.fantasy_name.substring(0, 2).toUpperCase() : cliente.name.substring(0, 2).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white">{cliente.fantasy_name || cliente.name}</p>
                          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                            {cliente.description || 'Contrato'} · Parc. {cliente.installment_number || '1'} · {cliente.payment_method || 'Boleto'}
                          </p>
                        </div>
                      </div>
                      <div className="text-right flex flex-col items-end gap-2">
                        <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(cliente.valor)}</p>
                        <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase tracking-wider ${badgeColor}`}>
                          {dias} dias
                        </span>
                      </div>
                    </div>
                  );
                })}
                {inadimplentes.length === 0 && (
                  <div className="p-8 text-center text-slate-500 dark:text-slate-400">
                    Nenhum cliente inadimplente no momento.
                  </div>
                )}
              </div>
            </div>

            {/* Painel Direito - Resumo */}
            <div className="space-y-6">
              {/* Card 1 - Resumo de Risco */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-rose-100 dark:bg-rose-500/20 rounded-xl">
                    <ShieldAlert className="text-rose-600 dark:text-rose-400" size={20} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Resumo de Risco</h2>
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center p-3 bg-dark-bg border border-white/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-amber-500"></div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">1-10 dias</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(inadimplentes.filter(i => i.dias_atraso <= 10).reduce((acc, curr) => acc + parseFloat(curr.valor), 0))}
                      </p>
                      <p className="text-[10px] text-slate-500">{inadimplentes.filter(i => i.dias_atraso <= 10).length} clientes</p>
                    </div>
                  </div>
                  
                  <div className="flex justify-between items-center p-3 bg-dark-bg border border-white/10 rounded-xl">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-500"></div>
                      <span className="text-xs font-bold text-slate-600 dark:text-slate-400">11-20 dias</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                        {formatCurrency(inadimplentes.filter(i => i.dias_atraso > 10 && i.dias_atraso <= 20).reduce((acc, curr) => acc + parseFloat(curr.valor), 0))}
                      </p>
                      <p className="text-[10px] text-slate-500">{inadimplentes.filter(i => i.dias_atraso > 10 && i.dias_atraso <= 20).length} clientes</p>
                    </div>
                  </div>

                  <div className="flex justify-between items-center p-3 bg-rose-50 dark:bg-rose-500/10 rounded-xl border border-rose-100 dark:border-rose-500/20">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-rose-600"></div>
                      <span className="text-xs font-bold text-rose-800 dark:text-rose-400">Total em Risco</span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-rose-600 dark:text-rose-400">{formatCurrency(totalInadimplencia)}</p>
                      <p className="text-[10px] text-rose-500">{inadimplentes.length} clientes</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Card 2 - Taxa de Inadimplência */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-slate-100 dark:bg-white/10 rounded-xl">
                    <Users className="text-slate-600 dark:text-slate-400" size={20} />
                  </div>
                  <h2 className="text-sm font-bold text-slate-900 dark:text-white uppercase tracking-widest">Taxa de Inadimplência</h2>
                </div>
                
                {(() => {
                  const faturamentoMes = parseFloat(resumo?.caixa_realizado || '0') + parseFloat(previsto?.entradas_previstas || '0');
                  const taxa = faturamentoMes > 0 ? (totalInadimplencia / faturamentoMes) * 100 : 0;
                  let taxaColor = 'text-emerald-500';
                  if (taxa >= 5 && taxa <= 10) taxaColor = 'text-orange-500';
                  if (taxa > 10) taxaColor = 'text-rose-600';
                  
                  return (
                    <div className="flex flex-col items-center justify-center py-4">
                      <div className={`text-5xl font-bold tracking-tight mb-2 ${taxaColor}`}>
                        {taxa.toFixed(1)}%
                      </div>
                      <p className="text-xs font-bold text-slate-500 uppercase tracking-widest">Meta: Abaixo de 5%</p>
                    </div>
                  );
                })()}
              </div>

              {/* Card 3 - Impacto no Caixa */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2.5 bg-emerald-500/15 rounded-xl">
                    <TrendingUp className="text-emerald-500" size={20} />
                  </div>
                  <h2 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Impacto no Caixa</h2>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Saldo Atual</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white">{formatCurrency(saldoAncoraHoje)}</p>
                  </div>
                  
                  <div>
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Se receber tudo</p>
                    <p className="text-xl font-bold text-emerald-500">{formatCurrency(saldoAncoraHoje + totalInadimplencia)}</p>
                  </div>
                  
                  <div className="pt-4 border-t border-white/10">
                    <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Runway Atual</p>
                    {(() => {
                      const despesasTotaisMes = despesasRealizadas + parseFloat(previsto?.despesas_previstas || '0');
                      const runway = despesasTotaisMes > 0 ? (saldoAncoraHoje / despesasTotaisMes) : 0;
                      return (
                        <p className="text-sm font-bold text-slate-700 dark:text-slate-300">
                          {runway.toFixed(1)} meses <span className="text-xs font-normal text-slate-500">(base média)</span>
                        </p>
                      );
                    })()}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab !== 'Visão Geral' && activeTab !== 'Inadimplentes' && (
          <div className="bg-dark-card border border-white/10 rounded-2xl p-12 flex flex-col items-center justify-center min-h-[400px] transition-colors duration-200">
            <div className="p-4 bg-dark-bg rounded-2xl mb-4">
              <Wallet className="text-gray-400" size={32} />
            </div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">Em breve</h2>
            <p className="text-sm text-gray-500 text-center max-w-md">
              O módulo de {activeTab.toLowerCase()} está em desenvolvimento e estará disponível em breve.
            </p>
          </div>
        )}

      </div>
    </div>
  );
}
