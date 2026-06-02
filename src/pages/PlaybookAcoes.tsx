import React, { useState, useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend, CartesianGrid
} from 'recharts';
import {
  ArrowLeft, Plus, Edit2, Trash2, X, ChevronRight,
  GitCompare, CheckSquare, Square, AlertCircle, TrendingUp,
  DollarSign, Users, FileText, Search, Filter, Eye,
  ArrowUpRight, ArrowDownRight, Minus, Clock, History
} from 'lucide-react';

// ─── Types ───────────────────────────────────────────────────────────────────

type StatusAcao = 'verde' | 'amarelo' | 'vermelho' | 'a_testar';

interface AcaoHistoryEntry {
  id: string;
  date: string;
  status: StatusAcao;
  custoLeadMin?: number;
  custoLeadMax?: number;
  custoLeadMedio?: number;
  cacMin?: number;
  cacMax?: number;
  contratosMin?: number;
  contratosMax?: number;
  observacoes?: string;
}

interface Acao {
  id: string;
  nicho: string;
  nome: string;
  status: StatusAcao;
  custoLeadMin?: number;
  custoLeadMax?: number;
  custoLeadMedio?: number;
  cacMin?: number;
  cacMax?: number;
  contratosMin?: number;
  contratosMax?: number;
  observacoes?: string;
  updatedAt: string;
  history?: AcaoHistoryEntry[];
}

// ─── Initial Data ─────────────────────────────────────────────────────────────

const NICHOS = [
  'Previdenciário', 'Bancário', 'Servidor Público', 'Trabalhista',
  'Consumidor', 'Família', 'Saúde', 'Empresarial', 'Criminal', 'Imobiliário'
];

const NICHO_ICONS: Record<string, string> = {
  'Previdenciário': '🏛️', 'Bancário': '🏦', 'Servidor Público': '📋',
  'Trabalhista': '⚖️', 'Consumidor': '🛡️', 'Família': '👨‍👩‍👧',
  'Saúde': '🏥', 'Empresarial': '💼', 'Criminal': '🔒', 'Imobiliário': '🏠'
};

const INITIAL_ACOES: Acao[] = [
  {
    id: '1', nicho: 'Previdenciário', nome: 'Salário Maternidade',
    status: 'verde', custoLeadMedio: 4, cacMin: 80, cacMax: 100,
    contratosMin: 12, contratosMax: 15, updatedAt: new Date().toISOString()
  },
  {
    id: '2', nicho: 'Previdenciário',
    nome: 'Auxílio Doença [Doenças Ocupacionais / Acidentes / Doenças Graves / HIV / Câncer]',
    status: 'verde', custoLeadMin: 6, custoLeadMax: 8, cacMin: 130, cacMax: 150,
    contratosMin: 8, contratosMax: 10, updatedAt: new Date().toISOString()
  },
  {
    id: '3', nicho: 'Previdenciário', nome: 'Auxílio Acidente',
    status: 'amarelo', custoLeadMin: 6, custoLeadMax: 8, cacMin: 200, cacMax: 200,
    contratosMin: 6, contratosMax: 8, updatedAt: new Date().toISOString()
  },
  {
    id: '4', nicho: 'Previdenciário', nome: 'BPC Loas Deficiente',
    status: 'amarelo', custoLeadMin: 5, custoLeadMax: 7, cacMin: 200, cacMax: 200,
    contratosMin: 6, contratosMax: 8, updatedAt: new Date().toISOString()
  },
  {
    id: '5', nicho: 'Previdenciário',
    nome: 'Aposentadoria Especial (Profissão com Insalubridade e Profissionais da Saúde)',
    status: 'amarelo', custoLeadMin: 4, custoLeadMax: 8, cacMin: 340, cacMax: 340,
    contratosMin: 3, contratosMax: 3, observacoes: 'Necessario ajudar na retirada do documento PPP do cliente',
    updatedAt: new Date().toISOString()
  },
  {
    id: '6', nicho: 'Previdenciário',
    nome: 'Aposentadoria por idade [ANUNCIANDO PARA IDOSOS]',
    status: 'amarelo', custoLeadMin: 4, custoLeadMax: 8, cacMin: 340, cacMax: 340,
    contratosMin: 3, contratosMax: 3, updatedAt: new Date().toISOString()
  },
  {
    id: '7', nicho: 'Previdenciário', nome: 'BPC Loas Idoso',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: '8', nicho: 'Previdenciário',
    nome: 'Aposentadoria [ANUNCIANDO PARA FILHOS E NETOS]',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: '9', nicho: 'Previdenciário', nome: 'Pensão por Morte',
    status: 'vermelho', custoLeadMin: 6, custoLeadMax: 8, cacMin: 130, cacMax: 150,
    contratosMin: 8, contratosMax: 10, updatedAt: new Date().toISOString()
  },
  {
    id: '10', nicho: 'Previdenciário', nome: 'Aposentadoria Rural',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: '11', nicho: 'Previdenciário', nome: 'Planejamento Previdenciário',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: '12', nicho: 'Previdenciário', nome: 'Auxílio Reclusão',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: '13', nicho: 'Previdenciário', nome: 'Aposentadoria por Invalidez',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: '14', nicho: 'Previdenciário', nome: 'Aposentadoria PCD',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  
  // Bancário
  {
    id: 'b1', nicho: 'Bancário', nome: 'Superendividamento',
    status: 'verde', custoLeadMin: 8, custoLeadMax: 8, cacMin: 250, cacMax: 250,
    contratosMin: 3, contratosMax: 5, observacoes: 'Foco em servidores públicos tem um bom desempenho. Flexibilizar forma de pagamento. Fechamentos dependem do honorário inicial [R$2k - R$5k].',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'b2', nicho: 'Bancário', nome: 'RMC e Cartões Consignados',
    status: 'verde', custoLeadMin: 3, custoLeadMax: 3, cacMin: 150, cacMax: 150,
    contratosMin: 8, contratosMax: 10, observacoes: 'Público idoso -> atendimento moroso. Paciência é chave. É possível fechar mais de uma ação por pessoa.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'b3', nicho: 'Bancário', nome: 'Descontos Indevidos [GERAL]',
    status: 'verde', custoLeadMin: 4, custoLeadMax: 4, cacMin: 150, cacMax: 150,
    contratosMin: 8, contratosMax: 10, observacoes: 'Público também é idoso -> atendimento moroso. Paciência é chave. É possível fechar mais de uma ação por pessoa.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'b4', nicho: 'Bancário', nome: 'Revisional De Contratos [GERAL]',
    status: 'verde', custoLeadMin: 3, custoLeadMax: 4, cacMin: 150, cacMax: 150,
    contratosMin: 8, contratosMax: 10, observacoes: 'Jornada de fechamento pode ser encurtada com ligação. Necessário rodar com honorário de êxito.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'b5', nicho: 'Bancário', nome: 'Revisional de Contratos de Veículos',
    status: 'amarelo', custoLeadMin: 8, custoLeadMax: 10, cacMin: 180, cacMax: 180,
    contratosMin: 6, contratosMax: 8, observacoes: 'Envio da cópia do contrato de financiamento pode ser um gargalo.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'b6', nicho: 'Bancário', nome: 'Busca e Apreensão de veículo',
    status: 'amarelo', custoLeadMin: 10, custoLeadMax: 15, cacMin: 180, cacMax: 180,
    contratosMin: 3, contratosMax: 5, observacoes: 'Envio da cópia do contrato de financiamento pode ser um gargalo.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'b7', nicho: 'Bancário', nome: 'Revisional de Contratos Rurais',
    status: 'amarelo', custoLeadMin: 10, custoLeadMax: 15, cacMin: 450, cacMax: 500,
    contratosMin: 1, contratosMax: 3, observacoes: 'Atendimento presencial é um diferencial pro fechamento.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'b8', nicho: 'Bancário', nome: 'Golpe PIX',
    status: 'vermelho', custoLeadMin: 4, custoLeadMax: 4, cacMin: 600, cacMax: 600,
    contratosMin: 1, contratosMax: 2, observacoes: 'Os valores dos golpes são baixos. Pode ser inviável pro escritório.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'b9', nicho: 'Bancário', nome: 'Defesa em processos de execução Bancária',
    status: 'vermelho', custoLeadMin: 10, custoLeadMax: 15, cacMin: 1000, cacMax: 1000,
    contratosMin: 1, contratosMax: 2, updatedAt: new Date().toISOString()
  },
  {
    id: 'b10', nicho: 'Bancário', nome: 'Negativação no SPC SERASA indevida por conta de Fraude bancária',
    status: 'vermelho', custoLeadMin: 5, custoLeadMax: 5, cacMin: 1000, cacMax: 1000,
    contratosMin: 1, contratosMax: 2, observacoes: 'Pessoal que chega não se encaixa nos critérios da ação.',
    updatedAt: new Date().toISOString()
  },
  
  // Servidor Público
  {
    id: 'sp1', nicho: 'Servidor Público', nome: 'Isenção de Imposto de Renda para Servidores Públicos, Militares e Aposentados',
    status: 'verde', custoLeadMin: 8, custoLeadMax: 10, cacMin: 200, cacMax: 200,
    contratosMin: 6, contratosMax: 8, updatedAt: new Date().toISOString()
  },
  {
    id: 'sp2', nicho: 'Servidor Público', nome: 'Superendividamento',
    status: 'verde', custoLeadMin: 8, custoLeadMax: 8, cacMin: 250, cacMax: 250,
    contratosMin: 3, contratosMax: 5, observacoes: 'Melhor caminho. Quanto maior o honorário inicial, menor a taxa de fechamento.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp3', nicho: 'Servidor Público', nome: 'RMC e RCC',
    status: 'verde', custoLeadMin: 3, custoLeadMax: 3, cacMin: 150, cacMax: 150,
    contratosMin: 8, contratosMax: 10, observacoes: 'Melhor caminho da tese.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp4', nicho: 'Servidor Público', nome: '[PROFESSORES] Abono salarial',
    status: 'verde', custoLeadMin: 5, custoLeadMax: 7, cacMin: 250, cacMax: 250,
    contratosMin: 10, contratosMax: 12, observacoes: 'É possível fechar mais de uma ação por pessoa.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp5', nicho: 'Servidor Público', nome: '[PROFESSORES] Piso salarial',
    status: 'verde', custoLeadMin: 5, custoLeadMax: 7, cacMin: 250, cacMax: 250,
    contratosMin: 10, contratosMax: 12, observacoes: 'É possível fechar mais de uma ação por pessoa.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp6', nicho: 'Servidor Público', nome: '[PROFESSORES] PIS/PASEP',
    status: 'verde', custoLeadMin: 5, custoLeadMax: 7, cacMin: 250, cacMax: 250,
    contratosMin: 10, contratosMax: 12, observacoes: 'É possível fechar mais de uma ação por pessoa.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'sp7', nicho: 'Servidor Público', nome: 'Sindicância/PAD',
    status: 'verde', custoLeadMin: 18, custoLeadMax: 18, cacMin: 400, cacMax: 400,
    contratosMin: 2, contratosMax: 5, updatedAt: new Date().toISOString()
  },
  {
    id: 'sp8', nicho: 'Servidor Público', nome: 'Licença Premio',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'sp9', nicho: 'Servidor Público', nome: 'Ação por não concessão de licenças e afastamentos previstos em lei',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'sp10', nicho: 'Servidor Público', nome: 'Ação para garantir o pagamento de gratificações previstas em lei',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'sp11', nicho: 'Servidor Público', nome: 'Quinquênio e férias premio não usufruídas',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  
  // Trabalhista
  {
    id: 't1', nicho: 'Trabalhista', nome: 'Trabalhista Geral [GOOGLE ADS]',
    status: 'verde', custoLeadMin: 12, custoLeadMax: 15, cacMin: 160, cacMax: 160,
    contratosMin: 6, contratosMax: 8, observacoes: 'Ação de volume para ser rentável. Público de muitas dúvidas, busca consulta. Comercial precisa ser pró-ativo. Ligação é um diferencial.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 't2', nicho: 'Trabalhista', nome: 'Trabalhista Insalubridade [Meta Ads]',
    status: 'verde', custoLeadMin: 3, custoLeadMax: 3, cacMin: 160, cacMax: 160,
    contratosMin: 8, contratosMax: 10, updatedAt: new Date().toISOString()
  },
  {
    id: 't3', nicho: 'Trabalhista', nome: 'Trabalhista Geral [Meta Ads]',
    status: 'amarelo', custoLeadMin: 8, custoLeadMax: 10, cacMin: 210, cacMax: 210,
    contratosMin: 5, contratosMax: 7, observacoes: 'Ação de volume para ser rentável. Público busca consultas. Comercial precisa ser pró-ativo. Ligação é um diferencial.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 't4', nicho: 'Trabalhista', nome: 'Trabalhista Verbas Rescisórias Não Pagas/Pagas Fora da Data [Meta Ads]',
    status: 'amarelo', custoLeadMin: 4, custoLeadMax: 4, cacMin: 220, cacMax: 220,
    contratosMin: 4, contratosMax: 6, observacoes: 'Pessoas curiosas entrando em contato, querendo tirar dúvidas. O comercial precisa direcionar a pessoa até a venda.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 't5', nicho: 'Trabalhista', nome: 'Trabalhista Reconhecimento de Vínculo [Meta Ads]',
    status: 'amarelo', custoLeadMin: 4, custoLeadMax: 4, cacMin: 220, cacMax: 220,
    contratosMin: 4, contratosMax: 6, observacoes: 'Tempo baixo. Pessoas curiosas entrando em contato, querendo tirar dúvidas. O comercial precisa direcionar a pessoa até a venda.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 't6', nicho: 'Trabalhista', nome: 'Trabalhista Rescisão Indireta [Meta Ads]',
    status: 'amarelo', custoLeadMin: 4, custoLeadMax: 4, cacMin: 220, cacMax: 220,
    contratosMin: 4, contratosMax: 6, observacoes: 'Pessoas curiosas entrando em contato, querendo tirar dúvidas. O comercial precisa direcionar a pessoa até a venda.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 't7', nicho: 'Trabalhista', nome: 'Trabalhista Acidente de Trabalho [Meta Ads]',
    status: 'amarelo', custoLeadMin: 12, custoLeadMax: 15, cacMin: 220, cacMax: 220,
    contratosMin: 4, contratosMax: 6, observacoes: 'Contatos do previdenciário. Pessoas curiosas entrando em contato, querendo tirar dúvidas. O comercial precisa direcionar a pessoa até a venda.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 't8', nicho: 'Trabalhista', nome: 'Trabalhista Gestante Demitida [Meta Ads]',
    status: 'vermelho', custoLeadMin: 20, custoLeadMax: 25, cacMin: 1000, cacMax: 1000,
    contratosMin: 1, contratosMax: 2, observacoes: 'Recomendado como ação complementar/secundária. Evitar iniciar com essa tese.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 't9', nicho: 'Trabalhista', nome: 'Trabalhista Empresarial [Google Ads]',
    status: 'vermelho', custoLeadMin: 100, custoLeadMax: 100, cacMin: 1000, cacMax: 1000,
    contratosMin: 1, contratosMax: 2, observacoes: 'Recomendado como ação complementar/secundária.',
    updatedAt: new Date().toISOString()
  },
  {
    id: 't10', nicho: 'Trabalhista', nome: 'Trabalhista Periculosidade [Meta Ads]',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: 't11', nicho: 'Trabalhista', nome: 'Trabalhista na defesa de caminhoneiros e seus direitos não pagos',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 't12', nicho: 'Trabalhista', nome: 'Trabalhista para público Bancário [Meta Ads]',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 't13', nicho: 'Trabalhista', nome: 'Trabalhista para público Bancário [Google Ads]',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  
  // Consumidor
  {
    id: 'c1', nicho: 'Consumidor', nome: 'Problemas com a Companhia Aérea [Meta Ads]',
    status: 'verde', observacoes: 'OBS: Jurídica complicado após janeiro de 2026',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c2', nicho: 'Consumidor', nome: 'Ação contra UBER/99 para Motoristas Bloqueados Indevidamente na Plataforma',
    status: 'verde', updatedAt: new Date().toISOString()
  },
  {
    id: 'c3', nicho: 'Consumidor', nome: 'Companhias Elétricas quedas de energia e queima de aparelhos',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  {
    id: 'c4', nicho: 'Consumidor', nome: 'Registro de Marca [Google Ads]',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  {
    id: 'c5', nicho: 'Consumidor', nome: 'Companhias de Água falta de fornecimento e danos em casas',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  {
    id: 'c6', nicho: 'Consumidor', nome: 'Companhias de Água por Taxas Abusivas nas Contas',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  {
    id: 'c7', nicho: 'Consumidor', nome: 'Golpe do Pix e Boleto Bancário [Google]',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: 'c8', nicho: 'Consumidor', nome: 'Golpe do Pix e Boleto Bancário [Facebook]',
    status: 'vermelho', observacoes: 'Precisa necessariamente falar de valores dentro do criativo, limitar em pelo menos R$ 3000',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c9', nicho: 'Consumidor', nome: 'Auxílio Moradia Médicos Residentes',
    status: 'vermelho', observacoes: 'Dificuldade em assertividade em públicos, através do gerenciador do Facebook. Testar uma lista/LAL pode ser interessante',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'c10', nicho: 'Consumidor', nome: 'Problemas com a Companhia Aérea [Google Ads]',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: 'c11', nicho: 'Consumidor', nome: 'Cobranças indevidas Companhias Telefônicas',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c12', nicho: 'Consumidor', nome: 'Reclamação de produtos não entregues',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c13', nicho: 'Consumidor', nome: 'Reembolso e Devolução de valores de Cancelamento de Eventos e Similares',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c14', nicho: 'Consumidor', nome: 'Cobrança abusiva de valores em consórcio e não entrega do bem prometido',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c15', nicho: 'Consumidor', nome: 'Contestação de Negativas de Coberturas de seguros automotivos',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c16', nicho: 'Consumidor', nome: 'Garantias não cobertas de automóveis novos e usados',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c17', nicho: 'Consumidor', nome: 'Reajuste abusivo de Seguros e Franquias',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c18', nicho: 'Consumidor', nome: 'Reajustes abusivos e cobranças indevidas de Faculdades',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c19', nicho: 'Consumidor', nome: 'Golpes e Fraudes na compra de pacotes turísticos e viagens',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'c20', nicho: 'Consumidor', nome: 'Parceria com escritórios de contabilidade',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  
  // Família
  {
    id: 'f1', nicho: 'Família', nome: 'Solução completa para divórcio + guarda + pensão de alimentos [Google ADS]',
    status: 'verde', updatedAt: new Date().toISOString()
  },
  {
    id: 'f2', nicho: 'Família', nome: 'Inventário',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  {
    id: 'f3', nicho: 'Família', nome: 'Planejamento Matrimonial Facebook',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: 'f4', nicho: 'Família', nome: 'Planejamento Patrimonial',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  
  // Saúde
  {
    id: 's1', nicho: 'Saúde', nome: 'Tratamento TEA Negado [Google]',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  {
    id: 's2', nicho: 'Saúde', nome: 'Gestante [Facebook]',
    status: 'amarelo', observacoes: 'Custo alto, porém leva pessoas qualificadas sim. Impecílio fechamento: honorários iniciais e distância',
    updatedAt: new Date().toISOString()
  },
  {
    id: 's3', nicho: 'Saúde', nome: 'Saúde Geral [Google]',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  {
    id: 's4', nicho: 'Saúde', nome: 'Saúde Geral [Facebook]',
    status: 'amarelo', observacoes: 'Custo elevado também pelo lead, pouco mais baixo que Google. Trabalhe com listas personalizadas + interesses no mesmo público',
    updatedAt: new Date().toISOString()
  },
  {
    id: 's5', nicho: 'Saúde', nome: 'Tratamentos Negados [Meta Ads]',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  {
    id: 's6', nicho: 'Saúde', nome: 'Tratamento TEA Negado [Meta Ads]',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  
  // Empresarial
  {
    id: 'e1', nicho: 'Empresarial', nome: 'Renegociação de Dívidas',
    status: 'amarelo', updatedAt: new Date().toISOString()
  },
  
  // Criminal
  {
    id: 'cr1', nicho: 'Criminal', nome: 'Criminal Geral [Meta Ads]',
    status: 'vermelho', observacoes: 'Majoritário de crimes de drogas, ticket mais baixo para fechar parcelamento',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cr2', nicho: 'Criminal', nome: 'Execução Penal [Meta Ads]',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr3', nicho: 'Criminal', nome: 'Criminal Geral Focando no Público que está no Semi Aberto/Aberto [Meta Ads]',
    status: 'vermelho', observacoes: 'Volume, comercial filtra',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cr4', nicho: 'Criminal', nome: 'Criminal Geral Focando no Público que Dentro do Presídio [Meta Ads]',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr5', nicho: 'Criminal', nome: 'Criminal Geral [Google Ads - Leads melhores qualificação]',
    status: 'vermelho', observacoes: 'Custo mais elevado e não necessariamente leads mais qualificados. Ação é rentável em volume, com parcelamento',
    updatedAt: new Date().toISOString()
  },
  {
    id: 'cr6', nicho: 'Criminal', nome: 'CNH Cassada/Bafômetro',
    status: 'vermelho', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr7', nicho: 'Criminal', nome: 'Defesa de crimes ambientais e recursos de multas',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr8', nicho: 'Criminal', nome: 'Defesa de crimes de trânsito, no geral',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr9', nicho: 'Criminal', nome: 'Defesa de crimes de estelionato e falsidade ideológica',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr10', nicho: 'Criminal', nome: 'Defesa de crimes de receptação de produtos roubados ou furtados',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr11', nicho: 'Criminal', nome: 'Defesa de crimes de furto e roubo simples ou qualificado',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr12', nicho: 'Criminal', nome: 'Defesa de crimes de organização criminosa e associação criminosa',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'cr13', nicho: 'Criminal', nome: 'Ação para condutores que perderam o prazo para indicar quem estava dirigindo o carro e estão para perder a carteira',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  
  // Imobiliário
  {
    id: 'i1', nicho: 'Imobiliário', nome: 'Distrato de Lote e Imóveis',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i2', nicho: 'Imobiliário', nome: 'Geral Google',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i3', nicho: 'Imobiliário', nome: 'Leilão de Imóveis',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i4', nicho: 'Imobiliário', nome: 'Regularização de Imóveis Rurais [BRASIL]',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i5', nicho: 'Imobiliário', nome: 'Problemas condominiais captando Síndicos [Google]',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i6', nicho: 'Imobiliário', nome: 'Problemas condominiais captando Síndicos [Facebook]',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i7', nicho: 'Imobiliário', nome: 'Atraso na entrega das chaves',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i8', nicho: 'Imobiliário', nome: 'Geral Facebook',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i9', nicho: 'Imobiliário', nome: 'Ações de reintegração de posse',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i10', nicho: 'Imobiliário', nome: 'Ação de usucapião [DEFESA]',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i11', nicho: 'Imobiliário', nome: 'Ação de usucapião [ENTRADA DE PEDIDO]',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i12', nicho: 'Imobiliário', nome: 'Vícios ocultos em imóveis',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i13', nicho: 'Imobiliário', nome: 'Ações de cobrança de cotas condominiais para obras e reparos extraordinários',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i14', nicho: 'Imobiliário', nome: 'Rescisão de contrato de compra e venda e devolução de imóvel por ausência de pagamento',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i15', nicho: 'Imobiliário', nome: 'Ações de execuções de hipotecas e financiamentos',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i16', nicho: 'Imobiliário', nome: 'Revisão do contrato de financiamento imobiliário',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i17', nicho: 'Imobiliário', nome: 'Ações de regularização fundiária, visando obter a titulação de terras ocupadas de forma irregular',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i18', nicho: 'Imobiliário', nome: 'Ações de indenizações por desapropriação de imóveis ilegal ou abusiva',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i19', nicho: 'Imobiliário', nome: 'Problemas condominiais captando Moradores',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
  {
    id: 'i20', nicho: 'Imobiliário', nome: 'Atraso na entrega de imóveis e vícios ocultos',
    status: 'a_testar', updatedAt: new Date().toISOString()
  },
];

// ─── Status Config ────────────────────────────────────────────────────────────

const STATUS_CONFIG: Record<StatusAcao, { label: string; emoji: string; bg: string; text: string; border: string; order: number }> = {
  verde:    { label: 'Quente agora',   emoji: '🟢', bg: 'bg-emerald-500/15', text: 'text-emerald-400', border: 'border-emerald-500/30', order: 0 },
  amarelo:  { label: 'Com ressalvas',  emoji: '🟡', bg: 'bg-yellow-500/15',  text: 'text-yellow-400',  border: 'border-yellow-500/30',  order: 1 },
  vermelho: { label: 'Difícil agora',  emoji: '🔴', bg: 'bg-red-500/15',     text: 'text-red-400',     border: 'border-red-500/30',     order: 2 },
  a_testar: { label: 'A testar',       emoji: '🔵', bg: 'bg-blue-500/15',    text: 'text-blue-400',    border: 'border-blue-500/30',    order: 3 },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

const fmt = (v?: number) => v != null ? `R$ ${v.toLocaleString('pt-BR')}` : '—';
const fmtRange = (min?: number, max?: number) => {
  if (min != null && max != null) return min === max ? fmt(min) : `${fmt(min)} – ${fmt(max)}`;
  if (min != null) return `A partir de ${fmt(min)}`;
  if (max != null) return `Até ${fmt(max)}`;
  return '—';
};
const fmtContratos = (min?: number, max?: number) => {
  if (min != null && max != null) return min === max ? `${min}` : `${min} – ${max}`;
  if (min != null) return `${min}+`;
  if (max != null) return `até ${max}`;
  return '—';
};

// ─── StatusBadge ──────────────────────────────────────────────────────────────

const StatusBadge = ({ status, size = 'sm' }: { status: StatusAcao; size?: 'sm' | 'md' }) => {
  const cfg = STATUS_CONFIG[status];
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-bold ${cfg.bg} ${cfg.text} ${cfg.border} ${size === 'md' ? 'text-sm px-3 py-1.5' : ''}`}>
      {cfg.emoji} {cfg.label}
    </span>
  );
};

// ─── Modal Base ───────────────────────────────────────────────────────────────

const Modal = ({ children, onClose, wide = false }: { children: React.ReactNode; onClose: () => void; wide?: boolean }) => (
  <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
    <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
    <div className={`relative w-full ${wide ? 'max-w-4xl' : 'max-w-xl'} bg-white/95 dark:bg-[#11111b]/95 border border-slate-200 dark:border-white/10 rounded-3xl shadow-2xl max-h-[90vh] overflow-y-auto`}>
      {children}
    </div>
  </div>
);

// ─── Form Field ───────────────────────────────────────────────────────────────

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="flex flex-col gap-1.5">
    <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">{label}</label>
    {children}
  </div>
);

const inputCls = "w-full px-3 py-2.5 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-slate-900 dark:text-white text-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500/50 focus:bg-white dark:focus:bg-white/8 transition-all";

// ─── Edit Modal ───────────────────────────────────────────────────────────────

interface EditModalProps {
  acao: Partial<Acao> | null;
  nichoAtual: string;
  onSave: (acao: Acao) => void;
  onDelete?: (id: string) => void;
  onClose: () => void;
}

const EditModal = ({ acao, nichoAtual, onSave, onDelete, onClose }: EditModalProps) => {
  const isNew = !acao?.id;
  const [form, setForm] = useState<Partial<Acao>>({
    nicho: nichoAtual,
    status: 'a_testar',
    updatedAt: new Date().toISOString(),
    ...acao,
  });
  const [confirmDelete, setConfirmDelete] = useState(false);

  const set = (field: keyof Acao, value: any) => setForm(f => ({ ...f, [field]: value }));

  const handleSave = () => {
    if (!form.nome?.trim()) return;
    onSave({
      id: form.id || crypto.randomUUID(),
      nicho: form.nicho || nichoAtual,
      nome: form.nome!,
      status: form.status || 'a_testar',
      custoLeadMin: form.custoLeadMin,
      custoLeadMax: form.custoLeadMax,
      custoLeadMedio: form.custoLeadMedio,
      cacMin: form.cacMin,
      cacMax: form.cacMax,
      contratosMin: form.contratosMin,
      contratosMax: form.contratosMax,
      observacoes: form.observacoes,
      updatedAt: new Date().toISOString(),
    });
  };

  const numInput = (field: keyof Acao, placeholder: string) => (
    <input
      type="number"
      placeholder={placeholder}
      value={(form[field] as number) ?? ''}
      onChange={e => set(field, e.target.value === '' ? undefined : Number(e.target.value))}
      className={inputCls}
    />
  );

  return (
    <Modal onClose={onClose}>
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-900 dark:text-white">{isNew ? 'Nova Ação' : 'Editar Ação'}</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{nichoAtual}</p>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="p-6 flex flex-col gap-5">
        <Field label="Nome da Ação *">
          <input
            type="text"
            placeholder="Ex: Salário Maternidade"
            value={form.nome || ''}
            onChange={e => set('nome', e.target.value)}
            className={inputCls}
          />
        </Field>

        <Field label="Status">
          <div className="grid grid-cols-2 gap-2">
            {(Object.entries(STATUS_CONFIG) as [StatusAcao, typeof STATUS_CONFIG.verde][]).map(([key, cfg]) => (
              <button
                key={key}
                onClick={() => set('status', key)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-xl border text-sm font-semibold transition-all ${
                  form.status === key
                    ? `${cfg.bg} ${cfg.text} ${cfg.border} border`
                    : 'bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 border-slate-200 dark:border-white/10 hover:bg-slate-200 dark:hover:bg-white/10'
                }`}
              >
                {cfg.emoji} {cfg.label}
              </button>
            ))}
          </div>
        </Field>

        {/* Custo Lead */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Custo por Lead (R$)</p>
          <div className="grid grid-cols-3 gap-2">
            <Field label="Mínimo">{numInput('custoLeadMin', 'R$ 0')}</Field>
            <Field label="Máximo">{numInput('custoLeadMax', 'R$ 0')}</Field>
            <Field label="Médio">{numInput('custoLeadMedio', 'R$ 0')}</Field>
          </div>
        </div>

        {/* CAC */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">CAC — Custo de Aquisição (R$)</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mínimo">{numInput('cacMin', 'R$ 0')}</Field>
            <Field label="Máximo">{numInput('cacMax', 'R$ 0')}</Field>
          </div>
        </div>

        {/* Contratos */}
        <div>
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-widest mb-2.5">Contratos Esperados</p>
          <div className="grid grid-cols-2 gap-2">
            <Field label="Mínimo">{numInput('contratosMin', '0')}</Field>
            <Field label="Máximo">{numInput('contratosMax', '0')}</Field>
          </div>
        </div>

        <Field label="Observações">
          <textarea
            rows={3}
            placeholder="Notas, contexto ou ressalvas sobre esta ação..."
            value={form.observacoes || ''}
            onChange={e => set('observacoes', e.target.value)}
            className={`${inputCls} resize-none`}
          />
        </Field>
      </div>

      <div className="p-6 border-t border-white/10 flex items-center justify-between gap-3">
        <div>
          {!isNew && onDelete && (
            confirmDelete ? (
              <div className="flex items-center gap-2">
                <span className="text-xs text-red-500 dark:text-red-400">Confirmar exclusão?</span>
                <button onClick={() => { onDelete(acao!.id!); onClose(); }} className="px-3 py-1.5 bg-red-500/20 hover:bg-red-500/40 text-red-600 dark:text-red-400 text-xs font-bold rounded-lg transition-all">Sim, excluir</button>
                <button onClick={() => setConfirmDelete(false)} className="px-3 py-1.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-400 text-xs rounded-lg transition-all">Cancelar</button>
              </div>
            ) : (
              <button onClick={() => setConfirmDelete(true)} className="flex items-center gap-1.5 px-3 py-1.5 text-red-400 hover:bg-red-500/10 text-xs font-semibold rounded-lg transition-all">
                <Trash2 size={13} /> Excluir
              </button>
            )
          )}
        </div>
        <div className="flex items-center gap-2">
          <button onClick={onClose} className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-700 dark:text-slate-300 text-sm font-semibold rounded-xl transition-all">
            Cancelar
          </button>
          <button
            onClick={handleSave}
            disabled={!form.nome?.trim()}
            className="px-5 py-2 bg-violet-600 hover:bg-violet-500 disabled:opacity-40 disabled:cursor-not-allowed text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
          >
            {isNew ? 'Criar Ação' : 'Salvar'}
          </button>
        </div>
      </div>
    </Modal>
  );
};

// ─── Compare Modal ────────────────────────────────────────────────────────────

const CompareModal = ({ acoes, onClose, onClearSelection }: { acoes: Acao[]; onClose: () => void; onClearSelection: () => void }) => {
  const [a, b] = acoes;

  const Row = ({ label, va, vb, icon }: { label: string; va: React.ReactNode; vb: React.ReactNode; icon?: React.ReactNode }) => (
    <div className="grid grid-cols-[160px_1fr_1fr] gap-4 py-3 border-b border-slate-200 dark:border-white/5">
      <div className="flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
        {icon}{label}
      </div>
      <div className="text-sm text-slate-900 dark:text-white">{va}</div>
      <div className="text-sm text-slate-900 dark:text-white">{vb}</div>
    </div>
  );

  return (
    <Modal onClose={onClose} wide>
      <div className="p-6 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-600/20 rounded-xl">
            <GitCompare size={18} className="text-violet-400" />
          </div>
          <div>
            <h2 className="text-lg font-black text-slate-900 dark:text-white">Comparação de Ações</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">Análise lado a lado</p>
          </div>
        </div>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="p-6">
        {/* Headers */}
        <div className="grid grid-cols-[160px_1fr_1fr] gap-4 mb-2">
          <div />
          {[a, b].map(ac => (
            <div key={ac.id} className="p-3 bg-slate-50 dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 text-center">
              <p className="text-sm font-bold text-slate-900 dark:text-white line-clamp-2">{ac.nome}</p>
            </div>
          ))}
        </div>

        <div className="mt-4">
          <Row
            label="Status"
            icon={<AlertCircle size={12} />}
            va={<StatusBadge status={a.status} />}
            vb={<StatusBadge status={b.status} />}
          />
          <Row
            label="Custo Lead Médio"
            icon={<DollarSign size={12} />}
            va={a.custoLeadMedio != null ? (
              <span className="text-emerald-400 font-bold">{fmt(a.custoLeadMedio)}</span>
            ) : a.custoLeadMin != null || a.custoLeadMax != null ? fmtRange(a.custoLeadMin, a.custoLeadMax) : <span className="text-slate-500">—</span>}
            vb={b.custoLeadMedio != null ? (
              <span className="text-emerald-400 font-bold">{fmt(b.custoLeadMedio)}</span>
            ) : b.custoLeadMin != null || b.custoLeadMax != null ? fmtRange(b.custoLeadMin, b.custoLeadMax) : <span className="text-slate-500">—</span>}
          />
          <Row
            label="CAC"
            icon={<TrendingUp size={12} />}
            va={<span className={a.cacMin != null || a.cacMax != null ? 'text-violet-300' : 'text-slate-500'}>{fmtRange(a.cacMin, a.cacMax)}</span>}
            vb={<span className={b.cacMin != null || b.cacMax != null ? 'text-violet-300' : 'text-slate-500'}>{fmtRange(b.cacMin, b.cacMax)}</span>}
          />
          <Row
            label="Contratos"
            icon={<Users size={12} />}
            va={<span className={a.contratosMin != null || a.contratosMax != null ? 'text-blue-300' : 'text-slate-500'}>{fmtContratos(a.contratosMin, a.contratosMax)}</span>}
            vb={<span className={b.contratosMin != null || b.contratosMax != null ? 'text-blue-300' : 'text-slate-500'}>{fmtContratos(b.contratosMin, b.contratosMax)}</span>}
          />
          <Row
            label="Observações"
            icon={<FileText size={12} />}
            va={a.observacoes ? <span className="text-slate-300 text-xs">{a.observacoes}</span> : <span className="text-slate-600 text-xs italic">Sem observações</span>}
            vb={b.observacoes ? <span className="text-slate-300 text-xs">{b.observacoes}</span> : <span className="text-slate-600 text-xs italic">Sem observações</span>}
          />
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4">
          {[
            {
              title: 'Lead Médio (R$)',
              data: [
                {
                  name: 'Lead Médio',
                  [a.nome]: a.custoLeadMedio || ((a.custoLeadMin || 0) + (a.custoLeadMax || 0)) / 2 || 0,
                  [b.nome]: b.custoLeadMedio || ((b.custoLeadMin || 0) + (b.custoLeadMax || 0)) / 2 || 0,
                }
              ]
            },
            {
              title: 'CAC (R$)',
              data: [
                {
                  name: 'CAC',
                  [a.nome]: ((a.cacMin || 0) + (a.cacMax || 0)) / 2 || 0,
                  [b.nome]: ((b.cacMin || 0) + (b.cacMax || 0)) / 2 || 0,
                }
              ]
            },
            {
              title: 'Contratos (Qtd)',
              data: [
                {
                  name: 'Contratos',
                  [a.nome]: ((a.contratosMin || 0) + (a.contratosMax || 0)) / 2 || 0,
                  [b.nome]: ((b.contratosMin || 0) + (b.contratosMax || 0)) / 2 || 0,
                }
              ]
            }
          ].map((chart, i) => (
            <div key={i} className="h-[220px] bg-white dark:bg-white/5 rounded-xl border border-slate-200 dark:border-white/10 p-4 pt-5 flex flex-col">
              <h4 className="text-[11px] font-bold text-slate-500 uppercase tracking-widest text-center mb-4">{chart.title}</h4>
              <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chart.data} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="currentColor" className="text-slate-200 dark:text-white/10" />
                    <XAxis dataKey="name" hide />
                    <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10 }} stroke="currentColor" className="text-slate-500 dark:text-slate-400" />
                    <Tooltip
                      cursor={{ fill: 'currentColor', className: 'text-slate-100 dark:text-white/5' }}
                      contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)' }}
                      wrapperClassName="!bg-white dark:!bg-dark-bg !text-slate-900 dark:!text-white border border-slate-200 dark:border-white/10 shadow-xl"
                      itemStyle={{ fontSize: '12px' }}
                      labelStyle={{ display: 'none' }}
                    />
                    <Bar dataKey={a.nome} fill="#8b5cf6" radius={[4, 4, 0, 0]} maxBarSize={50} />
                    <Bar dataKey={b.nome} fill="#10b981" radius={[4, 4, 0, 0]} maxBarSize={50} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          ))}
        </div>

        {/* Legenda Unificada */}
        <div className="mt-5 flex flex-wrap items-center justify-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#8b5cf6]" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{a.nome}</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-sm bg-[#10b981]" />
            <span className="text-xs font-semibold text-slate-600 dark:text-slate-400">{b.nome}</span>
          </div>
        </div>
      </div>

      <div className="p-6 border-t border-white/10 flex items-center justify-end gap-3">
        <button
          onClick={() => { onClearSelection(); onClose(); }}
          className="px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
        >
          Limpar seleção
        </button>
        <button onClick={onClose} className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-all">
          Fechar
        </button>
      </div>
    </Modal>
  );
};

// ─── Detail Modal (single action) ─────────────────────────────────────────────

// Helper: get the "effective" single value of a metric for comparison
const getLeadValue = (a: Partial<Acao>) =>
  (a.custoLeadMedio ?? ((a.custoLeadMin ?? 0) + (a.custoLeadMax ?? 0)) / 2) || null;
const getCacValue = (a: Partial<Acao>) =>
  (((a.cacMin ?? 0) + (a.cacMax ?? 0)) / 2) || null;
const getContratosValue = (a: Partial<Acao>) =>
  (((a.contratosMin ?? 0) + (a.contratosMax ?? 0)) / 2) || null;

const DeltaIndicator = ({ current, previous, invert }: { current: number | null; previous: number | null; invert?: boolean }) => {
  if (current == null || previous == null || current === previous) return null;
  const up = current > previous;
  // For costs (lead, CAC), going UP is bad. For contracts, going UP is good.
  const isGood = invert ? !up : up;
  return (
    <span className={`inline-flex items-center gap-0.5 text-[11px] font-bold ml-2 px-1.5 py-0.5 rounded-md ${
      isGood ? 'text-emerald-400 bg-emerald-500/10' : 'text-red-400 bg-red-500/10'
    }`}>
      {up ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
      {Math.abs(Math.round(((current - previous) / previous) * 100))}%
    </span>
  );
};

const DetailModal = ({ acao, onClose, onEdit, onDeleteHistory }: {
  acao: Acao;
  onClose: () => void;
  onEdit: () => void;
  onDeleteHistory: (acaoId: string, historyId: string) => void;
}) => {
  const [tab, setTab] = useState<'info' | 'history'>('info');
  const lastHistory = acao.history?.length ? acao.history[acao.history.length - 1] : null;

  const Row = ({ label, value, icon, delta }: { label: string; value: React.ReactNode; icon?: React.ReactNode; delta?: React.ReactNode }) => (
    <div className="flex items-start gap-4 py-3.5 border-b border-slate-100 dark:border-white/5 last:border-0">
      <div className="w-[140px] shrink-0 flex items-center gap-2 text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider pt-0.5">
        {icon}{label}
      </div>
      <div className="text-sm text-slate-900 dark:text-white flex-1 flex items-center flex-wrap gap-1">
        {value}
        {delta}
      </div>
    </div>
  );

  return (
    <Modal onClose={onClose}>
      {/* Header */}
      <div className="p-6 border-b border-slate-100 dark:border-white/10">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="p-2.5 bg-violet-600/20 rounded-xl shrink-0">
              <Eye size={18} className="text-violet-400" />
            </div>
            <div className="min-w-0">
              <h2 className="text-lg font-black text-slate-900 dark:text-white leading-snug">{acao.nome}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">{acao.nicho}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-slate-900 dark:hover:text-white shrink-0">
            <X size={18} />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-white/5 rounded-xl p-1">
          <button
            onClick={() => setTab('info')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'info'
                ? 'bg-white dark:bg-dark-card text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <Eye size={13} /> Informações
          </button>
          <button
            onClick={() => setTab('history')}
            className={`flex-1 flex items-center justify-center gap-2 px-3 py-2 text-xs font-bold rounded-lg transition-all ${
              tab === 'history'
                ? 'bg-white dark:bg-dark-card text-violet-600 dark:text-violet-400 shadow-sm'
                : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
            }`}
          >
            <History size={13} /> Histórico
            {(acao.history?.length ?? 0) > 0 && (
              <span className="ml-1 px-1.5 py-0.5 text-[10px] font-bold bg-violet-500/20 text-violet-400 rounded-full">
                {acao.history!.length}
              </span>
            )}
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 max-h-[55vh] overflow-y-auto">
        {tab === 'info' ? (
          <>
            <Row
              label="Status"
              icon={<AlertCircle size={12} />}
              value={<StatusBadge status={acao.status} />}
              delta={lastHistory && lastHistory.status !== acao.status ? (
                <span className="text-[10px] text-slate-500 ml-2">antes: <StatusBadge status={lastHistory.status} /></span>
              ) : null}
            />
            <Row
              label="Custo Lead"
              icon={<DollarSign size={12} />}
              value={
                acao.custoLeadMedio != null ? (
                  <span className="text-emerald-400 font-bold text-base">{fmt(acao.custoLeadMedio)}</span>
                ) : acao.custoLeadMin != null || acao.custoLeadMax != null ? (
                  <span className="text-emerald-400 font-bold text-base">{fmtRange(acao.custoLeadMin, acao.custoLeadMax)}</span>
                ) : <span className="text-slate-500 italic">Não informado</span>
              }
              delta={lastHistory ? <DeltaIndicator current={getLeadValue(acao)} previous={getLeadValue(lastHistory)} invert /> : null}
            />
            <Row
              label="CAC"
              icon={<TrendingUp size={12} />}
              value={
                acao.cacMin != null || acao.cacMax != null ? (
                  <span className="text-violet-300 font-bold text-base">{fmtRange(acao.cacMin, acao.cacMax)}</span>
                ) : <span className="text-slate-500 italic">Não informado</span>
              }
              delta={lastHistory ? <DeltaIndicator current={getCacValue(acao)} previous={getCacValue(lastHistory)} invert /> : null}
            />
            <Row
              label="Contratos"
              icon={<Users size={12} />}
              value={
                acao.contratosMin != null || acao.contratosMax != null ? (
                  <span className="text-blue-300 font-bold text-base">{fmtContratos(acao.contratosMin, acao.contratosMax)}</span>
                ) : <span className="text-slate-500 italic">Não informado</span>
              }
              delta={lastHistory ? <DeltaIndicator current={getContratosValue(acao)} previous={getContratosValue(lastHistory)} /> : null}
            />
            <Row
              label="Observações"
              icon={<FileText size={12} />}
              value={
                acao.observacoes ? (
                  <p className="text-slate-300 text-sm leading-relaxed whitespace-pre-wrap">{acao.observacoes}</p>
                ) : <span className="text-slate-600 text-sm italic">Sem observações</span>
              }
            />
          </>
        ) : (
          /* History Tab */
          <div>
            {!acao.history?.length ? (
              <div className="flex flex-col items-center justify-center py-12 text-center">
                <div className="w-12 h-12 bg-white/5 rounded-2xl flex items-center justify-center mb-3">
                  <History size={20} className="text-slate-600" />
                </div>
                <p className="text-slate-500 font-semibold text-sm">Nenhuma edição anterior</p>
                <p className="text-slate-600 text-xs mt-1">O histórico aparece quando você edita a ação</p>
              </div>
            ) : (
              <div className="relative">
                {/* Timeline line */}
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-slate-200 dark:bg-white/10" />

                <div className="flex flex-col gap-1">
                  {[...acao.history].reverse().map((entry, i) => (
                    <div key={entry.id} className="group relative flex gap-4 pl-1">
                      {/* Timeline dot */}
                      <div className="relative z-10 mt-4 w-[30px] flex justify-center shrink-0">
                        <div className={`w-2.5 h-2.5 rounded-full border-2 ${
                          i === 0
                            ? 'bg-violet-500 border-violet-500/40'
                            : 'bg-slate-400 dark:bg-slate-600 border-slate-300 dark:border-slate-700'
                        }`} />
                      </div>

                      {/* Card */}
                      <div className="flex-1 bg-white dark:bg-white/5 border border-slate-100 dark:border-white/5 rounded-xl p-4 mb-2 transition-all hover:border-slate-200 dark:hover:border-white/10">
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center gap-2">
                            <Clock size={12} className="text-slate-500" />
                            <span className="text-[11px] font-semibold text-slate-500">
                              {new Date(entry.date).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                          <button
                            onClick={() => onDeleteHistory(acao.id, entry.id)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-slate-400 hover:text-red-400 hover:bg-red-500/10 rounded-lg transition-all"
                            title="Apagar entrada"
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>

                        <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-xs">
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase tracking-wider">Status</span>
                            <div className="mt-0.5"><StatusBadge status={entry.status} /></div>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase tracking-wider">Lead</span>
                            <p className="mt-0.5 font-semibold text-emerald-400">
                              {entry.custoLeadMedio != null ? fmt(entry.custoLeadMedio)
                                : entry.custoLeadMin != null || entry.custoLeadMax != null ? fmtRange(entry.custoLeadMin, entry.custoLeadMax)
                                : <span className="text-slate-600">—</span>}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase tracking-wider">CAC</span>
                            <p className="mt-0.5 font-semibold text-violet-300">
                              {entry.cacMin != null || entry.cacMax != null ? fmtRange(entry.cacMin, entry.cacMax) : <span className="text-slate-600">—</span>}
                            </p>
                          </div>
                          <div>
                            <span className="text-slate-500 text-[10px] uppercase tracking-wider">Contratos</span>
                            <p className="mt-0.5 font-semibold text-blue-300">
                              {entry.contratosMin != null || entry.contratosMax != null ? fmtContratos(entry.contratosMin, entry.contratosMax) : <span className="text-slate-600">—</span>}
                            </p>
                          </div>
                        </div>

                        {entry.observacoes && (
                          <p className="mt-2 text-[11px] text-slate-500 italic line-clamp-2">"{entry.observacoes}"</p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-6 border-t border-slate-100 dark:border-white/10 flex items-center justify-end gap-3">
        <button
          onClick={() => { onClose(); onEdit(); }}
          className="flex items-center gap-2 px-4 py-2 text-sm font-semibold text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 rounded-xl transition-all"
        >
          <Edit2 size={14} />
          Editar
        </button>
        <button onClick={onClose} className="px-5 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20">
          Fechar
        </button>
      </div>
    </Modal>
  );
};

// ─── Acao Card ────────────────────────────────────────────────────────────────

interface AcaoCardProps {
  acao: Acao;
  selected: boolean;
  selectionDisabled: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onView: () => void;
}

const AcaoCard = ({ acao, selected, selectionDisabled, onSelect, onEdit, onView }: AcaoCardProps) => {
  const cfg = STATUS_CONFIG[acao.status];
  const hasMetrics = acao.custoLeadMedio != null || acao.custoLeadMin != null || acao.cacMin != null || acao.contratosMin != null;

  return (
    <div className={`group relative bg-white dark:bg-dark-card border rounded-2xl p-5 transition-all duration-200 hover:border-violet-500/50 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5 flex flex-col ${
      selected ? 'border-violet-500/50 shadow-lg shadow-violet-500/10' : 'border-slate-200 dark:border-white/10'
    }`}>
      {/* Header: checkbox + edit */}
      <div className="flex items-start justify-between gap-2 mb-3">
        <button
          onClick={onSelect}
          disabled={selectionDisabled && !selected}
          className={`mt-0.5 flex-shrink-0 transition-all ${selectionDisabled && !selected ? 'opacity-30 cursor-not-allowed' : 'cursor-pointer'}`}
        >
          {selected
            ? <CheckSquare size={16} className="text-violet-400" />
            : <Square size={16} className="text-slate-600 hover:text-slate-400" />
          }
        </button>
        <button
          onClick={onEdit}
          className="flex-shrink-0 opacity-0 group-hover:opacity-100 p-1.5 bg-slate-100 dark:bg-white/5 hover:bg-violet-600/20 hover:text-violet-600 dark:hover:text-violet-400 text-slate-400 dark:text-slate-500 rounded-lg transition-all"
        >
          <Edit2 size={12} />
        </button>
      </div>

      {/* Name — clickable to view details */}
      <h3 onClick={onView} className="text-sm font-bold text-slate-900 dark:text-white leading-snug mb-2 line-clamp-2 flex-1 cursor-pointer hover:text-violet-500 dark:hover:text-violet-300 transition-colors">{acao.nome}</h3>

      {/* Status badge */}
      <div className="mb-3">
        <StatusBadge status={acao.status} />
      </div>

      {/* Metrics */}
      {hasMetrics && (
        <div className="flex flex-wrap gap-x-3 gap-y-1.5 text-[11px] pt-3 border-t border-slate-100 dark:border-white/5">
          {(acao.custoLeadMedio != null || acao.custoLeadMin != null) && (
            <div className="flex items-center gap-1">
              <DollarSign size={10} className="text-emerald-400" />
              <span className="text-slate-500">Lead:</span>
              <span className="text-emerald-400 font-semibold">
                {acao.custoLeadMedio != null ? fmt(acao.custoLeadMedio) : fmtRange(acao.custoLeadMin, acao.custoLeadMax)}
              </span>
            </div>
          )}
          {(acao.cacMin != null || acao.cacMax != null) && (
            <div className="flex items-center gap-1">
              <TrendingUp size={10} className="text-violet-400" />
              <span className="text-slate-500">CAC:</span>
              <span className="text-violet-300 font-semibold">{fmtRange(acao.cacMin, acao.cacMax)}</span>
            </div>
          )}
          {(acao.contratosMin != null || acao.contratosMax != null) && (
            <div className="flex items-center gap-1">
              <Users size={10} className="text-blue-400" />
              <span className="text-slate-500">Contr:</span>
              <span className="text-blue-300 font-semibold">{fmtContratos(acao.contratosMin, acao.contratosMax)}</span>
            </div>
          )}
        </div>
      )}

      {/* Observations */}
      {acao.observacoes && (
        <p className="mt-2 text-[11px] text-slate-500 line-clamp-2 italic">"{acao.observacoes}"</p>
      )}
    </div>
  );
};

// ─── Nicho Card ───────────────────────────────────────────────────────────────

interface NichoCardProps {
  nicho: string;
  acoes: Acao[];
  onClick: () => void;
}

const NichoCard = ({ nicho, acoes, onClick }: NichoCardProps) => {
  const counts = useMemo(() => ({
    verde:    acoes.filter(a => a.status === 'verde').length,
    amarelo:  acoes.filter(a => a.status === 'amarelo').length,
    vermelho: acoes.filter(a => a.status === 'vermelho').length,
    a_testar: acoes.filter(a => a.status === 'a_testar').length,
  }), [acoes]);

  const total = acoes.length;
  const hottest = acoes.find(a => a.status === 'verde');

  return (
    <button
      onClick={onClick}
      className="group w-full text-left bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 hover:border-violet-500/50 rounded-2xl p-5 transition-all duration-200 hover:shadow-lg hover:shadow-violet-500/5 hover:-translate-y-0.5"
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <span className="text-2xl">{NICHO_ICONS[nicho] || '📁'}</span>
          <div>
            <h3 className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-300 transition-colors">{nicho}</h3>
            <p className="text-xs text-slate-500 dark:text-slate-500 mt-0.5">{total} {total === 1 ? 'ação' : 'ações'}</p>
          </div>
        </div>
        <ChevronRight size={16} className="text-slate-600 group-hover:text-violet-400 transition-all group-hover:translate-x-0.5" />
      </div>

      {/* Status pills */}
      {total > 0 ? (
        <div className="flex flex-wrap gap-1.5">
          {counts.verde > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">
              🟢 {counts.verde}
            </span>
          )}
          {counts.amarelo > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-yellow-500/10 border border-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full">
              🟡 {counts.amarelo}
            </span>
          )}
          {counts.vermelho > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold rounded-full">
              🔴 {counts.vermelho}
            </span>
          )}
          {counts.a_testar > 0 && (
            <span className="flex items-center gap-1 px-2 py-0.5 bg-blue-500/10 border border-blue-500/20 text-blue-400 text-xs font-bold rounded-full">
              🔵 {counts.a_testar}
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 text-xs text-slate-600">
          <Plus size={12} />
          <span>Clique para adicionar ações</span>
        </div>
      )}

      {/* Hottest action preview */}
      {hottest && (
        <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
          <p className="text-[10px] text-slate-500 uppercase tracking-wider mb-1">🔥 Mais quente</p>
          <p className="text-xs text-slate-700 dark:text-slate-300 line-clamp-1">{hottest.nome}</p>
        </div>
      )}
    </button>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

export default function PlaybookAcoes() {
  const [acoes, setAcoes] = useState<Acao[]>(INITIAL_ACOES);
  const [nichoAtual, setNichoAtual] = useState<string | null>(null);
  const [editando, setEditando] = useState<Partial<Acao> | null | 'new'>(null);
  const [selecionadas, setSelecionadas] = useState<string[]>([]);
  const [comparando, setComparando] = useState(false);
  const [busca, setBusca] = useState('');
  const [filtroStatus, setFiltroStatus] = useState<StatusAcao | 'all'>('all');
  const [visualizandoId, setVisualizandoId] = useState<string | null>(null);
  const visualizando = visualizandoId ? acoes.find(a => a.id === visualizandoId) ?? null : null;

  // Ações do nicho atual, ordenadas por status
  const acoesDoNicho = useMemo(() => {
    if (!nichoAtual) return [];
    return acoes
      .filter(a => a.nicho === nichoAtual)
      .filter(a => {
        const matchBusca = busca === '' || a.nome.toLowerCase().includes(busca.toLowerCase());
        const matchStatus = filtroStatus === 'all' || a.status === filtroStatus;
        return matchBusca && matchStatus;
      })
      .sort((a, b) => STATUS_CONFIG[a.status].order - STATUS_CONFIG[b.status].order);
  }, [acoes, nichoAtual, busca, filtroStatus]);

  const handleSave = (acao: Acao) => {
    setAcoes(prev => {
      const idx = prev.findIndex(a => a.id === acao.id);
      if (idx >= 0) {
        const oldAcao = prev[idx];
        // Create a history snapshot of the OLD values before overwriting
        const snapshot: AcaoHistoryEntry = {
          id: `h-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          date: oldAcao.updatedAt || new Date().toISOString(),
          status: oldAcao.status,
          custoLeadMin: oldAcao.custoLeadMin,
          custoLeadMax: oldAcao.custoLeadMax,
          custoLeadMedio: oldAcao.custoLeadMedio,
          cacMin: oldAcao.cacMin,
          cacMax: oldAcao.cacMax,
          contratosMin: oldAcao.contratosMin,
          contratosMax: oldAcao.contratosMax,
          observacoes: oldAcao.observacoes,
        };
        const next = [...prev];
        next[idx] = {
          ...acao,
          updatedAt: new Date().toISOString(),
          history: [...(oldAcao.history || []), snapshot],
        };
        return next;
      }
      return [...prev, { ...acao, updatedAt: new Date().toISOString() }];
    });
    setEditando(null);
  };

  const handleDeleteHistory = (acaoId: string, historyId: string) => {
    setAcoes(prev => prev.map(a => {
      if (a.id !== acaoId) return a;
      return { ...a, history: (a.history || []).filter(h => h.id !== historyId) };
    }));
  };

  const handleDelete = (id: string) => {
    setAcoes(prev => prev.filter(a => a.id !== id));
    setSelecionadas(prev => prev.filter(sid => sid !== id));
  };

  const toggleSelect = (id: string) => {
    setSelecionadas(prev => {
      if (prev.includes(id)) return prev.filter(s => s !== id);
      if (prev.length >= 2) return prev;
      return [...prev, id];
    });
  };

  const acoesComparar = acoes.filter(a => selecionadas.includes(a.id));
  const editandoAcao = editando === 'new' ? {} : (editando || null);

  return (
    <div className="min-h-screen bg-light-bg dark:bg-dark-bg text-slate-900 dark:text-white">

      {/* ── Header ── */}
      <div className="flex items-center justify-between px-6 md:px-8 pt-8 pb-6">
        <div className="flex items-center gap-4">
          {nichoAtual && (
            <button
              onClick={() => {
                setNichoAtual(null);
                setBusca('');
                setFiltroStatus('all');
              }}
              className="p-2 hover:bg-white/10 rounded-xl transition-all text-slate-400 hover:text-white"
            >
              <ArrowLeft size={18} />
            </button>
          )}
          <div>
            <h1 className="text-2xl font-black tracking-tight text-slate-900 dark:text-white">
              Playbook de{' '}
              <span className="text-violet-500">
                {nichoAtual || 'Ações'}
              </span>
            </h1>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
              {nichoAtual
                ? `${acoesDoNicho.length} ações encontradas`
                : 'Selecione um nicho jurídico para ver as ações'
              }
            </p>
          </div>
        </div>

        {nichoAtual && (
          <button
            onClick={() => setEditando('new')}
            className="flex items-center gap-2 px-4 py-2.5 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
          >
            <Plus size={16} /> Nova Ação
          </button>
        )}
      </div>

      {/* ── Content ── */}
      <div className="px-6 md:px-8 pb-20">

        {/* TELA: LISTA DE NICHOS */}
        {!nichoAtual && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {NICHOS.map(nicho => (
              <NichoCard
                key={nicho}
                nicho={nicho}
                acoes={acoes.filter(a => a.nicho === nicho)}
                onClick={() => setNichoAtual(nicho)}
              />
            ))}
          </div>
        )}

        {/* TELA: AÇÕES DO NICHO */}
        {nichoAtual && (
          <div>
            {/* Filtros */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 mb-6">
              <div className="relative flex-1 max-w-xs">
                <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <input
                  type="text"
                  placeholder="Buscar ação..."
                  value={busca}
                  onChange={e => setBusca(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-900 dark:text-white placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:border-violet-500/50 transition-all"
                />
              </div>
              <div className="flex items-center gap-2">
                <Filter size={13} className="text-slate-500" />
                {(['all', 'verde', 'amarelo', 'vermelho', 'a_testar'] as const).map(s => (
                  <button
                    key={s}
                    onClick={() => setFiltroStatus(s)}
                    className={`px-3 py-1.5 text-xs font-bold rounded-lg transition-all ${
                      filtroStatus === s
                        ? 'bg-violet-600 text-white'
                        : 'bg-slate-200 dark:bg-white/5 text-slate-600 dark:text-slate-400 hover:bg-slate-300 dark:hover:bg-white/10'
                    }`}
                  >
                    {s === 'all' ? 'Todos' : STATUS_CONFIG[s].emoji + ' ' + STATUS_CONFIG[s].label}
                  </button>
                ))}
              </div>
            </div>

            {/* Actions list */}
            {acoesDoNicho.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-20 text-center">
                <div className="w-16 h-16 bg-white dark:bg-white/5 border border-slate-200 dark:border-white/0 rounded-2xl flex items-center justify-center mb-4">
                  <FileText size={24} className="text-slate-400 dark:text-slate-600" />
                </div>
                <p className="text-slate-400 font-semibold">Nenhuma ação encontrada</p>
                <p className="text-slate-600 text-sm mt-1">
                  {busca || filtroStatus !== 'all' ? 'Tente outros filtros' : 'Clique em "Nova Ação" para começar'}
                </p>
              </div>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                {acoesDoNicho.map(acao => (
                  <AcaoCard
                    key={acao.id}
                    acao={acao}
                    selected={selecionadas.includes(acao.id)}
                    selectionDisabled={selecionadas.length >= 2}
                    onSelect={() => toggleSelect(acao.id)}
                    onEdit={() => setEditando(acao)}
                    onView={() => setVisualizandoId(acao.id)}
                  />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Floating Compare Button ── */}
      {selecionadas.length > 0 && !comparando && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-40 flex items-center gap-3 p-2 bg-white/95 dark:bg-[#11111b]/95 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl">
          <div className="pl-3 pr-1 py-1 flex flex-col justify-center">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-widest leading-none mb-1">Comparar</p>
            <p className="text-sm font-semibold text-slate-900 dark:text-white leading-none whitespace-nowrap">
              {selecionadas.length} de 2 selecionadas
            </p>
          </div>
          
          {selecionadas.length === 2 ? (
            <button
              onClick={() => setComparando(true)}
              className="flex items-center gap-2 px-5 py-2.5 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl shadow-lg shadow-violet-600/30 transition-all hover:scale-105 active:scale-95"
            >
              <GitCompare size={16} />
              Comparar Ações
            </button>
          ) : (
            <button
              onClick={() => setSelecionadas([])}
              className="px-4 py-2.5 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 font-semibold rounded-xl transition-all"
            >
              Cancelar
            </button>
          )}
        </div>
      )}

      {/* ── Modals ── */}
      {(editando !== null) && (
        <EditModal
          acao={editandoAcao as Partial<Acao>}
          nichoAtual={nichoAtual || ''}
          onSave={handleSave}
          onDelete={editando !== 'new' ? handleDelete : undefined}
          onClose={() => setEditando(null)}
        />
      )}

      {comparando && acoesComparar.length === 2 && (
        <CompareModal
          acoes={acoesComparar}
          onClose={() => setComparando(false)}
          onClearSelection={() => setSelecionadas([])}
        />
      )}

      {visualizando && (
        <DetailModal
          acao={visualizando}
          onClose={() => setVisualizandoId(null)}
          onEdit={() => { const v = visualizando; setVisualizandoId(null); if (v) setEditando(v); }}
          onDeleteHistory={handleDeleteHistory}
        />
      )}
    </div>
  );
}
