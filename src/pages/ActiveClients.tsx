
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Users, Plus, Search, Mail, Phone, 
  MoreVertical, Edit2, Trash2, X, 
  CheckCircle2, AlertCircle, Filter,
  Download, UserPlus, ArrowUpDown, FileText,
  Link as LinkIcon, Unlink, Check, ChevronDown
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

  const filteredClients = clients.filter(client => 
    (client.name || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (client.email || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (client.location || '').toLowerCase().includes((searchQuery || '').toLowerCase()) ||
    (client.squad || '').toLowerCase().includes((searchQuery || '').toLowerCase())
  );

  const squads = ['Able', 'Baker', 'Charlie', 'Delta'];

  return (
    <div className="p-8 max-w-7xl mx-auto">
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
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
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

      {/* Table Section */}
      <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-2xl transition-colors duration-300">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50/50 dark:bg-white/5 border-b border-slate-200 dark:border-white/5">
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Nome</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Data Inicial</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Local do Escritório</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Squad</th>
                <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Financeiro</th>
                <th className="px-4 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-center">Projeto</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest">Contratos</th>
                <th className="px-8 py-5 text-[10px] font-bold text-slate-500 uppercase tracking-widest text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 dark:divide-white/5">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="px-8 py-20 text-center">
                    <div className="flex flex-col items-center gap-3">
                      <div className="w-10 h-10 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
                      <p className="text-slate-500 font-medium">Carregando clientes...</p>
                    </div>
                  </td>
                </tr>
              ) : filteredClients.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-8 py-20 text-center">
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
                      <div className="flex justify-center" title={client.hasProjectLink ? (client.projectName || "Projeto vinculado") : "Sem projeto vinculado"}>
                        {client.hasProjectLink ? (
                          <CheckCircle2 size={16} className="text-emerald-500" />
                        ) : (
                          <AlertCircle size={16} className="text-slate-300 dark:text-slate-600" />
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1">
                        <div className="w-7 h-7 rounded-lg bg-rose-500/10 flex items-center justify-center text-rose-500">
                          <FileText size={14} />
                        </div>
                        <button className="w-7 h-7 rounded-lg bg-slate-100 dark:bg-white/5 flex items-center justify-center text-slate-400 hover:text-violet-500 transition-colors">
                          <Plus size={14} />
                        </button>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-all">
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleOpenModal(client); }}
                          className="p-1.5 rounded-lg hover:bg-violet-500/10 text-slate-400 hover:text-violet-500 transition-colors"
                        >
                          <Edit2 size={14} />
                        </button>
                        <button 
                          onClick={(e) => { e.stopPropagation(); handleDelete(client.id); }}
                          className="p-1.5 rounded-lg hover:bg-rose-500/10 text-slate-400 hover:text-rose-500 transition-colors"
                        >
                          <Trash2 size={14} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

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
    </div>
  );
};

export default ActiveClients;
