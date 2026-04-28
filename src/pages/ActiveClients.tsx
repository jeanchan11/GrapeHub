
import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Plus, Search, Mail, Phone, 
  MoreVertical, Edit2, Trash2, X, 
  CheckCircle2, AlertCircle, Filter,
  Download, UserPlus, ArrowUpDown, FileText,
  Link as LinkIcon, Unlink, Check, ChevronDown,
  UserMinus, MessageSquare, AlertTriangle, ShieldAlert,
  CreditCard
} from 'lucide-react';

import { PageHeader } from '../components/ui/PageHeader';
import ClientModal from '../components/ClientModal';

interface Client {
  id: string;
  name: string;
  email: string;
  phone: string;
  status: 'Ativo' | 'Inativo';
  startDate: string;
  location: string;
  squad: string;
  tags: string;
  contracts: string; // JSON string of array of objects { name: string, url: string }
  createdAt: string;
  hasFinancialLink?: boolean;
  hasProjectLink?: boolean;
  projectName?: string;
  product?: string;
  hasActiveSubscription?: boolean;
  subscriptionValue?: number;
  subscriptionNextDue?: string;
  subscriptionBillingType?: string;
  subscriptionCycle?: string;
  finPeopleGuid?: string;
}

interface FinPerson {
  id: number;
  name: string;
  cnpjcpf: string;
  grapehub_client_id: string | null;
}

const ActiveClients: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'ativos' | 'churn'>('ativos');
  const [openMenuId, setOpenMenuId] = useState<string | null>(null);
  const [menuPos, setMenuPos] = useState<{top: number, left: number}>({top: 0, left: 0});
  const [contractPreview, setContractPreview] = useState<{name: string, url: string} | null>(null);
  const contractInputRef = useRef<HTMLInputElement>(null);
  const [contractUploadClientId, setContractUploadClientId] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState<string>('name');
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc');

  // Churn modal state
  const [churnClient, setChurnClient] = useState<Client | null>(null);
  const [churnType, setChurnType] = useState<'INEVITÁVEL' | 'EVITÁVEL' | ''>('');
  const [churnReasons, setChurnReasons] = useState<string[]>([]);
  const [churnComment, setChurnComment] = useState('');
  
  // Financial link states (needed for table indicators)
  const [finPeople, setFinPeople] = useState<FinPerson[]>([]);
  const [isFetchingFin, setIsFetchingFin] = useState(false);
  const [projects, setProjects] = useState<any[]>([]);

  // Fetch clients
  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/clients');
      if (response.ok) {
        const data = await response.json();
        if (data && data.length > 0) {
          setClients(data);
        } else {
          // Initial mock clients based on user image
          const initialClients = [
            { 
              id: '1', 
              name: 'Betoni Borges Advogados Associados', 
              email: 'contato@betoni.com', 
              phone: '(11) 99999-9999', 
              status: 'Ativo', 
              startDate: '2023-05-18', 
              location: 'Paranaíba, MS, 79500-0...', 
              squad: 'Able', 
              tags: 'consumidor, previdenciario', 
              contracts: '[]',
              createdAt: new Date().toISOString()
            },
            { 
              id: '2', 
              name: 'THIAGO BARBOSA SOCIEDADE INDIVIDUAL', 
              email: 'thiago@barbosa.com', 
              phone: '(11) 88888-8888', 
              status: 'Ativo', 
              startDate: '2023-05-19', 
              location: '-', 
              squad: 'Able', 
              tags: '', 
              contracts: '[]',
              createdAt: new Date().toISOString()
            },
            { 
              id: '3', 
              name: 'JOAO LEANDRO LONGO ADVOCACIA', 
              email: 'joao@longo.com', 
              phone: '(11) 77777-7777', 
              status: 'Ativo', 
              startDate: '2023-06-14', 
              location: 'R. Dom Pedro II, 16 - DIV...', 
              squad: 'Baker', 
              tags: 'previdenciario', 
              contracts: '[]',
              createdAt: new Date().toISOString()
            },
            { 
              id: '4', 
              name: 'Elleven Partners', 
              email: 'contato@elleven.com', 
              phone: '(11) 66666-6666', 
              status: 'Ativo', 
              startDate: '2023-07-17', 
              location: 'Uberlândia, MG', 
              squad: 'Baker', 
              tags: 'empresarial', 
              contracts: '[]',
              createdAt: new Date().toISOString()
            },
            { id: '5', name: 'GARIGLIO ADVOGADOS', email: '', phone: '', status: 'Ativo', startDate: '2023-08-25', location: 'Duque de Caxias, RJ', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '6', name: 'Bárbara Tracy Wichmann', email: '', phone: '', status: 'Ativo', startDate: '2023-09-13', location: 'Campo Bom, RS', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '7', name: 'Advocacia Previdenciária Dra Priscila Braga', email: '', phone: '', status: 'Ativo', startDate: '2023-10-27', location: 'Votuporanga - SP', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '8', name: 'Poffo & Koller Advogados Associados', email: '', phone: '', status: 'Ativo', startDate: '2024-03-19', location: 'Joinville - SC', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '9', name: 'Elizabet Correa', email: '', phone: '', status: 'Ativo', startDate: '2024-04-17', location: 'Videira, SC', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '10', name: 'Ávila & Peixoto Advogados', email: '', phone: '', status: 'Ativo', startDate: '2024-06-07', location: 'Brasília, DF', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '11', name: 'JN Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2024-07-15', location: 'João Pessoa, PB', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '12', name: 'LOPES ADVOGADOS ASSOCIADOS', email: '', phone: '', status: 'Ativo', startDate: '2024-11-06', location: 'Caxias do Sul, RS', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '13', name: 'EFS Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2024-11-22', location: 'Porto Alegre, RS', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '14', name: 'CARDOSO E DITZEL ADVOGADOS', email: '', phone: '', status: 'Ativo', startDate: '2024-11-26', location: 'Londrina, PR', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '15', name: 'RPT Advogados', email: '', phone: '', status: 'Ativo', startDate: '2024-12-03', location: 'Guaíra - SP', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '16', name: 'Carvalho e mendonça advocacia', email: '', phone: '', status: 'Ativo', startDate: '2024-12-11', location: 'Osasco - SP', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '17', name: 'Nassar machado advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-02-10', location: 'Curitiba, PR', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '18', name: 'AHT ADVOGADOS', email: '', phone: '', status: 'Ativo', startDate: '2025-02-25', location: 'Guarulhos - SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '19', name: 'KZ Advogados', email: '', phone: '', status: 'Ativo', startDate: '2025-03-06', location: 'São Paulo, SP', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '20', name: 'Ana Cláudia Potthoff Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-03-18', location: 'Porto Alegre, RS', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '21', name: 'Dutra Medeiros Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-03-27', location: 'Teófilo Otoni, MG', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '22', name: 'LUCIANA LOUREIRO ADVOGADOS ASSOCIADOS', email: '', phone: '', status: 'Ativo', startDate: '2025-04-08', location: 'Cuiabá - MT', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '23', name: 'ACS', email: '', phone: '', status: 'Ativo', startDate: '2025-04-15', location: 'São Paulo, SP', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '24', name: 'Vilela Brescovici advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-04-16', location: 'Rondonópolis - MT', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '25', name: 'BARROS ADVOCACIA', email: '', phone: '', status: 'Ativo', startDate: '2025-04-24', location: 'Anápolis - GO', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '26', name: 'Viegas Futami Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-05-07', location: 'São Paulo, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '27', name: 'Tomanaga sociedade de Advogados', email: '', phone: '', status: 'Ativo', startDate: '2025-05-07', location: 'Londrina, PR', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '28', name: 'DFCC Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-06-10', location: 'Pinheiros, São Paulo - SP', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '29', name: 'Ferrari & Advogados Associados', email: '', phone: '', status: 'Ativo', startDate: '2025-06-20', location: 'Rio do Sul - SC', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '30', name: 'JMV Advogados', email: '', phone: '', status: 'Ativo', startDate: '2025-07-10', location: 'Goiânia, GO', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '31', name: 'Dezotti Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-07-14', location: 'Santo André, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '32', name: 'Alcântara Advogados', email: '', phone: '', status: 'Ativo', startDate: '2025-07-14', location: 'São Paulo, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '33', name: 'Carla Rebelo Advogada', email: '', phone: '', status: 'Ativo', startDate: '2025-07-17', location: 'São Paulo, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '34', name: 'Graziele Palmas Lopes Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-07-23', location: 'Brasília, DF', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '35', name: 'BKA', email: '', phone: '', status: 'Ativo', startDate: '2025-08-05', location: 'Curitiba, PR', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '36', name: 'Jogador Mente Forte', email: '', phone: '', status: 'Ativo', startDate: '2025-08-12', location: 'Cascavel - PR', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '37', name: 'Breno Augusto Ponijaleski - Sociedade de Advogados', email: '', phone: '', status: 'Ativo', startDate: '2025-08-13', location: 'Jaraguá do Sul, SC', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '38', name: 'Soluciona Prev', email: '', phone: '', status: 'Ativo', startDate: '2025-08-18', location: 'Rio de Janeiro, RJ', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '39', name: 'Chácara Baldan Eventos LTDA', email: '', phone: '', status: 'Ativo', startDate: '2025-08-20', location: 'Curitiba, PR', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '40', name: 'TAEVO', email: '', phone: '', status: 'Ativo', startDate: '2025-09-08', location: 'Goiânia, GO', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '41', name: 'PLANEPREV ASSESSORIA PREVIDENCIÁRIA', email: '', phone: '', status: 'Ativo', startDate: '2025-09-15', location: 'Curitiba, PR', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '42', name: 'Vinicius Leocadio Sociedade Individual de Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-10-22', location: 'Goiânia, GO', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '43', name: 'Alexsandro Peixoto Advogados Associados (APAC)', email: '', phone: '', status: 'Ativo', startDate: '2025-11-05', location: 'Rio de Janeiro, RJ', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '44', name: 'CAA ESCRITÓRIO DE ADVOCACIA', email: '', phone: '', status: 'Ativo', startDate: '2025-11-06', location: 'Rio de Janeiro, RJ', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '45', name: 'MARCIA TAMBORINDEGUY', email: '', phone: '', status: 'Ativo', startDate: '2025-11-06', location: 'São Paulo, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '46', name: 'FONTAN & PAZ ADVOGADOS', email: '', phone: '', status: 'Ativo', startDate: '2025-11-13', location: 'Joinville - SC', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '47', name: 'AVILA & ALVES ADVOGADOS ASSOCIADOS', email: '', phone: '', status: 'Ativo', startDate: '2025-11-26', location: 'Brasília - DF', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '48', name: 'Elida pontes advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-12-02', location: 'Paraíba', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '49', name: 'MPL Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2025-12-05', location: 'Rio de Janeiro, RJ', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '50', name: 'INAITA G R SOARES CARVALHO ARNOLD SOC INDIV DE AD', email: '', phone: '', status: 'Ativo', startDate: '2025-12-09', location: 'Mato Grosso', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '51', name: 'MACEDO TUMA ADVOCACIA', email: '', phone: '', status: 'Ativo', startDate: '2026-01-09', location: 'São Paulo', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '52', name: 'Dillenburg Boaventura Advogados', email: '', phone: '', status: 'Ativo', startDate: '2026-01-09', location: '-', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '53', name: 'Solucionar Consultoria', email: '', phone: '', status: 'Ativo', startDate: '2026-01-12', location: 'Rio de Janeiro, RJ', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '54', name: 'Oliveira Filho Advogados', email: '', phone: '', status: 'Ativo', startDate: '2026-01-13', location: '-', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '55', name: 'STAR ONE CORRETORA DE SEGUROS E NEGOCIOS LTDA', email: '', phone: '', status: 'Ativo', startDate: '2026-01-19', location: '-', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '56', name: 'RAFAELA AZAM ADVOGADA', email: '', phone: '', status: 'Ativo', startDate: '2026-01-19', location: '-', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '57', name: 'Faria Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-01-19', location: '-', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '58', name: 'Ferreira Advogados', email: '', phone: '', status: 'Ativo', startDate: '2026-01-28', location: 'Santarém - PA', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '59', name: 'ALMEIDA MOURAO ADVOGADOS ASSOCIADOS', email: '', phone: '', status: 'Ativo', startDate: '2026-01-29', location: '-', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '60', name: 'Sandra Maria Bertussi Ferrari', email: '', phone: '', status: 'Ativo', startDate: '2026-01-29', location: 'Curitiba, PR', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '61', name: 'Garcia e Garcia Advogados Associados', email: '', phone: '', status: 'Ativo', startDate: '2026-01-30', location: 'Porto Alegre, RS', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '62', name: 'Zelmo Simionato', email: '', phone: '', status: 'Ativo', startDate: '2026-02-09', location: 'São Paulo - SP', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '63', name: 'Bicudo Sociedade Individual de Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-02-09', location: 'Campo Grande - MS', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '64', name: 'Duarte Associados, Advocacia Estratégica, Consultoria e Assessoria Jurídica', email: '', phone: '', status: 'Ativo', startDate: '2026-02-12', location: '-', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '65', name: 'Sarah Coimbra Advocacia e Assessoria Jurídica', email: '', phone: '', status: 'Ativo', startDate: '2026-02-19', location: 'Araguaína - TO', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '66', name: 'Vizioli Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-02-19', location: 'Paraná', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '67', name: 'Rubert Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-02-19', location: '-', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '68', name: 'Pier Gallo Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-02-23', location: 'São Paulo - SP', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '69', name: 'Damasceno e Ferreira Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-02-24', location: 'São Paulo, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '70', name: 'Fnz advogados', email: '', phone: '', status: 'Ativo', startDate: '2026-02-24', location: 'Porto Alegre, RS', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '71', name: 'Sousa & Portilho Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-02-24', location: 'Rio de Janeiro, RJ', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '72', name: 'Custódio Lima Advogados Associados', email: '', phone: '', status: 'Ativo', startDate: '2026-03-05', location: 'São Paulo, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '73', name: 'Mariana Veloso advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-03-06', location: 'Tocantins', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '74', name: 'Escritório de advocacia cavalcante e Barbosa', email: '', phone: '', status: 'Ativo', startDate: '2026-03-06', location: 'São Paulo, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '75', name: 'PS TECNOLOGIA TRIBUTÁRIA E SS ADVOCACIA', email: '', phone: '', status: 'Ativo', startDate: '2026-03-10', location: 'Ribeirão Preto, SP', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '76', name: 'PEDRO BENEVENUTO SOCIEDADE INDIVIDUAL DE ADVOCACIA', email: '', phone: '', status: 'Ativo', startDate: '2026-03-11', location: 'Rio de Janeiro, RJ', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '77', name: 'Rafaela Leão Advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-03-12', location: 'Rio de Janeiro - RJ', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '78', name: 'DIEGO LOPES SOCIEDADE INDIVIDUAL DE ADVOCACIA', email: '', phone: '', status: 'Ativo', startDate: '2026-03-13', location: 'Rio Grande do Sul', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '79', name: 'jL ADVOCACIA / INPI/MARCAS', email: '', phone: '', status: 'Ativo', startDate: '2026-03-17', location: 'Rio dos Cedros - SC', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '80', name: 'Marcelo oliveira soc individual de advocacia', email: '', phone: '', status: 'Ativo', startDate: '2026-03-17', location: 'Rio de Janeiro - RJ', squad: 'Baker', tags: '', contracts: '[]', createdAt: new Date().toISOString() },
            { id: '81', name: 'Carvalho Rodrigues advogados', email: '', phone: '', status: 'Ativo', startDate: '2026-03-31', location: '-', squad: 'Able', tags: '', contracts: '[]', createdAt: new Date().toISOString() }
          ];
          setClients(initialClients as any);
          // Save them to DB
          await fetch('/api/clients', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialClients)
          });
        }
      }
    } catch (err) {
      console.error("Failed to fetch clients:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
    const fetchProjects = async () => {
      try {
        const response = await fetch('/api/projects');
        if (response.ok) {
          const data = await response.json();
          setProjects(data);
        }
      } catch (err) {
        console.error("Failed to fetch projects:", err);
      }
    };
    fetchProjects();

    const fetchFinPeople = async () => {
      setIsFetchingFin(true);
      try {
        const response = await fetch('/api/fin-people');
        if (response.ok) {
          const data = await response.json();
          setFinPeople(data);
        }
      } catch (err) {
        console.error("Failed to fetch fin people:", err);
      } finally {
        setIsFetchingFin(false);
      }
    };
    fetchFinPeople();
  }, []);

  const handleOpenModal = (client: Client | null = null) => {
    setEditingClient(client);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir este cliente?')) return;
    
    try {
      const response = await fetch(`/api/clients/${id}`, {
        method: 'DELETE'
      });

      if (response.ok) {
        setClients(prev => prev.filter(c => c.id !== id));
      }
    } catch (err) {
      console.error("Failed to delete client:", err);
    }
  };

  const handleContractUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !contractUploadClientId) return;
    
    const reader = new FileReader();
    reader.onload = async () => {
      const base64 = reader.result as string;
      const client = clients.find(c => c.id === contractUploadClientId);
      const existing: {name: string, url: string}[] = (() => { try { return JSON.parse(client?.contracts || '[]'); } catch { return []; } })();
      existing.push({ name: file.name, url: base64 });
      
      try {
        await fetch(`/api/clients/${contractUploadClientId}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ contracts: JSON.stringify(existing) })
        });
        fetchClients();
      } catch (err) {
        console.error('Failed to upload contract:', err);
      }
      setContractUploadClientId(null);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const handleToggleStatus = async (client: Client) => {
    if (client.status === 'Ativo') {
      // Open churn modal
      setChurnClient(client);
      setChurnType('');
      setChurnReasons([]);
      setChurnComment('');
      return;
    }
    // Reactivate directly
    try {
      await fetch(`/api/clients/${client.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Ativo' })
      });
      setClients(prev => prev.map(c => c.id === client.id ? { ...c, status: 'Ativo' } : c));
    } catch (err) {
      console.error('Failed to reactivate:', err);
    }
  };

  const CHURN_REASONS = [
    'Motivo Pessoal',
    'Falta de Relacionamento',
    'Inadimplência',
    'Resultado Comercial',
    'Motivo Financeiro',
    'CRM e IA',
    'Outros',
  ];

  const toggleChurnReason = (reason: string) => {
    setChurnReasons(prev =>
      prev.includes(reason) ? prev.filter(r => r !== reason) : [...prev, reason]
    );
  };

  const handleConfirmChurn = async () => {
    if (!churnClient || !churnType) return;
    try {
      // Insert into churn table
      await fetch('/api/churn', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: churnClient.id,
          client_name: churnClient.name,
          churn_type: churnType,
          exit_reasons: churnReasons,
          squad: churnClient.squad,
          start_date: churnClient.startDate,
          comments: churnComment,
        })
      });
      // Move to Inativo
      await fetch(`/api/clients/${churnClient.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: 'Inativo' })
      });
      setClients(prev => prev.map(c => c.id === churnClient.id ? { ...c, status: 'Inativo' } : c));
      setChurnClient(null);
    } catch (err) {
      console.error('Failed to churn client:', err);
    }
  };

  const activeClients = clients.filter(c => c.status === 'Ativo');
  const churnClients = clients.filter(c => c.status === 'Inativo');

  const baseList = activeTab === 'ativos' ? activeClients : churnClients;
  const filteredClients = baseList.filter(client => 
    (client.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (client.email || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (client.location || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (client.squad || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  ).sort((a, b) => {
    const dir = sortDir === 'asc' ? 1 : -1;
    switch (sortBy) {
      case 'name': return dir * (a.name || '').localeCompare(b.name || '');
      case 'startDate': return dir * ((a.startDate || '').localeCompare(b.startDate || ''));
      case 'squad': return dir * ((a.squad || '').localeCompare(b.squad || ''));
      case 'product': return dir * ((a.product || '').localeCompare(b.product || ''));
      case 'financial': {
        const av = a.hasFinancialLink ? 1 : 0;
        const bv = b.hasFinancialLink ? 1 : 0;
        return dir * (av - bv);
      }
      case 'project': {
        const av = a.hasProjectLink ? 1 : 0;
        const bv = b.hasProjectLink ? 1 : 0;
        return dir * (av - bv);
      }
      case 'contracts': {
        const ac = (() => { try { return JSON.parse(a.contracts || '[]').length; } catch { return 0; } })();
        const bc = (() => { try { return JSON.parse(b.contracts || '[]').length; } catch { return 0; } })();
        return dir * (ac - bc);
      }
      case 'subscription': {
        const av = a.hasActiveSubscription ? 1 : 0;
        const bv = b.hasActiveSubscription ? 1 : 0;
        return dir * (av - bv);
      }
      default: return 0;
    }
  });

  const toggleSort = (col: string) => {
    if (sortBy === col) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const SortHeader = ({ col, label, className = '' }: { col: string; label: string; className?: string }) => (
    <th
      className={`px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest cursor-pointer select-none hover:text-violet-500 transition-colors ${className}`}
      onClick={() => toggleSort(col)}
    >
      <div className={`flex items-center gap-1 ${className.includes('text-center') ? 'justify-center' : ''} ${className.includes('text-right') ? 'justify-end' : ''}`}>
        {label}
        <span className="text-[8px]">
          {sortBy === col ? (sortDir === 'asc' ? '▲' : '▼') : '⇅'}
        </span>
      </div>
    </th>
  );

  const squads = ['Able', 'Baker', 'Charlie', 'Delta'];

  return (
    <div className="p-8 max-w-[1600px] mx-auto">
      {/* Header */}
      <PageHeader 
        title="Clientes" 
        titleAccent="Ativos" 
        subtitle="Gerencie sua base de clientes e parceiros vinculados."
      >
        <button 
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-purple-600/20 flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Cliente
        </button>
      </PageHeader>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-10">
        <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-white/10 hover:border-violet-500/30 transition-all group shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-blue-500/10">
              <Users size={20} className="text-blue-500" />
            </div>
            <ArrowUpDown size={16} className="text-slate-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total de Clientes</p>
          <h3 className="text-3xl font-bold text-light-text dark:text-white">{clients.length}</h3>
        </div>

        <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-white/10 hover:border-violet-500/30 transition-all group shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-emerald-500/10">
              <CheckCircle2 size={20} className="text-emerald-500" />
            </div>
            <ArrowUpDown size={16} className="text-slate-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Clientes Ativos</p>
          <h3 className="text-3xl font-bold text-light-text dark:text-white">
            {clients.filter(c => c.status === 'Ativo').length}
          </h3>
          <p className="text-[10px] text-emerald-500 mt-1">
            {clients.filter(c => c.status === 'Ativo' && c.hasActiveSubscription).length} com assinatura ativa no Asaas
          </p>
        </div>

        <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-white/10 hover:border-violet-500/30 transition-all group shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-violet-500/10">
              <Plus size={20} className="text-violet-500" />
            </div>
            <ArrowUpDown size={16} className="text-slate-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Novos (Este Mês)</p>
          <h3 className="text-3xl font-bold text-light-text dark:text-white">
            {clients.filter(c => {
              const date = new Date(c.createdAt);
              const now = new Date();
              return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
            }).length}
          </h3>
        </div>

        <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-6 rounded-3xl border border-slate-200 dark:border-white/10 hover:border-violet-500/30 transition-all group shadow-sm">
          <div className="flex items-center justify-between mb-4">
            <div className="p-3 rounded-xl bg-rose-500/10">
              <UserMinus size={20} className="text-rose-500" />
            </div>
            <ArrowUpDown size={16} className="text-slate-400 dark:text-slate-600 group-hover:text-violet-500 transition-colors" />
          </div>
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Churn</p>
          <h3 className="text-3xl font-bold text-light-text dark:text-white">
            {churnClients.length}
          </h3>
        </div>
      </div>

      {/* Filters Bar */}
      <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-white/10 mb-6 flex flex-wrap items-center gap-4 shadow-sm transition-colors">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por nome, email, local ou squad..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-light-text dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <button className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:text-light-text dark:hover:text-white transition-colors">
            <Filter size={18} />
          </button>
          <button className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl text-slate-500 hover:text-light-text dark:hover:text-white transition-colors">
            <Download size={18} />
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-1 mb-6 bg-white dark:bg-dark-card/60 backdrop-blur-md p-1.5 rounded-2xl border border-slate-200 dark:border-white/10 w-fit shadow-sm">
        <button
          onClick={() => setActiveTab('ativos')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'ativos'
              ? 'bg-violet-500 text-white shadow-lg shadow-violet-500/25'
              : 'text-slate-500 hover:text-light-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <CheckCircle2 size={14} />
          Ativos
          <span className={`min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-[10px] font-black ${
            activeTab === 'ativos' ? 'bg-white/20 text-white' : 'bg-emerald-500/10 text-emerald-500'
          }`}>
            {activeClients.length}
          </span>
        </button>
        <button
          onClick={() => setActiveTab('churn')}
          className={`flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold transition-all ${
            activeTab === 'churn'
              ? 'bg-rose-500 text-white shadow-lg shadow-rose-500/25'
              : 'text-slate-500 hover:text-light-text dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
          }`}
        >
          <UserMinus size={14} />
          Churn
          <span className={`min-w-[22px] h-[22px] flex items-center justify-center rounded-full text-[10px] font-black ${
            activeTab === 'churn' ? 'bg-white/20 text-white' : 'bg-rose-500/10 text-rose-500'
          }`}>
            {churnClients.length}
          </span>
        </button>
      </div>

      {/* Table Section */}
      <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                <SortHeader col="name" label="Nome" className="px-8" />
                <SortHeader col="startDate" label="Data Inicial" />
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Local do Escritório</th>
                <SortHeader col="squad" label="Squad" />
                <SortHeader col="product" label="Produto" />
                <SortHeader col="financial" label="Financeiro" className="text-center" />
                <SortHeader col="subscription" label="Assinatura" className="text-center" />
                <SortHeader col="project" label="Projeto" className="text-center" />
                <SortHeader col="contracts" label="Contratos" />
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={10} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Carregando clientes...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-4">
                      <div className="w-16 h-16 bg-slate-100 dark:bg-white/5 rounded-full flex items-center justify-center text-slate-400">
                        <Users size={32} />
                      </div>
                      <div>
                        <p className="text-light-text dark:text-white font-bold text-lg">Nenhum cliente encontrado</p>
                        <p className="text-slate-500">Tente ajustar sua busca ou adicione um novo cliente.</p>
                      </div>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredClients.map((client) => (
                  <tr key={client.id} className="group hover:bg-slate-50 dark:hover:bg-white/[0.02] transition-all cursor-pointer" onClick={() => handleOpenModal(client)}>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-7 h-7 rounded-lg bg-violet-500/10 flex items-center justify-center text-violet-500 font-bold text-[10px]">
                          {client.name ? client.name.charAt(0).toUpperCase() : '?'}
                        </div>
                        <span className="font-bold text-light-text dark:text-white text-xs">{client.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5 text-xs text-slate-500">
                        <ArrowUpDown size={12} className="text-violet-500" />
                        {client.startDate ? new Date(client.startDate).toLocaleDateString('pt-BR') : '-'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-xs text-slate-500 truncate max-w-[150px]">
                        {client.location || '-'}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <div className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${
                        client.squad === 'Able' ? 'bg-emerald-500/10 text-emerald-500' :
                        client.squad === 'Baker' ? 'bg-blue-500/10 text-blue-500' :
                        'bg-violet-500/10 text-violet-500'
                      }`}>
                        {client.squad || 'Able'}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      {client.product ? (
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-widest ${
                          client.product === 'TCV' ? 'bg-cyan-500/10 text-cyan-500' : 'bg-violet-500/10 text-violet-500'
                        }`}>
                          {client.product}
                        </span>
                      ) : (
                        <span className="text-[10px] text-slate-400 italic">-</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center" title={client.hasFinancialLink ? "Vinculado ao financeiro" : "Sem vínculo financeiro"}>
                        {client.hasFinancialLink ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={16} className="text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center relative group/sub">
                        {client.hasActiveSubscription ? (
                          <>
                            <CreditCard size={16} className="text-emerald-500" />
                            <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 hidden group-hover/sub:block z-50">
                              <div className="bg-slate-900 dark:bg-slate-800 text-white text-[10px] rounded-xl px-3 py-2 whitespace-nowrap shadow-xl border border-white/10">
                                <p className="font-bold text-emerald-400 mb-0.5">
                                  R$ {client.subscriptionValue?.toLocaleString('pt-BR', { minimumFractionDigits: 2 })} / {client.subscriptionCycle === 'MONTHLY' ? 'mês' : client.subscriptionCycle === 'YEARLY' ? 'ano' : client.subscriptionCycle?.toLowerCase() || 'mês'}
                                </p>
                                {client.subscriptionNextDue && (
                                  <p className="text-slate-300">Vence em {new Date(client.subscriptionNextDue + 'T12:00:00').toLocaleDateString('pt-BR')}</p>
                                )}
                                <p className="text-slate-400">
                                  {client.subscriptionBillingType === 'BOLETO' ? 'Boleto' : client.subscriptionBillingType === 'CREDIT_CARD' ? 'Cartão' : client.subscriptionBillingType === 'PIX' ? 'Pix' : client.subscriptionBillingType || '-'}
                                </p>
                                <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-t-4 border-transparent border-t-slate-900 dark:border-t-slate-800" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <CreditCard size={16} className="text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <div className="flex justify-center" title={client.hasProjectLink ? (client.projectName || "Projeto vinculado") : "Sem projeto vinculado"}>
                        {client.hasProjectLink ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={16} className="text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center gap-1">
                        {(() => {
                          const contracts: {name: string, url: string}[] = (() => { try { return JSON.parse(client.contracts || '[]'); } catch { return []; } })();
                          return contracts.length > 0 ? (
                            <button onClick={() => setContractPreview(contracts[0])} className="w-7 h-7 rounded-lg bg-emerald-500/10 flex items-center justify-center text-emerald-500 hover:bg-emerald-500/20 transition-colors" title={contracts[0].name || 'Ver contrato'}>
                              <FileText size={14} />
                            </button>
                          ) : (
                            <div className="w-7 h-7 rounded-lg bg-slate-500/10 flex items-center justify-center text-slate-400" title="Nenhum contrato">
                              <FileText size={14} />
                            </div>
                          );
                        })()}
                        <button
                          onClick={() => {
                            setContractUploadClientId(client.id);
                            contractInputRef.current?.click();
                          }}
                          className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
                          title="Adicionar contrato"
                        >
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const spaceBelow = window.innerHeight - rect.bottom;
                          const menuH = 140;
                          const top = spaceBelow < menuH ? rect.top - menuH : rect.bottom + 4;
                          setMenuPos({ top, left: rect.right - 192 });
                          setOpenMenuId(openMenuId === client.id ? null : client.id);
                        }}
                        className="p-2 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-all"
                      >
                        <MoreVertical size={16} />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Hidden file input for contract upload */}
      <input
        ref={contractInputRef}
        type="file"
        accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
        className="hidden"
        onChange={handleContractUpload}
      />

      {/* Actions Dropdown Menu (portal) */}
      {openMenuId && (() => {
        const client = clients.find(c => c.id === openMenuId);
        if (!client) return null;
        return (
          <>
            <div className="fixed inset-0 z-[100]" onClick={() => setOpenMenuId(null)} />
            <div
              className="fixed z-[101] w-48 bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
              style={{ top: `${menuPos.top}px`, left: `${menuPos.left}px` }}
            >
              <button
                onClick={() => { setOpenMenuId(null); handleOpenModal(client); }}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-light-text dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                <Edit2 size={13} className="text-violet-500" /> Editar Cliente
              </button>
              <button
                onClick={() => { setOpenMenuId(null); handleToggleStatus(client); }}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-light-text dark:text-white hover:bg-slate-50 dark:hover:bg-white/5 flex items-center gap-2.5 transition-colors"
              >
                {client.status === 'Ativo' ? (
                  <><UserMinus size={13} className="text-amber-500" /> Mover para Churn</>
                ) : (
                  <><UserPlus size={13} className="text-emerald-500" /> Reativar Cliente</>
                )}
              </button>
              <div className="border-t border-slate-100 dark:border-white/5" />
              <button
                onClick={() => { setOpenMenuId(null); handleDelete(client.id); }}
                className="w-full px-4 py-2.5 text-left text-xs font-medium text-rose-500 hover:bg-rose-500/5 flex items-center gap-2.5 transition-colors"
              >
                <Trash2 size={13} /> Excluir Cliente
              </button>
            </div>
          </>
        );
      })()}

      {/* Modal */}
      <ClientModal 
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editingClient={editingClient}
        onSaveSuccess={fetchClients}
      />

      {/* Image Preview Modal */}
      <AnimatePresence>
        {previewImage && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setPreviewImage(null)}
              className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 darker:bg-black/60 backdrop-blur-sm"
            />
            <motion.img 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              src={previewImage}
              alt="Preview"
              className="relative max-w-[90vw] max-h-[90vh] rounded-xl shadow-2xl"
              referrerPolicy="no-referrer"
            />
          </div>
        )}
      </AnimatePresence>

      {/* Contract Preview Modal */}
      <AnimatePresence>
        {contractPreview && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setContractPreview(null)}
              className="fixed inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="relative bg-white dark:bg-slate-900 rounded-2xl shadow-2xl border border-slate-200 dark:border-white/10 w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden"
            >
              <div className="flex items-center justify-between p-5 border-b border-slate-200 dark:border-white/5">
                <div className="flex items-center gap-2">
                  <FileText size={18} className="text-violet-500" />
                  <h3 className="text-sm font-bold text-light-text dark:text-white">{contractPreview.name || 'Contrato'}</h3>
                </div>
                <div className="flex items-center gap-2">
                  <a href={contractPreview.url} target="_blank" rel="noopener noreferrer"
                    className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-widest bg-violet-500/10 text-violet-500 hover:bg-violet-500/20 rounded-lg transition-colors">
                    Abrir em nova aba
                  </a>
                  <button onClick={() => setContractPreview(null)} className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
                    <X size={18} />
                  </button>
                </div>
              </div>
              <div className="flex-1 min-h-[500px]">
                {(() => {
                  const url = contractPreview.url || '';
                  const isPdf = url.startsWith('data:application/pdf') || url.toLowerCase().endsWith('.pdf');
                  const isImage = url.startsWith('data:image/') || /\.(png|jpg|jpeg|gif|webp)$/i.test(url);
                  if (isPdf) return <iframe src={url} className="w-full h-full min-h-[500px]" title="Contrato" />;
                  if (isImage) return <img src={url} alt="Contrato" className="max-w-full max-h-[500px] object-contain mx-auto p-4" />;
                  if (url) return (
                    <div className="flex flex-col items-center justify-center h-full gap-4 p-8 min-h-[300px]">
                      <FileText size={48} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500">Preview não disponível para este formato.</p>
                      <a href={url} download={contractPreview.name}
                        className="px-5 py-2.5 bg-violet-600 text-white text-sm font-bold rounded-xl hover:bg-violet-700 transition-colors shadow-lg shadow-violet-500/20">
                        Baixar Contrato
                      </a>
                    </div>
                  );
                  return (
                    <div className="flex flex-col items-center justify-center h-full gap-3 p-8 min-h-[300px]">
                      <AlertCircle size={48} className="text-slate-300 dark:text-slate-600" />
                      <p className="text-sm text-slate-500">Nenhum arquivo vinculado a este contrato.</p>
                    </div>
                  );
                })()}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Churn Modal */}
      <AnimatePresence>
        {churnClient && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setChurnClient(null)}
              className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 10 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              className="relative bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden"
            >
              {/* Header */}
              <div className="px-6 py-5 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-rose-500/10 flex items-center justify-center">
                      <UserMinus size={20} className="text-rose-500" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold text-light-text dark:text-white">Mover para Churn</h3>
                      <p className="text-[11px] text-slate-500 mt-0.5 truncate max-w-[280px]">{churnClient.name}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChurnClient(null)}
                    className="w-8 h-8 rounded-xl bg-slate-100 dark:bg-white/5 flex items-center justify-center hover:bg-slate-200 dark:hover:bg-white/10 transition-colors"
                  >
                    <X size={14} className="text-slate-500" />
                  </button>
                </div>
              </div>

              {/* Body */}
              <div className="px-6 py-5 space-y-5">
                {/* Como foi */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Como foi</label>
                  <div className="flex gap-2">
                    {(['INEVITÁVEL', 'EVITÁVEL'] as const).map((type) => (
                      <button
                        key={type}
                        onClick={() => setChurnType(type)}
                        className={`flex-1 px-4 py-2.5 rounded-xl text-xs font-bold transition-all border ${
                          churnType === type
                            ? type === 'INEVITÁVEL'
                              ? 'bg-rose-500 text-white border-rose-500 shadow-lg shadow-rose-500/20'
                              : 'bg-amber-500 text-white border-amber-500 shadow-lg shadow-amber-500/20'
                            : 'border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'
                        }`}
                      >
                        {type === 'INEVITÁVEL' ? (
                          <span className="flex items-center justify-center gap-1.5"><ShieldAlert size={13} />{type}</span>
                        ) : (
                          <span className="flex items-center justify-center gap-1.5"><AlertTriangle size={13} />{type}</span>
                        )}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Motivo de Saída */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Motivo de Saída</label>
                  <div className="flex flex-wrap gap-2">
                    {CHURN_REASONS.map((reason) => {
                      const selected = churnReasons.includes(reason);
                      const colorMap: Record<string, string> = {
                        'Motivo Pessoal': selected ? 'bg-blue-500 text-white border-blue-500' : 'border-slate-200 dark:border-white/10 text-slate-500',
                        'Falta de Relacionamento': selected ? 'bg-rose-500 text-white border-rose-500' : 'border-slate-200 dark:border-white/10 text-slate-500',
                        'Inadimplência': selected ? 'bg-orange-500 text-white border-orange-500' : 'border-slate-200 dark:border-white/10 text-slate-500',
                        'Resultado Comercial': selected ? 'bg-red-600 text-white border-red-600' : 'border-slate-200 dark:border-white/10 text-slate-500',
                        'Motivo Financeiro': selected ? 'bg-purple-500 text-white border-purple-500' : 'border-slate-200 dark:border-white/10 text-slate-500',
                        'CRM e IA': selected ? 'bg-cyan-500 text-white border-cyan-500' : 'border-slate-200 dark:border-white/10 text-slate-500',
                        'Outros': selected ? 'bg-slate-600 text-white border-slate-600' : 'border-slate-200 dark:border-white/10 text-slate-500',
                      };
                      return (
                        <button
                          key={reason}
                          onClick={() => toggleChurnReason(reason)}
                          className={`px-3 py-1.5 rounded-lg text-[11px] font-bold border transition-all ${colorMap[reason] || (selected ? 'bg-violet-500 text-white border-violet-500' : 'border-slate-200 dark:border-white/10 text-slate-500')}`}
                        >
                          {reason}
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Comentários */}
                <div>
                  <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 flex items-center gap-1.5">
                    <MessageSquare size={12} />
                    Comentários
                  </label>
                  <textarea
                    value={churnComment}
                    onChange={(e) => setChurnComment(e.target.value)}
                    placeholder="Observações sobre o cancelamento..."
                    rows={3}
                    className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-light-text dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-rose-500/20 resize-none transition-all"
                  />
                </div>
              </div>

              {/* Footer */}
              <div className="px-6 py-4 border-t border-slate-200 dark:border-white/10 flex items-center justify-end gap-3">
                <button
                  onClick={() => setChurnClient(null)}
                  className="px-5 py-2.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleConfirmChurn}
                  disabled={!churnType}
                  className={`px-5 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 ${
                    churnType
                      ? 'bg-rose-500 text-white hover:bg-rose-600 shadow-lg shadow-rose-500/20'
                      : 'bg-slate-200 dark:bg-white/10 text-slate-400 cursor-not-allowed'
                  }`}
                >
                  <UserMinus size={14} />
                  Confirmar Churn
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default ActiveClients;
