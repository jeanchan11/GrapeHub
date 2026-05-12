
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { auth, storage } from '../firebase';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { designSystem } from '../design-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Search, Filter, ChevronDown, MoreHorizontal, 
  AlertTriangle, CheckCircle2, PauseCircle, 
  ArrowUpRight, Users, TrendingUp,
  X, Calendar, User, Briefcase, DollarSign,
  Plus, ChevronRight, Target, Activity, 
  BarChart3, Wallet, MessageSquare, History,
  Globe, Layout, CreditCard, Check,
  Gavel, Scale, HeartPulse, ShieldCheck, 
  Hammer, Landmark, Banknote, ShoppingCart, 
  Home, Stethoscope, Building2, Image as ImageIcon,
  Folder, File, Eye, Download, Trash2, Upload, FileText
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';

interface Optimization {
  id: string;
  author: string;
  authorPhoto?: string;
  role: string;
  date: string;
  time?: string; // Adicionado campo de horário
  message: string;
  isInternal?: boolean;
  images?: string[];
  optimization?: string;
  type?: string;
  status?: string;
}

interface Product {
  id: string;
  name: string;
  icon?: string;
  investmentMonthly: string;
  leads: string;
  contracts: string;
  cac: string;
  cpa: string;
  kpis: string;
  budget: string;
  platform: string;
  status: string;
  delivery: string;
  aiService: string;
  bottleneck: string;
  history: string;
  balance: string;
  paymentMethod?: 'Cartão' | 'Boleto/pix';
  projectResult?: string;
  optimizations?: Optimization[];
  cpaGoal?: string;
  leadsGoal?: string;
  cacGoal?: string;
  fechamentosGoal?: string;
  weeklyMetrics?: { week: string; investment: string; leads: string; contracts: string }[];
}

interface Project {
  id: string;
  partner: string;
  product: string;
  status: 'Operacional' | 'Gargalo' | 'Pausado';
  roi: string;
  investment: string;
  responsible: string;
  lastUpdate: string;
  products?: Product[];
  activeClientId?: string;
  page_id?: string;
  group?: string;
  projectResult?: string;
  files?: { name: string; date: string; size: string; url: string; sender: string }[];
}

const parseCurrency = (val: string) => {
  return parseFloat((val || '').replace(/[^\d,]/g, '').replace('.', '').replace(',', '.')) || 0;
};

const initialProjects: Project[] = [
  { 
    id: '1', 
    partner: 'Advocacia Silva', 
    product: 'Google Ads High Ticket', 
    status: 'Operacional', 
    roi: '4.5x', 
    investment: 'R$ 12.500', 
    responsible: 'Lucas Lima',
    lastUpdate: '2h atrás',
    group: 'Grupo 1',
    products: [
      {
        id: 'p1',
        name: 'Google Ads Search',
        icon: 'Scale',
        investmentMonthly: 'R$ 5.000',
        leads: '15',
        contracts: '12',
        cac: 'R$ 45,00',
        cpa: 'R$ 50,00',
        kpis: 'CTR 4.5% | CPC R$ 2.10',
        budget: 'R$ 5.000',
        platform: 'Google Ads',
        status: 'Rodando',
        delivery: 'Brasil',
        aiService: 'Ativado',
        bottleneck: 'Nenhum',
        history: '3 alterações',
        balance: 'Limite Disponível',
        paymentMethod: 'Cartão',
        projectResult: 'RESULTADO BOM',
        cpaGoal: 'R$ 50,00',
        leadsGoal: '15',
        optimizations: [
          {
            id: 'o1',
            author: 'João',
            role: 'Gestor',
            date: '28/03/2026',
            message: 'Pausamos o conjunto de anúncios 02 (público frio) devido ao CPA alto. Realocamos verba para o conjunto de remarketing.'
          },
          {
            id: 'o2',
            author: 'João',
            role: 'Gestor',
            date: '25/03/2026',
            message: 'Subimos 3 novos criativos em vídeo testando a dor de "falta de produtividade".'
          }
        ]
      }
    ]
  },
  { 
    id: '2', 
    partner: 'Clínica Sorriso', 
    product: 'Meta Ads Local', 
    status: 'Gargalo', 
    roi: '1.8x', 
    investment: 'R$ 8.200', 
    responsible: 'Ana Souza',
    lastUpdate: '1h atrás',
    products: [
      {
        id: 'p2',
        name: 'Meta Ads Instagram',
        icon: 'HeartPulse',
        investmentMonthly: 'R$ 4.000',
        leads: '4',
        contracts: '4',
        cac: 'R$ 85,00',
        cpa: 'R$ 90,00',
        kpis: 'CTR 1.2% | CPC R$ 3.50',
        budget: 'R$ 4.000',
        platform: 'Meta Ads',
        status: 'Falta de saldo',
        delivery: 'Local (SP)',
        aiService: 'Desativado',
        bottleneck: 'Criativos saturados',
        history: '12 alterações',
        balance: 'R$ 450',
        paymentMethod: 'Boleto/pix',
        projectResult: 'RESULTADO RUIM'
      }
    ]
  },
  { 
    id: '3', 
    partner: 'E-commerce Fashion', 
    product: 'Performance Full Stack', 
    status: 'Pausado', 
    roi: '0.0x', 
    investment: 'R$ 0', 
    responsible: 'Pedro Rocha',
    lastUpdate: '1 dia atrás',
    products: []
  },
  { 
    id: '4', 
    partner: 'Imobiliária Prime', 
    product: 'Lead Gen Premium', 
    status: 'Operacional', 
    roi: '5.2x', 
    investment: 'R$ 15.000', 
    responsible: 'Lucas Lima',
    lastUpdate: '5h atrás',
    products: [
      {
        id: 'p3',
        name: 'Landing Page + Ads',
        investmentMonthly: 'R$ 10.000',
        leads: '8',
        contracts: '8',
        cac: 'R$ 120,00',
        cpa: 'R$ 130,00',
        kpis: 'Conv. 8.5%',
        budget: 'R$ 10.000',
        platform: 'Google/Meta',
        status: 'Ativo',
        delivery: 'Nacional',
        aiService: 'Ativado',
        bottleneck: 'Nenhum',
        history: '5 alterações',
        balance: 'R$ 3.400',
        paymentMethod: 'Boleto/pix'
      }
    ]
  },
  { 
    id: '5', 
    partner: 'Tech Solutions', 
    product: 'B2B LinkedIn Ads', 
    status: 'Gargalo', 
    roi: '2.1x', 
    investment: 'R$ 22.000', 
    responsible: 'Mariana Costa',
    lastUpdate: '30min atrás',
    products: []
  },
];

interface Props {
  activePage: string;
}

const ProjectsModule: React.FC<Props> = ({ activePage }) => {
  const { userData } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos os Status');
  const [resultFilter, setResultFilter] = useState('Todos os Resultados');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState<'resultado' | 'kpis'>('resultado');
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeProjectTab, setActiveProjectTab] = useState<'resultado' | 'reunioes' | 'arquivos' | 'roteiros' | 'comentarios' | 'analise'>('resultado');
  const [isEditing, setIsEditing] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isProjectModalOpen && scrollRef.current) {
      setTimeout(() => {
        if (scrollRef.current) {
          scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
        }
      }, 100);
    }
  }, [isProjectModalOpen, selectedProject]);
  const [newNote, setNewNote] = useState('');
  const [isInternal, setIsInternal] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);
  const [isResultDropdownOpen, setIsResultDropdownOpen] = useState(false);
  const [isProjectResultDropdownOpen, setIsProjectResultDropdownOpen] = useState(false);
  const [isGrupoDropdownOpen, setIsGrupoDropdownOpen] = useState(false);
  const [editingResponsavel, setEditingResponsavel] = useState(false);
  const [showResponsavelDropdown, setShowResponsavelDropdown] = useState(false);
  const [gestores, setGestores] = useState<{id: string; name: string; email: string; picture: string; role: string}[]>([]);
  const responsavelBtnRef = useRef<HTMLButtonElement>(null);
  const [responsavelDropdownPos, setResponsavelDropdownPos] = useState({ top: 0, right: 0 });
  const [projectComments, setProjectComments] = useState<Record<string, {id: string; author: string; author_photo?: string; authorPhoto?: string; text: string; createdAt: string; created_at?: string; isInternal?: boolean; is_internal?: boolean}[]>>({});
  const [newComment, setNewComment] = useState('');
  const [isInternalNote, setIsInternalNote] = useState(false);
  const [commentFilter, setCommentFilter] = useState<'all' | 'comment' | 'internal'>('all');
  const [isAddMetricsModalOpen, setIsAddMetricsModalOpen] = useState(false);
  const [weeklyMetrics, setWeeklyMetrics] = useState([
    { week: '1', investment: '', leads: '', contracts: '' },
    { week: '2', investment: '', leads: '', contracts: '' },
    { week: '3', investment: '', leads: '', contracts: '' },
    { week: '4', investment: '', leads: '', contracts: '' },
  ]);

  const handleFileUpload = async (file: File) => {
    if (!selectedProject) return;
    if (!auth.currentUser) {
      setSaveError("Você precisa estar logado para fazer upload de arquivos.");
      return;
    }
    setSaveError(null);
    try {
      const storageRef = ref(storage, `projects/${selectedProject.id}/${file.name}`);
      await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(storageRef);
      
      // Create file metadata
      const newFile = {
        name: file.name,
        date: new Date().toLocaleDateString('pt-BR'),
        size: (file.size / 1024 / 1024).toFixed(1) + ' MB',
        url: downloadURL,
        sender: auth.currentUser.email?.endsWith('@grapemidia.com') ? 'Agência' : 'Cliente'
      };

      // Update project state
      const updatedProjects = projects.map(p => {
        if (p.id === selectedProject.id) {
          return {
            ...p,
            files: [...(p.files || []), newFile]
          };
        }
        return p;
      });
      
      setProjects(updatedProjects);
      saveProjects(updatedProjects);
      
      console.log('File uploaded successfully:', downloadURL);
    } catch (error) {
      console.error('Error uploading file:', error);
      setSaveError("Erro ao fazer upload do arquivo. Verifique suas permissões.");
    }
  };

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      handleFileUpload(event.target.files[0]);
    }
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    if (event.dataTransfer.files && event.dataTransfer.files[0]) {
      handleFileUpload(event.dataTransfer.files[0]);
    }
  };
  const [openProjectMenuId, setOpenProjectMenuId] = useState<string | null>(null);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingData, setMeetingData] = useState({ title: '', date: '', attendees: '', actions: '' });
  const [tempGoals, setTempGoals] = useState({ cpa: '', leads: '', cac: '', fechamentos: '' });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{ id: string, name: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [filterPerson, setFilterPerson] = useState('Pessoa');
  const [filterType, setFilterType] = useState('Tipo');

  // Fetch gestores de tráfego para o dropdown de responsável
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then((users: any[]) => {
        setGestores(users.filter(u => u.role === 'gestor-trafego'));
      })
      .catch(console.error);
  }, []);

  const timelineItems = useMemo(() => {
    if (!selectedProject) return [];
    const optimizations = selectedProject.products?.flatMap(p => (p.optimizations || []).map(opt => ({ 
      ...opt, 
      productName: p.name, 
      type: 'optimization',
      createdAt: opt.date.split('/').reverse().join('-') + (opt.time ? 'T' + opt.time : 'T00:00')
    }))) || [];
    const meetingItems = meetings.map(m => ({ 
      id: m.id, 
      author: 'Reunião', 
      role: 'Reunião',
      message: `${m.title}\nParticipantes: ${m.attendees}\nAções: ${m.actions}`,
      date: new Date(m.date).toLocaleDateString('pt-BR'),
      rawDate: m.date,
      createdAt: m.created_at || m.date,
      attendees: m.attendees,
      actions: m.actions,
      type: 'meeting',
      productName: 'Reunião'
    }));
    return [...optimizations, ...meetingItems].sort((a, b) => {
      const dateA = new Date(a.createdAt);
      const dateB = new Date(b.createdAt);
      return dateB.getTime() - dateA.getTime();
    });
  }, [selectedProject, meetings]);

  useEffect(() => {
    if (selectedProject) {
      const fetchMeetings = async () => {
        try {
          const response = await fetch(`/api/meetings?project_id=${encodeURIComponent(selectedProject.id)}`);
          if (response.ok) {
            const data = await response.json();
            setMeetings(data);
          }
        } catch (err) {
          console.error("Failed to fetch meetings:", err);
        }
      };
      fetchMeetings();
    }
  }, [selectedProject]);

  // Fetch project comments from DB when a project is opened
  useEffect(() => {
    if (selectedProject) {
      fetch(`/api/project-comments/${encodeURIComponent(selectedProject.id)}`)
        .then(r => r.ok ? r.json() : [])
        .then((data: any[]) => {
          const normalized = data.map(c => ({
            id: c.id,
            author: c.author,
            authorPhoto: c.author_photo,
            text: c.text,
            createdAt: c.created_at,
            isInternal: c.is_internal,
          }));
          setProjectComments(prev => ({ ...prev, [selectedProject.id]: normalized }));
        })
        .catch(err => console.error('Failed to fetch comments:', err));
    }
  }, [selectedProject?.id]);

  // Fetch projects from Neon DB via API
  useEffect(() => {
    console.log("ProjectsModule: useEffect triggered, activePage:", activePage);
    const fetchProjects = async () => {
      try {
        console.log("ProjectsModule: Fetching projects for page:", activePage);
        if (!activePage) {
          console.warn("activePage is undefined, skipping fetch.");
          return;
        }
        const response = await fetch(`/api/projects?page_id=${encodeURIComponent(activePage)}`);
        if (response.ok) {
          const data = await response.json();
          console.log("ProjectsModule: Data fetched:", data);
          if (data && data.length > 0) {
            setProjects(data);
          } else {
            // If DB is empty, use initial projects
            setProjects(initialProjects);
          }
        } else {
          console.error("Server returned error:", response.status, response.statusText);
          setProjects(initialProjects);
        }
      } catch (err) {
        console.error("Failed to fetch projects (detalhes):", err);
        if (err instanceof Error) {
          console.error("Error message:", err.message);
          console.error("Error stack:", err.stack);
        }
        setProjects(initialProjects);
      } finally {
        setIsLoading(false);
      }
    };
    fetchProjects();
  }, [activePage]);

  // Fetch clients from Neon DB via API
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const response = await fetch('/api/clients');
        if (response.ok) {
          const data = await response.json();
          if (data && data.length > 0) {
            setClients(data);
          } else {
            // Initial mock clients if empty
            const initialClients = [
              { id: '1', name: 'Advocacia Silva' },
              { id: '2', name: 'Clínica Sorriso' },
              { id: '3', name: 'E-commerce Fashion' },
              { id: '4', name: 'Imobiliária Prime' },
              { id: '5', name: 'Tech Solutions' },
              { id: '6', name: 'Betoni Borges Advogados Associados' },
              { id: '7', name: 'THIAGO BARBOSA SOCIEDADE INDIVIDUAL DE ADVOCACIA' },
              { id: '8', name: 'JOAO LEANDRO LONGO ADVOCACIA' },
              { id: '9', name: 'Elleven Partners' },
              { id: '10', name: 'GARIGLIO ADVOGADOS' },
              { id: '11', name: 'Bárbara Tracy Wichmann' },
              { id: '12', name: 'Advocacia Previdenciária Dra Priscila Braga' },
              { id: '13', name: 'Poffo & Koller Advogados Associados' },
              { id: '14', name: 'Elizabet Correa' },
              { id: '15', name: 'Ávila & Peixoto Advogados' },
              { id: '16', name: 'JN Advocacia' },
              { id: '17', name: 'LOPES ADVOGADOS ASSOCIADOS' },
              { id: '18', name: 'EFS Advocacia' },
              { id: '19', name: 'CARDOSO E DITZEL ADVOGADOS' },
              { id: '20', name: 'RPT Advogados' },
              { id: '21', name: 'Carvalho e mendonça advocacia' },
              { id: '22', name: 'Nassar machado advocacia' },
              { id: '23', name: 'AHT ADVOGADOS' },
              { id: '24', name: 'KZ Advogados' },
              { id: '25', name: 'Ana Cláudia Potthoff Advocacia' },
              { id: '26', name: 'Dutra Medeiros Advocacia' },
              { id: '27', name: 'LUCIANA LOUREIRO ADVOGADOS ASSOCIADOS' },
              { id: '28', name: 'ACS' },
              { id: '29', name: 'Vilela Brescovici advocacia' },
              { id: '30', name: 'BARROS ADVOCACIA' },
              { id: '31', name: 'Viegas Futami Advocacia' },
              { id: '32', name: 'Tomanaga sociedade de Advogados' },
              { id: '33', name: 'DFCC Advocacia' },
              { id: '34', name: 'Ferrari & Advogados Associados' },
              { id: '35', name: 'JMV Advogados' },
              { id: '36', name: 'Dezotti Advocacia' },
              { id: '37', name: 'Alcântara Advogados' },
              { id: '38', name: 'Carla Rebelo Advogada' },
              { id: '39', name: 'Graziele Palmas Lopes Advocacia' },
              { id: '40', name: 'BKA' },
              { id: '41', name: 'Jogador Mente Forte' },
              { id: '42', name: 'Breno Augusto Ponijaleski - Sociedade de Advogados' },
              { id: '43', name: 'Soluciona Prev' },
              { id: '44', name: 'Chácara Baldan Eventos LTDA' },
              { id: '45', name: 'TAEVO' },
              { id: '46', name: 'PLANEPREV ASSESSORIA PREVIDENCIÁRIA' },
              { id: '47', name: 'Vinicius Leocadio Sociedade Individual de Advocacia' },
              { id: '48', name: 'Alexsandro Peixoto Advogados Associados (APAC)' },
              { id: '49', name: 'CAA ESCRITÓRIO DE ADVOCACIA' },
              { id: '50', name: 'MARCIA TAMBORINDEGUY' },
              { id: '51', name: 'FONTAN & PAZ ADVOGADOS' },
              { id: '52', name: 'AVILA & ALVES ADVOGADOS ASSOCIADOS' },
              { id: '53', name: 'Elida pontes advocacia' },
              { id: '54', name: 'MPL Advocacia' },
              { id: '55', name: 'INAITA G R SOARES CARVALHO ARNOLD SOC INDIV DE AD' },
              { id: '56', name: 'MACEDO TUMA ADVOCACIA' },
              { id: '57', name: 'Dillenburg Boaventura Advogados' },
              { id: '58', name: 'Solucionar Consultoria' },
              { id: '59', name: 'Oliveira Filho Advogados' },
              { id: '60', name: 'STAR ONE CORRETORA DE SEGUROS E NEGOCIOS LTDA' },
              { id: '61', name: 'RAFAELA AZAM ADVOGADA' },
              { id: '62', name: 'Faria Advocacia' },
              { id: '63', name: 'Ferreira Advogados' },
              { id: '64', name: 'ALMEIDA MOURAO ADVOGADOS ASSOCIADOS' },
              { id: '65', name: 'Sandra Maria Bertussi Ferrari' },
              { id: '66', name: 'Garcia e Garcia Advogados Associados' },
              { id: '67', name: 'Zelmo Simionato' },
              { id: '68', name: 'Bicudo Sociedade Individual de Advocacia' },
              { id: '69', name: 'Duarte Associados, Advocacia Estratégica, Consultoria e Assessoria Jurídica' },
              { id: '70', name: 'Sarah Coimbra Advocacia e Assessoria Jurídica' },
              { id: '71', name: 'Vizioli Advocacia' },
              { id: '72', name: 'Rubert Advocacia' },
              { id: '73', name: 'Pier Gallo Advocacia' },
              { id: '74', name: 'Damasceno e Ferreira Advocacia' },
              { id: '75', name: 'Fnz advogados' },
              { id: '76', name: 'Sousa & Portilho Advocacia' },
              { id: '77', name: 'Custódio Lima Advogados Associados' },
              { id: '78', name: 'Mariana Veloso advocacia' },
              { id: '79', name: 'Escritório de advocacia cavalcante e Barbosa' },
              { id: '80', name: 'PS TECNOLOGIA TRIBUTÁRIA E SS ADVOCACIA' },
              { id: '81', name: 'PEDRO BENEVENUTO SOCIEDADE INDIVIDUAL DE ADVOCACIA' },
              { id: '82', name: 'Rafaela Leão Advocacia' },
              { id: '83', name: 'DIEGO LOPES SOCIEDADE INDIVIDUAL DE ADVOCACIA' },
              { id: '84', name: 'jL ADVOCACIA / INPI/MARCAS' },
              { id: '85', name: 'Marcelo oliveira soc individual de advocacia' },
              { id: '86', name: 'Carvalho Rodrigues advogados' }
            ];
            setClients(initialClients);
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
      }
    };
    fetchClients();
  }, []);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Save projects to Neon DB via API
  const saveProjects = async (updatedProjects: Project[]) => {
    if (updatedProjects.length === 0) return;
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setIsSaving(true);
    setSaveError(null);
    console.log("Saving projects...", updatedProjects);
    try {
      console.log("Iniciando fetch para /api/projects...");
      let body;
      try {
        body = JSON.stringify(updatedProjects);
        console.log("Tamanho do payload:", body.length);
      } catch (e) {
        console.error("Failed to stringify projects:", e);
        setSaveError("Erro ao preparar dados para salvar.");
        return;
      }
      
      const timeoutId = setTimeout(() => controller.abort(), 300000); // 300 seconds timeout

      console.log("Enviando fetch...");
      const response = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: body,
        signal: controller.signal,
        mode: 'cors',
        credentials: 'include'
      });
      console.log("Fetch concluído.");
      
      clearTimeout(timeoutId);
      console.log("Save response status:", response.status);
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error("Save error response text:", errorText);
        throw new Error(`Erro ${response.status}: ${errorText}`);
      }
      
      console.log("Projetos salvos com sucesso");
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') {
        console.log("Save projects aborted (either by timeout or new request)");
        if (abortControllerRef.current === controller) {
           setSaveError('Erro ao salvar: O servidor demorou muito para responder. Tente novamente.');
        }
      } else {
        console.error("Failed to save projects (detalhes):", err);
        setSaveError(err instanceof Error ? `Erro ao salvar: ${err.message}` : 'Erro desconhecido ao salvar');
      }
    } finally {
      if (abortControllerRef.current === controller) {
        setIsSaving(false);
        abortControllerRef.current = null;
      }
    }
  };

  // Auto-save when projects change
  useEffect(() => {
    if (!isLoading && projects.length > 0) {
      const timer = setTimeout(() => {
        saveProjects(projects);
      }, 500); // Debounce save
      return () => clearTimeout(timer);
    }
  }, [projects, isLoading]);

  const [projectToDelete, setProjectToDelete] = useState<string | null>(null);
  const [slashMenuOpen, setSlashMenuOpen] = useState(false);

  const handleDeleteProject = async (projectId: string) => {
    setProjectToDelete(projectId);
  };

  const confirmDeleteProject = async () => {
    if (!projectToDelete) return;
    
    console.log(`[DELETE] Confirmando exclusão do projeto: ${projectToDelete}`);
    
    try {
      const response = await fetch(`/api/projects/${projectToDelete}`, {
        method: 'DELETE',
      });
      
      console.log(`[DELETE] Resposta do servidor: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log(`[DELETE] Resultado da API:`, data);
        setProjects(prev => prev.filter(p => p.id !== projectToDelete));
        setProjectToDelete(null);
      } else {
        const errorText = await response.text();
        console.error(`[DELETE] Erro na API: ${response.status} - ${errorText}`);
        throw new Error(`Erro ao excluir projeto: ${errorText}`);
      }
    } catch (err) {
      console.error("Failed to delete project:", err);
      alert('Erro ao excluir projeto');
      setProjectToDelete(null);
    }
  };
  const [newProductData, setNewProductData] = useState<Partial<Product>>({
    name: '',
    icon: 'Layout',
    budget: 'R$ 0',
    cac: 'R$ 0',
    results: '0 Leads',
    platform: 'Meta Ads',
    status: 'Rodando',
    aiService: 'Ativado',
    delivery: 'Brasil',
    balance: 'Limite Disponível',
    paymentMethod: 'Cartão',
    kpis: 'CTR 0% | CPC R$ 0',
    bottleneck: 'Nenhum',
    projectResult: '-',
    cpaGoal: 'R$ 0',
    leadsGoal: '0'
  });
  const [newPartnerData, setNewPartnerData] = useState<Partial<Project>>({
    partner: '',
    status: 'Operacional',
    responsible: 'Lucas Lima',
    investment: 'R$ 0',
    roi: '0.0x',
    activeClientId: ''
  });

  const getDynamicStats = (projectsList: Project[]) => [
    { label: 'Total de Projetos', value: projectsList.length.toString(), icon: Briefcase, color: 'text-blue-500', bg: 'bg-blue-500/10' },
    { label: 'Operacionais', value: projectsList.filter(p => p.status === 'Operacional').length.toString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Pausados', value: projectsList.filter(p => p.status === 'Pausado').length.toString(), icon: PauseCircle, color: 'text-slate-500', bg: 'bg-slate-500/10' },
    { label: 'Gargalo', value: projectsList.filter(p => p.status === 'Gargalo').length.toString(), icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Investimento Total', value: `R$ ${projectsList.reduce((acc, p) => acc + parseCurrency(p.investment || '0'), 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  const filteredProjects = projects.map(project => {
    if (project.products && project.products.length > 0) {
      const productNames = project.products.map(p => p.name).join(', ');
      
      let derivedStatus: Project['status'] = 'Operacional';
      const productStatuses = project.products.map(p => p.status);
      
      if (productStatuses.some(s => s === 'Bloqueio' || s === 'Falta de saldo')) {
        derivedStatus = 'Gargalo';
      } else if (productStatuses.every(s => s === 'Pausado')) {
        derivedStatus = 'Pausado';
      }
      
      const totalInvestment = project.products.reduce((acc, p) => acc + parseCurrency(p.budget), 0);
      
      return {
        ...project,
        product: productNames,
        status: derivedStatus,
        investment: `R$ ${totalInvestment.toLocaleString('pt-BR')}`
      };
    }
    return project;
  }).filter(project => {
    const query = searchQuery.toLowerCase();
    const matchesSearch = (project.partner || '').toLowerCase().includes(query) || 
                         (project.product || '').toLowerCase().includes(query);
    const matchesStatus = statusFilter === 'Todos os Status' || project.status === statusFilter;
    const matchesResult = resultFilter === 'Todos os Resultados' || (project.projectResult || 'Sem Resultado') === resultFilter;
    return matchesSearch && matchesStatus && matchesResult;
  });

  const dynamicStats = useMemo(() => getDynamicStats(filteredProjects), [filteredProjects]);

  const getStatusBadge = (status: Project['status']) => {
    switch (status) {
      case 'Operacional':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <CheckCircle2 size={12} />
            Operacional
          </span>
        );
      case 'Gargalo':
        return (
          <span className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <AlertTriangle size={12} />
            Gargalo
          </span>
        );
      case 'Pausado':
        return (
          <span className="px-3 py-1 rounded-full bg-slate-500/10 text-slate-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <PauseCircle size={12} />
            Pausado
          </span>
        );
    }
  };

  const getResultBadge = (result: string | undefined) => {
    const res = projectResults.find(r => r.label === result) || { label: result || 'Sem Resultado', color: 'bg-slate-500' };
    const textColor = res.color.replace('bg-', 'text-');
    return (
      <span className={`px-3 py-1 rounded-full ${res.color}/10 ${textColor} text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit`}>
        {res.label}
      </span>
    );
  };

  const toggleRow = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedRowId(expandedRowId === id ? null : id);
  };

  const handleRowClick = (project: Project) => {
    setSelectedProject(project);
    setActiveProjectTab('resultado');
    setIsProjectModalOpen(true);
  };

  const projectResults = [
    { label: '-', color: 'bg-slate-500' },
    { label: 'CAMPANHA PAUSADA', color: 'bg-slate-400' },
    { label: 'TESTANDO', color: 'bg-blue-500' },
    { label: 'RESULTADO RUIM', color: 'bg-rose-500' },
    { label: 'RESULTADO OK', color: 'bg-amber-500' },
    { label: 'RESULTADO BOM', color: 'bg-emerald-500' },
    { label: 'AGUARDANDO CRIATIVOS', color: 'bg-slate-400' },
    { label: 'AGUARDANDO ARTIGO', color: 'bg-slate-400' },
    { label: 'AGUARDANDO LP', color: 'bg-slate-400' },
    { label: 'SUBIR CAMPANHA', color: 'bg-slate-400' },
  ];

  const campaignStatusOptions = [
    { label: 'Rodando', color: 'text-emerald-500' },
    { label: 'Pausado', color: 'text-slate-500' },
    { label: 'Falta de saldo', color: 'text-amber-500' },
    { label: 'Bloqueio', color: 'text-rose-500' },
  ];

  const aiServiceOptions = ['Ativado', 'Desativado'];
  const platformOptions = ['Meta Ads', 'Google Ads', 'Tiktok Ads', 'Linkedin Ads'];

  const productIcons = [
    { name: 'Gavel', icon: Gavel, label: 'Criminal' },
    { name: 'Scale', icon: Scale, label: 'Justiça' },
    { name: 'HeartPulse', icon: HeartPulse, label: 'Saúde' },
    { name: 'ShieldCheck', icon: ShieldCheck, label: 'Previdenciário' },
    { name: 'Hammer', icon: Hammer, label: 'Trabalhista' },
    { name: 'Landmark', icon: Landmark, label: 'Servidor Público' },
    { name: 'Banknote', icon: Banknote, label: 'Bancário' },
    { name: 'ShoppingCart', icon: ShoppingCart, label: 'Consumidor' },
    { name: 'Users', icon: Users, label: 'Família' },
    { name: 'Home', icon: Home, label: 'Imobiliário' },
    { name: 'Stethoscope', icon: Stethoscope, label: 'Saúde (Médico)' },
    { name: 'Building2', icon: Building2, label: 'Empresarial' },
    { name: 'Briefcase', icon: Briefcase, label: 'Trabalhista (Empresa)' },
    { name: 'Layout', icon: Layout, label: 'Geral' },
  ];

  const getProductIcon = (iconName?: string) => {
    const iconObj = productIcons.find(i => i.name === iconName);
    const IconComponent = iconObj ? iconObj.icon : Layout;
    return <IconComponent size={18} />;
  };

  const handleOpenGoals = () => {
    if (selectedProduct) {
      setTempGoals({
        cpa: selectedProduct.cpaGoal || 'R$ 0',
        leads: selectedProduct.leadsGoal || '0',
        cac: selectedProduct.cacGoal || 'R$ 0',
        fechamentos: selectedProduct.fechamentosGoal || '0'
      });
      setIsGoalsModalOpen(true);
    }
  };

  const handleSaveMeeting = async () => {
    if (!selectedProject || !meetingData.title || !meetingData.date) return;

    const newMeeting = {
      id: Math.random().toString(36).substr(2, 9),
      project_id: selectedProject.id,
      ...meetingData
    };

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeeting)
      });

      if (!response.ok) throw new Error('Failed to save meeting');

      setIsMeetingModalOpen(false);
      setMeetingData({ title: '', date: '', attendees: '', actions: '' });
      
      // Refresh meetings
      const fetchMeetings = async () => {
        try {
          const response = await fetch(`/api/meetings?project_id=${encodeURIComponent(selectedProject.id)}`);
          if (response.ok) {
            const data = await response.json();
            setMeetings(data);
          }
        } catch (err) {
          console.error("Failed to fetch meetings:", err);
        }
      };
      fetchMeetings();
    } catch (err) {
      console.error('Error saving meeting:', err);
    }
  };

  const handleSaveGoals = () => {
    if (!selectedProduct) return;

    const updatedProduct = {
      ...selectedProduct,
      cpaGoal: tempGoals.cpa,
      leadsGoal: tempGoals.leads,
      cacGoal: tempGoals.cac,
      fechamentosGoal: tempGoals.fechamentos
    };

    const updatedProjects = projects.map(proj => ({
      ...proj,
      products: proj.products?.map(p => p.id === selectedProduct.id ? updatedProduct : p)
    }));

    setProjects(updatedProjects);
    saveProjects(updatedProjects);

    setSelectedProduct(updatedProduct);
    setIsGoalsModalOpen(false);
  };

  const getCampaignStatusColor = (status: string) => {
    return campaignStatusOptions.find(o => o.label === status)?.color || 'text-white';
  };

  const getCpaGoalColor = (current: string, goal: string) => {
    const curr = parseFloat((current || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    const g = parseFloat((goal || '').replace(/[^\d,]/g, '').replace(',', '.')) || 0;
    if (g === 0) return 'text-slate-500';
    return curr <= g ? 'text-emerald-500' : 'text-rose-500';
  };

  const getLeadsGoalColor = (current: string, goal: string) => {
    const curr = parseFloat((current || '').replace(/[^\d]/g, '')) || 0;
    const g = parseFloat((goal || '').replace(/[^\d]/g, '')) || 0;
    if (g === 0) return 'text-slate-500';
    return curr >= g ? 'text-emerald-500' : 'text-rose-500';
  };

  const handleProductClick = (product: Product) => {
    setSelectedProduct(product);
    setTempProduct(product);
    setIsProductModalOpen(true);
    setIsEditingMetrics(false);
  };

  const handleOpenAddProduct = (projectId: string) => {
    setActiveProjectId(projectId);
    setNewProductData({
      name: '',
      icon: 'Layout',
      budget: 'R$ 0',
      cac: 'R$ 0',
      results: '0 Leads',
      platform: 'Meta Ads',
      status: 'Rodando',
      aiService: 'Ativado',
      delivery: 'Brasil',
      balance: 'Limite Disponível',
      kpis: 'CTR 0% | CPC R$ 0',
      bottleneck: 'Nenhum',
      projectResult: '-'
    });
    setIsAddProductModalOpen(true);
  };

  const handleSaveNewProduct = () => {
    if (!activeProjectId || !newProductData.name) return;

    const newProduct: Product = {
      id: Math.random().toString(36).substr(2, 9),
      name: newProductData.name,
      icon: newProductData.icon || 'Layout',
      investmentMonthly: newProductData.investmentMonthly || 'R$ 0',
      leads: newProductData.leads || '0',
      contracts: newProductData.contracts || '0',
      cac: newProductData.cac || 'R$ 0',
      cpa: newProductData.cpa || 'R$ 0',
      budget: newProductData.budget || 'R$ 0',
      platform: newProductData.platform || 'Meta Ads',
      status: newProductData.status || 'Rodando',
      aiService: newProductData.aiService || 'Ativado',
      delivery: newProductData.delivery || 'Brasil',
      balance: newProductData.balance || 'Limite Disponível',
      paymentMethod: newProductData.paymentMethod || 'Cartão',
      kpis: newProductData.kpis || 'CTR 0% | CPC R$ 0',
      bottleneck: newProductData.bottleneck || 'Nenhum',
      projectResult: newProductData.projectResult || '-',
      history: '0 alterações',
      optimizations: []
    };

    setProjects(prev => prev.map(proj => {
      if (proj.id === activeProjectId) {
        return {
          ...proj,
          products: [...(proj.products || []), newProduct]
        };
      }
      return proj;
    }));

    setIsAddProductModalOpen(false);
    setActiveProjectId(null);
  };

  const handleSaveNewPartner = () => {
    if (!newPartnerData.partner) return;

    const newPartner: Project = {
      id: Math.random().toString(36).substr(2, 9),
      partner: newPartnerData.partner,
      product: '',
      status: newPartnerData.status as Project['status'] || 'Operacional',
      roi: newPartnerData.roi || '0.0x',
      investment: newPartnerData.investment || 'R$ 0',
      responsible: newPartnerData.responsible || 'Lucas Lima',
      lastUpdate: 'Agora',
      products: [],
      activeClientId: newPartnerData.activeClientId,
      page_id: activePage,
      group: newPartnerData.group
    };

    const updatedProjects = [newPartner, ...projects];
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    setIsAddPartnerModalOpen(false);
    setNewPartnerData({
      partner: '',
      status: 'Operacional',
      responsible: 'Lucas Lima',
      investment: 'R$ 0',
      roi: '0.0x',
      activeClientId: ''
    });
  };

  const handleSaveMetrics = () => {
    if (!tempProduct || !selectedProduct) return;

    // Calculate CAC and CPA automatically
    const investment = parseCurrency(tempProduct.investmentMonthly);
    const contracts = parseFloat(tempProduct.contracts) || 0;
    const leads = parseFloat(tempProduct.leads) || 0;

    const calculatedCac = contracts > 0 ? `R$ ${(investment / contracts).toFixed(2).replace('.', ',')}` : 'R$ 0,00';
    const calculatedCpa = leads > 0 ? `R$ ${(investment / leads).toFixed(2).replace('.', ',')}` : 'R$ 0,00';

    const finalProduct = { 
      ...tempProduct,
      cac: calculatedCac,
      cpa: calculatedCpa
    };

    const changes: string[] = [];
    const fields: { key: keyof Product; label: string }[] = [
      { key: 'name', label: 'Nome do Produto' },
      { key: 'icon', label: 'Ícone' },
      { key: 'investmentMonthly', label: 'Investimento Mensal' },
      { key: 'leads', label: 'Leads' },
      { key: 'contracts', label: 'Contratos' },
      { key: 'cac', label: 'CAC' },
      { key: 'cpa', label: 'CPA' },
      { key: 'balance', label: 'Saldo' },
      { key: 'kpis', label: 'KPIs' },
      { key: 'platform', label: 'Plataforma' },
      { key: 'status', label: 'Status' },
      { key: 'delivery', label: 'Veiculação' },
      { key: 'aiService', label: 'IA' },
      { key: 'bottleneck', label: 'Gargalo' },
      { key: 'paymentMethod', label: 'Forma de Pagamento' },
    ];

    fields.forEach(field => {
      if (selectedProduct[field.key] !== finalProduct[field.key]) {
        changes.push(`${field.label}: de "${selectedProduct[field.key]}" para "${finalProduct[field.key]}"`);
      }
    });

    if (changes.length > 0) {
      const now = new Date();
      const note: Optimization = {
        id: Math.random().toString(36).substr(2, 9),
        author: userData?.name || 'João',
        authorPhoto: userData?.picture || auth.currentUser?.photoURL || '',
        role: userData?.role || 'Gestor',
        date: now.toLocaleDateString('pt-BR'),
        time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
        message: `Métricas atualizadas:\n${changes.join('\n')}`,
        type: 'Mudança de Métricas'
      };
      finalProduct.optimizations = [note, ...(finalProduct.optimizations || [])];
    }

    const updatedProjects = projects.map(proj => ({
      ...proj,
      products: proj.products?.map(p => p.id === selectedProduct.id ? finalProduct : p)
    }));

    setProjects(updatedProjects);
    saveProjects(updatedProjects);

    setSelectedProduct(finalProduct);
    setTempProduct(finalProduct);
    setIsEditingMetrics(false);
  };

  const handleUpdateProductResult = (result: string) => {
    if (!selectedProduct) return;
    if (selectedProduct.projectResult === result) {
      setIsResultDropdownOpen(false);
      return;
    }

    const now = new Date();
    const note: Optimization = {
      id: Math.random().toString(36).substr(2, 9),
      author: userData?.name || 'João',
      authorPhoto: userData?.picture || auth.currentUser?.photoURL || '',
      role: userData?.role || 'Gestor',
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      message: `Resultado do Projeto alterado: de "${selectedProduct.projectResult || '-'}" para "${result}"`,
      status: 'Mudança de Status'
    };

    const updatedProduct = { 
      ...selectedProduct, 
      projectResult: result,
      optimizations: [note, ...(selectedProduct.optimizations || [])]
    };

    setSelectedProduct(updatedProduct);
    setTempProduct(updatedProduct);

    setProjects(prev => prev.map(proj => ({
      ...proj,
      products: proj.products?.map(p => p.id === selectedProduct.id ? updatedProduct : p)
    })));
    
    // Save to database
    saveProjects(projects.map(proj => ({
      ...proj,
      products: proj.products?.map(p => p.id === selectedProduct.id ? updatedProduct : p)
    })));
    
    setIsResultDropdownOpen(false);
  };

  const handleUpdateProjectResult = (result: string) => {
    if (!selectedProject) return;
    if (selectedProject.projectResult === result) {
      setIsProjectResultDropdownOpen(false);
      return;
    }

    const updatedProject = { 
      ...selectedProject, 
      projectResult: result
    };
    
    setSelectedProject(updatedProject);
    const updatedProjects = projects.map(p => p.id === updatedProject.id ? updatedProject : p);
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
    setIsProjectResultDropdownOpen(false);
  };

  const [isSavingNote, setIsSavingNote] = useState(false);

  const handleAddNote = async () => {
    if ((!newNote.trim() && images.length === 0) || !selectedProduct) return;
    
    setIsSavingNote(true);
    
    let userRole = 'Usuário';
    try {
      const email = auth.currentUser?.email;
      if (email) {
        const response = await fetch(`/api/users/profile/${email}`);
        if (response.ok) {
          const userData = await response.json();
          userRole = userData.role;
        }
      }
    } catch (err) {
      console.error("Error fetching user role:", err);
    }

    const imageUrls: string[] = [];
    for (const image of images) {
      const storageRef = ref(storage, `users/${auth.currentUser?.uid}/optimizations/${Date.now()}_${image.name}`);
      await uploadBytes(storageRef, image);
      const downloadURL = await getDownloadURL(storageRef);
      imageUrls.push(downloadURL);
    }

    const now = new Date();
    
    // Categorização automática
    let category = 'Otimização';
    const lowerNote = newNote.toLowerCase();
    if (lowerNote.includes('status') || lowerNote.includes('pausado') || lowerNote.includes('rodando') || lowerNote.includes('bloqueio')) {
      category = 'Mudança de Status';
    } else if (lowerNote.includes('métrica') || lowerNote.includes('cpa') || lowerNote.includes('leads') || lowerNote.includes('roi') || lowerNote.includes('custo')) {
      category = 'Mudança de Métricas';
    }

    const note: Optimization = {
      id: Math.random().toString(36).substr(2, 9),
      author: userData?.name || auth.currentUser?.displayName || 'Usuário',
      authorPhoto: userData?.picture || auth.currentUser?.photoURL || '',
      role: userRole,
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      message: newNote,
      isInternal: isInternal,
      images: imageUrls,
      optimization: category === 'Otimização' ? 'Otimização' : undefined,
      type: category === 'Mudança de Métricas' ? 'Mudança de Métricas' : undefined,
      status: category === 'Mudança de Status' ? 'Mudança de Status' : undefined
    };

    try {
      await fetch('/api/optimizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...note,
          product_id: selectedProduct.id
        })
      });

      const updatedProduct = {
        ...selectedProduct,
        optimizations: [note, ...(selectedProduct.optimizations || [])]
      };

      setSelectedProduct(updatedProduct);
      
      setProjects(prev => prev.map(proj => ({
        ...proj,
        products: proj.products?.map(p => p.id === selectedProduct.id ? updatedProduct : p)
      })));

      setNewNote('');
      setImages([]);
      setIsInternal(false);
      setIsAddingNote(false);
      confetti({
        particleCount: 150,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#8b5cf6', '#a78bfa', '#c4b5fd']
      });
    } catch (err) {
      console.error("Error saving optimization:", err);
    } finally {
      setIsSavingNote(false);
    }
  };

  const groupedProjects = Object.entries(filteredProjects.reduce((acc, project) => {
    const group = project.group || 'Sem Grupo';
    if (!acc[group]) {
      acc[group] = [];
    }
    acc[group].push(project);
    return acc;
  }, {} as Record<string, typeof filteredProjects>))
  .sort(([a], [b]) => {
    if (a === 'Quarentena') return -1;
    if (b === 'Quarentena') return 1;
    return a.localeCompare(b);
  })
  .reduce((acc, [key, value]) => {
    acc[key] = value;
    return acc;
  }, {} as Record<string, typeof filteredProjects>);

  const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({ 'Sem Grupo': true });

  const toggleGroup = (group: string) => {
    setExpandedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg transition-colors duration-300">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
          <p className="text-slate-500 dark:text-slate-400 font-medium">Carregando projetos...</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-dark-bg text-white p-8 font-sans relative">
      {/* Saving Indicator */}
      <AnimatePresence>
        {(isSaving || saveError) && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`fixed top-4 right-4 z-[200] px-4 py-2 rounded-xl border flex items-center gap-2 shadow-lg backdrop-blur-md ${
              saveError ? 'bg-rose-500/20 border-rose-500/50 text-rose-500' : 'bg-violet-500/20 border-violet-500/50 text-violet-500'
            }`}
          >
            {saveError ? (
              <>
                <AlertTriangle size={16} />
                <span className="text-xs font-bold uppercase tracking-wider">Erro ao salvar: {saveError}</span>
              </>
            ) : (
              <>
                <div className="w-3 h-3 border-2 border-violet-500/20 border-t-violet-500 rounded-full animate-spin" />
                <span className="text-xs font-bold uppercase tracking-wider">Salvando alterações...</span>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Product Modal */}
      <AnimatePresence>
        {isProductModalOpen && selectedProduct && tempProduct && (
          <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10 custom-scrollbar">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsProductModalOpen(false)}
              className="fixed inset-0 modal-overlay"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-4xl modal-container overflow-hidden mb-10 transition-colors duration-300"
            >
              {/* Modal Header */}
              <div className="p-8 border-b border-slate-200 dark:border-white/10">
                <div className="flex flex-col xl:flex-row xl:items-center justify-between gap-6 mb-6">
                  <div className="flex flex-wrap items-center gap-4">
                    {isEditingMetrics ? (
                      <div className="flex items-center gap-3">
                        <div className="relative group">
                          <button 
                            className="p-3 bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl text-violet-600 hover:bg-white/70 dark:hover:bg-white/10 transition-all"
                            title="Mudar Ícone"
                          >
                            {getProductIcon(tempProduct.icon)}
                          </button>
                          <div className="absolute top-full left-0 mt-2 w-64 bg-white/80 backdrop-blur-xl dark:bg-dark-sidebar border border-white/20 dark:border-white/10 rounded-xl shadow-2xl z-[110] p-2 hidden group-hover:grid grid-cols-4 gap-1">
                            {productIcons.map((item) => (
                              <button
                                key={item.name}
                                onClick={() => setTempProduct({ ...tempProduct, icon: item.name })}
                                className={`p-2 rounded-lg hover:bg-white/50 dark:hover:bg-white/5 transition-all flex items-center justify-center ${tempProduct.icon === item.name ? 'bg-violet-500/20 text-violet-600' : 'text-slate-500'}`}
                                title={item.label}
                              >
                                <item.icon size={18} />
                              </button>
                            ))}
                          </div>
                        </div>
                        <input 
                          type="text" 
                          value={tempProduct.name || ''}
                          onChange={(e) => setTempProduct({ ...tempProduct, name: e.target.value })}
                          className="text-2xl font-bold text-slate-900 dark:text-white bg-white/50 dark:bg-white/5 border border-white/20 dark:border-white/10 rounded-xl px-3 py-1 focus:border-violet-500 outline-none"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-violet-600/20 rounded-xl">
                          <div className="text-violet-600">
                            {getProductIcon(selectedProduct.icon)}
                          </div>
                        </div>
                        <h2 className="text-2xl font-bold text-slate-900 dark:text-white">{selectedProduct.name}</h2>
                      </div>
                    )}
                    <span className={`px-3 py-1 ${(getCampaignStatusColor(selectedProduct.status) || '').replace('text-', 'bg-')}/20 ${getCampaignStatusColor(selectedProduct.status)} text-xs font-bold rounded-full flex items-center gap-1.5`}>
                      <div className={`w-1.5 h-1.5 rounded-full ${(getCampaignStatusColor(selectedProduct.status) || '').replace('text-', 'bg-')} animate-pulse`} />
                      {selectedProduct.status}
                    </span>
                  </div>
                  <div className="flex flex-wrap items-center gap-3 justify-end w-full xl:w-auto mt-4 xl:mt-0">
                    {!isEditingMetrics && (
                      <>
                        <button 
                          onClick={() => setIsAddMetricsModalOpen(true)}
                          className="px-4 py-2 bg-violet-600/10 hover:bg-violet-600/20 text-violet-500 text-sm font-bold rounded-xl transition-all border border-violet-500/20 flex items-center gap-2"
                        >
                          <Plus size={16} />
                          Adicionar Métricas
                        </button>
                        <button 
                          onClick={handleOpenGoals}
                          className="px-4 py-2 bg-violet-600/10 hover:bg-violet-600/20 text-violet-500 text-sm font-bold rounded-xl transition-all border border-violet-500/20 flex items-center gap-2"
                        >
                          <Target size={16} />
                          Metas
                        </button>
                      </>
                    )}
                    {isEditingMetrics ? (
                      <button 
                        onClick={handleSaveMetrics}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-slate-900 dark:text-white text-sm font-bold rounded-xl transition-all shadow-lg shadow-emerald-600/20"
                      >
                        Salvar Alterações
                      </button>
                    ) : (
                      <button 
                        onClick={() => {
                          setIsEditingMetrics(true);
                          setTempProduct({ ...selectedProduct });
                        }}
                        className="px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white text-sm font-bold rounded-xl transition-all border border-slate-200 dark:border-white/5"
                      >
                        Dados do produto
                      </button>
                    )}
                    <button 
                      onClick={() => setIsProductModalOpen(false)}
                      className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                    >
                      <X size={20} />
                    </button>
                  </div>
                </div>

                {/* Tabs */}
                <div className="flex items-center gap-6 mb-8 border-b border-slate-200 dark:border-white/10">
                  {(['resultado', 'kpis'] as const).map((tab) => (
                    <button
                      key={tab}
                      onClick={() => setActiveProductTab(tab)}
                      className={`pb-4 text-sm font-bold transition-all ${
                        activeProductTab === tab
                          ? 'text-violet-600 border-b-2 border-violet-600'
                          : 'text-slate-500 hover:text-light-text dark:hover:text-white'
                      }`}
                    >
                      {tab === 'resultado' ? 'Resultado do produto' : 'KPI\'s Produto'}
                    </button>
                  ))}
                </div>

                {/* Content based on active tab */}
                {activeProductTab === 'resultado' && (
                  <>
                    {/* Project Result Selector - Refined Dropdown */}
                    <div className="pt-2 border-b border-slate-200 dark:border-white/5 relative mb-8">
                      <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Resultado do Projeto</p>
                      <div className="relative">
                        <button 
                          onClick={() => setIsResultDropdownOpen(!isResultDropdownOpen)}
                          className="flex items-center justify-between w-full max-w-xs px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${projectResults.find(r => r.label === selectedProduct.projectResult)?.color || 'bg-slate-500'}`} />
                            {selectedProduct.projectResult || 'Selecionar Resultado'}
                          </div>
                          <ChevronDown size={16} className={`text-slate-500 transition-transform ${isResultDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isResultDropdownOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 mt-2 w-full max-w-xs bg-light-sidebar dark:bg-dark-sidebar border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                            >
                              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {projectResults.map((res) => (
                                  <button
                                    key={res.label}
                                    onClick={() => handleUpdateProductResult(res.label)}
                                    className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-white/5 ${
                                      selectedProduct.projectResult === res.label ? 'bg-violet-500/10 text-slate-900 dark:text-white' : 'text-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className={`w-2 h-2 rounded-full ${res.color}`} />
                                      {res.label}
                                    </div>
                                    {selectedProduct.projectResult === res.label && <Check size={14} className="text-violet-500" />}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>
                    </div>

                    {/* Detailed Metrics Grid */}
                    <div className="mt-8 grid grid-cols-3 gap-4">
                      {[
                        { label: 'Orçamento Investido', value: 'investmentMonthly', icon: DollarSign, color: 'text-slate-900 dark:text-white', type: 'text', editable: false },
                        { label: 'Leads', value: 'leads', icon: Users, color: 'text-slate-900 dark:text-white', type: 'text', editable: false },
                        { label: 'Contratos', value: 'contracts', icon: FileText, color: 'text-slate-900 dark:text-white', type: 'text', editable: false },
                        { label: 'CAC', value: 'cac', icon: Target, color: 'text-emerald-500', type: 'text', editable: false },
                        { label: 'CPA', value: 'cpa', icon: Target, color: 'text-emerald-500', type: 'text', editable: false },
                        { label: 'KPIs Campanha', value: 'kpis', icon: Activity, color: 'text-slate-900 dark:text-white', type: 'text', editable: false },
                        { label: 'Investimento Mensal', value: 'budget', icon: DollarSign, color: 'text-slate-900 dark:text-white', type: 'text', editable: true },
                        { label: 'Plataforma', value: 'platform', icon: Globe, color: 'text-violet-400', type: 'select', options: platformOptions, editable: true },
                        { label: 'Status Campanha', value: 'status', icon: Activity, color: 'dynamic', type: 'select', options: campaignStatusOptions.map(o => o.label), editable: true },
                        { label: 'Dias de veiculação', value: 'delivery', icon: Globe, color: 'text-slate-900 dark:text-white', type: 'select', options: ['Full Time', 'Seg a Sex', 'Somente Horário Comercial', 'Seg a Sex + Domingo', 'Seg a Sab', 'Seg a Sex - Ter'], editable: true },
                        { label: 'IA de Atendimento', value: 'aiService', icon: MessageSquare, color: 'text-slate-900 dark:text-white', type: 'select', options: aiServiceOptions, editable: true },
                        { label: 'Gargalo do Produto', value: 'bottleneck', icon: AlertTriangle, color: 'text-rose-500', type: 'text', editable: true },
                      ].map((metric) => (
                        <div key={metric.label} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                          <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <metric.icon size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{metric.label}</span>
                          </div>
                          {isEditingMetrics && metric.editable ? (
                            metric.type === 'select' ? (
                              <select
                                value={(tempProduct as any)[metric.value] || ''}
                                onChange={(e) => setTempProduct({ ...tempProduct, [metric.value]: e.target.value })}
                                className="w-full bg-light-sidebar dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:border-violet-500 outline-none mt-1"
                              >
                                {metric.options?.map(opt => (
                                  <option key={opt} value={opt}>{opt}</option>
                                ))}
                              </select>
                            ) : (
                              <input 
                                type="text" 
                                value={(tempProduct as any)[metric.value] || ''}
                                onChange={(e) => setTempProduct({ ...tempProduct, [metric.value]: e.target.value })}
                                className="w-full bg-light-sidebar dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:border-violet-500 outline-none mt-1"
                              />
                            )
                          ) : (
                            <p className={`text-sm font-bold ${metric.color === 'dynamic' ? getCampaignStatusColor((selectedProduct as any)[metric.value]) : metric.color}`}>
                              {(selectedProduct as any)[metric.value]}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeProductTab === 'kpis' && (
                  <div className="mt-8">
                    {/* Página vazia */}
                  </div>
                )}
              </div>

              {/* Modal Content - Optimization History */}
              <div className="p-8 overflow-y-visible">
                <div className="flex items-center justify-between mb-10">
                  <div className="flex items-center gap-3">
                    <Activity size={20} className="text-violet-500" />
                    <h3 className="text-lg font-bold text-light-text dark:text-white">Histórico de Otimizações</h3>
                  </div>
                  <div className="flex items-center gap-2">
                    <select 
                      value={filterPerson}
                      onChange={(e) => setFilterPerson(e.target.value)}
                      className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <option>Pessoa</option>
                      {Array.from(new Set(selectedProduct.optimizations?.map(o => o.author))).map(author => <option key={author} value={author}>{author}</option>)}
                    </select>
                    <select 
                      value={filterType}
                      onChange={(e) => setFilterType(e.target.value)}
                      className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-xs text-slate-600 dark:text-slate-400"
                    >
                      <option>Tipo</option>
                      <option value="Status">Status</option>
                      <option value="Mudança de Métricas">Mudança de Métricas</option>
                      <option value="Otimização">Otimização</option>
                    </select>
                    <button 
                      onClick={() => setIsAddingNote(!isAddingNote)}
                      className="flex items-center gap-2 text-violet-400 hover:text-violet-300 text-sm font-bold transition-colors ml-4"
                    >
                      <Plus size={16} />
                      Adicionar Nota
                    </button>
                  </div>
                </div>

                {isAddingNote && (
                  <motion.div 
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="mb-8 p-4 bg-slate-100 dark:bg-white/5 rounded-2xl border border-violet-500/20"
                  >
                    <div className="relative">
                      <textarea 
                        value={newNote}
                        onChange={(e) => {
                          setNewNote(e.target.value);
                          if (e.target.value.endsWith('/')) {
                            setSlashMenuOpen(true);
                          } else if (slashMenuOpen && e.target.value.includes(' ')) {
                            setSlashMenuOpen(false);
                          }
                        }}
                        onPaste={(e) => {
                          const items = e.clipboardData.items;
                          for (let i = 0; i < items.length; i++) {
                            if (items[i].type.indexOf('image') !== -1) {
                              const file = items[i].getAsFile();
                              if (file) {
                                setImages(prev => [...prev, file]);
                              }
                            }
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Escape') setSlashMenuOpen(false);
                          if (e.key === 'Enter') {
                            const lines = newNote.split('\n');
                            const lastLine = lines[lines.length - 1];
                            if (lastLine.trim().startsWith('•')) {
                              e.preventDefault();
                              setNewNote(newNote + '\n• ');
                            }
                          }
                        }}
                        placeholder="Descreva a otimização realizada... (digite / para opções)"
                        className="w-full bg-transparent border-none outline-none text-sm text-light-text dark:text-white placeholder:text-slate-500 resize-none h-24"
                      />
                      {slashMenuOpen && (
                        <div className="absolute top-full left-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-white/10 z-50">
                          <button 
                            onClick={() => {
                              setNewNote(newNote.slice(0, -1) + '• ');
                              setSlashMenuOpen(false);
                            }}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-100 dark:hover:bg-white/5 rounded-t-xl"
                          >
                            Lista com marcadores
                          </button>
                        </div>
                      )}
                    </div>
                    <div className="flex justify-between items-center mt-2">
                      <label className="flex items-center gap-2 text-sm text-slate-400 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={isInternal}
                          onChange={(e) => setIsInternal(e.target.checked)}
                          className="rounded border-slate-700 bg-slate-800 text-violet-600 focus:ring-violet-500"
                        />
                        Nota Interna
                      </label>
                      <div className="flex items-center gap-2">
                        <button 
                          onClick={() => fileInputRef.current?.click()}
                          className="p-2 text-slate-400 hover:text-violet-500 transition-colors"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </button>
                        <input 
                          type="file" 
                          ref={fileInputRef}
                          onChange={(e) => {
                            if (e.target.files) setImages(Array.from(e.target.files));
                          }}
                          className="hidden"
                          multiple
                          accept="image/*"
                        />
                        {images.length > 0 && (
                          <div className="flex gap-2">
                            {images.map((img, i) => (
                              <img 
                                key={i} 
                                src={URL.createObjectURL(img)} 
                                alt="Preview" 
                                className="w-10 h-10 object-cover rounded-lg border border-slate-700" 
                                referrerPolicy="no-referrer"
                              />
                            ))}
                          </div>
                        )}
                        <div className="flex-grow" />
                        <button 
                          onClick={() => setIsAddingNote(false)}
                          className="px-4 py-2 text-slate-400 hover:text-light-text dark:text-white text-sm font-bold transition-colors"
                        >
                          Cancelar
                        </button>
                        <button 
                          onClick={handleAddNote}
                          disabled={isSavingNote}
                          className={`px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold rounded-xl transition-all ${isSavingNote ? 'opacity-70 cursor-not-allowed' : ''}`}
                        >
                          {isSavingNote ? (
                            <motion.div
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            >
                              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                            </motion.div>
                          ) : (
                            'Salvar Nota'
                          )}
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Timeline */}
                <div className="relative max-h-[900px] overflow-y-auto custom-scrollbar pr-2">
                  <div className="relative space-y-12 py-4">
                    {/* Vertical Line */}
                    <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                    {selectedProduct.optimizations
                      ?.slice()
                      .sort((a, b) => {
                        const dateA = new Date(a.date.split('/').reverse().join('-') + 'T' + (a.time || '00:00'));
                        const dateB = new Date(b.date.split('/').reverse().join('-') + 'T' + (b.time || '00:00'));
                        return dateB.getTime() - dateA.getTime();
                      })
                      .filter(opt => {
                        const matchesPerson = filterPerson === 'Pessoa' || opt.author === filterPerson;
                        let matchesType = true;
                        if (filterType !== 'Tipo') {
                          if (filterType === 'Status') {
                            matchesType = opt.status === 'Mudança de Status';
                          } else if (filterType === 'Mudança de Métricas') {
                            matchesType = opt.type === 'Mudança de Métricas';
                          } else if (filterType === 'Otimização') {
                            matchesType = opt.optimization === 'Otimização';
                          }
                        }
                        
                        return matchesPerson && matchesType && 
                               (!opt.isInternal || (auth.currentUser?.email?.endsWith('@grapemidia.com')));
                      })
                      .map((opt, idx) => (
                      <div key={opt.id} className="relative flex items-center justify-center">
                        {/* Timeline Dot */}
                        <div className="absolute left-1/2 -translate-x-1/2 z-10">
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-dark-card border border-violet-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                            <Check size={14} className="text-violet-500" />
                          </div>
                        </div>

                        {/* Card */}
                        <div className={`w-[40%] p-5 rounded-2xl border transition-all ${opt.isInternal ? 'bg-amber-50 dark:bg-amber-900/20 border-amber-500/20' : 'bg-white dark:bg-white/5 border-slate-200 dark:border-white/5'} hover:border-violet-500/20 ${idx % 2 === 0 ? 'mr-auto text-left' : 'ml-auto text-left'}`}>
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex items-center gap-2">
                              {opt.authorPhoto ? (
                                <img src={opt.authorPhoto} alt={opt.author} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-500 text-xs font-bold">
                                  {opt.author.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <p className={`text-sm font-bold ${opt.isInternal ? 'text-amber-700 dark:text-amber-500' : 'text-slate-900 dark:text-white'}`}>
                                {opt.author} <span className="text-slate-500 font-medium">({opt.role})</span>
                              </p>
                            </div>
                            <div className="flex items-center gap-2">
                              {opt.optimization && (
                                <span className="px-2 py-0.5 rounded-full bg-violet-500/10 text-violet-500 text-[10px] font-bold uppercase tracking-wider">
                                  {opt.optimization}
                                </span>
                              )}
                              {opt.type && (
                                <span className="px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-500 text-[10px] font-bold uppercase tracking-wider">
                                  {opt.type}
                                </span>
                              )}
                              {opt.status && (
                                <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-wider">
                                  {opt.status}
                                </span>
                              )}
                              <p className="text-[10px] text-slate-500 font-medium">{opt.date} {opt.time && `às ${opt.time}`}</p>
                            </div>
                          </div>
                          {opt.isInternal && (
                            <div className="flex items-center gap-1 mb-2 text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                              <span className="opacity-70">🔒</span> MENSAGEM INTERNA
                            </div>
                          )}
                          <p className={`text-xs ${opt.isInternal ? 'text-amber-900 dark:text-amber-200' : 'text-slate-600 dark:text-slate-400'} leading-relaxed whitespace-pre-line`}>
                            {opt.message}
                          </p>

  {/* ... (inside the map function) */}
  {opt.images && opt.images.length > 0 && (
    <div className="mt-3 flex flex-wrap gap-2">
      {opt.images.map((img, i) => (
        <img 
          key={i} 
          src={img} 
          alt="Nota" 
          className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" 
          referrerPolicy="no-referrer" 
          onClick={() => setPreviewImage(img)}
        />
      ))}
    </div>
  )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              {/* Add Metrics Modal */}
              <AnimatePresence>
                {isAddMetricsModalOpen && (
                  <div className="absolute inset-0 z-[500] flex items-center justify-center p-4 modal-overlay rounded-3xl">
                    <motion.div 
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      exit={{ opacity: 0, scale: 0.9 }}
                      className="relative p-6 modal-container w-full max-w-lg"
                    >
                      <h3 className="text-lg font-bold mb-1">Adicionar Métricas Semanais</h3>
                      <input 
                        type="month" 
                        defaultValue={new Date().toISOString().slice(0, 7)}
                        className="text-sm text-slate-500 mb-4 capitalize hover:text-violet-500 transition-colors bg-transparent border-none focus:ring-0 cursor-pointer"
                      />
                      <div className="space-y-4">
                        {weeklyMetrics.map((m, index) => (
                          <div key={m.week} className="grid grid-cols-4 gap-2 items-center">
                            <p className="text-xs font-bold text-slate-500">Semana {m.week}</p>
                            <input type="number" placeholder="Inv." value={m.investment} onChange={(e) => {
                              const newMetrics = [...weeklyMetrics];
                              newMetrics[index].investment = e.target.value;
                              setWeeklyMetrics(newMetrics);
                            }} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-white" />
                            <input type="number" placeholder="Leads" value={m.leads} onChange={(e) => {
                              const newMetrics = [...weeklyMetrics];
                              newMetrics[index].leads = e.target.value;
                              setWeeklyMetrics(newMetrics);
                            }} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-white" />
                            <input type="number" placeholder="Cont." value={m.contracts} onChange={(e) => {
                              const newMetrics = [...weeklyMetrics];
                              newMetrics[index].contracts = e.target.value;
                              setWeeklyMetrics(newMetrics);
                            }} className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-sm text-slate-900 dark:text-white" />
                          </div>
                        ))}
                      </div>
                      <div className="flex justify-end gap-4 mt-6">
                        <button onClick={() => setIsAddMetricsModalOpen(false)} className="px-4 py-2 text-sm text-slate-500">Cancelar</button>
                        <button onClick={() => {
                          if (selectedProduct) {
                            const totalInv = weeklyMetrics.reduce((sum, m) => sum + Number(m.investment || 0), 0);
                            const totalLeads = weeklyMetrics.reduce((sum, m) => sum + Number(m.leads || 0), 0);
                            const totalCont = weeklyMetrics.reduce((sum, m) => sum + Number(m.contracts || 0), 0);
                            
                            const updatedProduct = { 
                              ...selectedProduct, 
                              weeklyMetrics,
                              investmentMonthly: `R$ ${totalInv.toLocaleString('pt-BR')}`,
                              leads: totalLeads.toString(),
                              contracts: totalCont.toString(),
                              cac: totalCont > 0 ? `R$ ${(totalInv / totalCont).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00',
                              cpa: totalLeads > 0 ? `R$ ${(totalInv / totalLeads).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}` : 'R$ 0,00'
                            };
                            
                            const updatedProjects = projects.map(p => ({
                              ...p,
                              products: p.products?.map(prod => prod.id === updatedProduct.id ? updatedProduct : prod)
                            }));
                            
                            setProjects(updatedProjects);
                            saveProjects(updatedProjects);
                            setSelectedProduct(updatedProduct);
                            setIsAddMetricsModalOpen(false);
                          }
                        }} className="px-4 py-2 text-sm bg-violet-600 text-white rounded-xl">Salvar</button>
                      </div>
                    </motion.div>
                  </div>
                )}
              </AnimatePresence>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Product Modal */}
      <AnimatePresence>
        {isAddProductModalOpen && (
          <div className="fixed inset-0 z-[100] overflow-y-auto p-4 flex justify-center items-start">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddProductModalOpen(false)}
              className="fixed inset-0 modal-overlay"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-2xl modal-container overflow-hidden my-auto transition-colors duration-300"
            >
              <div className="p-8 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-violet-600/20 rounded-lg">
                    <Plus className="text-violet-500" size={20} />
                  </div>
                  <h2 className="text-xl font-bold text-slate-900 dark:text-white">Cadastrar Novo Produto</h2>
                </div>
                <button 
                  onClick={() => setIsAddProductModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500 hover:text-slate-900 dark:hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-8 space-y-6">
                <div className="grid grid-cols-2 gap-6">
                  <div className="col-span-2">
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Nome do Produto</label>
                    <div className="flex gap-3">
                      <div className="relative group">
                        <button 
                          className="p-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-violet-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                          title="Escolher Ícone"
                        >
                          {getProductIcon(newProductData.icon)}
                        </button>
                        <div className="absolute top-full left-0 mt-2 w-64 bg-light-sidebar dark:bg-dark-sidebar border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[110] p-2 hidden group-hover:grid grid-cols-4 gap-1">
                          {productIcons.map((item) => (
                            <button
                              key={item.name}
                              onClick={() => setNewProductData({ ...newProductData, icon: item.name })}
                              className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center justify-center ${newProductData.icon === item.name ? 'bg-violet-500/20 text-violet-500' : 'text-slate-400'}`}
                              title={item.label}
                            >
                              <item.icon size={18} />
                            </button>
                          ))}
                        </div>
                      </div>
                      <input 
                        type="text" 
                        placeholder="Ex: Google Ads Search"
                        value={newProductData.name || ''}
                        onChange={(e) => setNewProductData({ ...newProductData, name: e.target.value })}
                        className="flex-1 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Plataforma</label>
                    <select
                      value={newProductData.platform || ''}
                      onChange={(e) => setNewProductData({ ...newProductData, platform: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-violet-500 outline-none transition-all appearance-none"
                    >
                      {platformOptions.map(opt => (
                        <option key={opt} value={opt} className="bg-light-sidebar dark:bg-dark-input">{opt}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status Inicial</label>
                    <select
                      value={newProductData.status || ''}
                      onChange={(e) => setNewProductData({ ...newProductData, status: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-violet-500 outline-none transition-all appearance-none"
                    >
                      {campaignStatusOptions.map(opt => (
                        <option key={opt.label} value={opt.label} className="bg-light-sidebar dark:bg-dark-input">{opt.label}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Orçamento</label>
                    <input 
                      type="text" 
                      placeholder="Ex: R$ 5.000"
                      value={newProductData.budget || ''}
                      onChange={(e) => setNewProductData({ ...newProductData, budget: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">CPA/CAC</label>
                    <input 
                      type="text" 
                      placeholder="Ex: R$ 45,00"
                      value={newProductData.cac || ''}
                      onChange={(e) => setNewProductData({ ...newProductData, cac: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all"
                    />
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Forma de Pagamento</label>
                    <select
                      value={newProductData.paymentMethod || 'Cartão'}
                      onChange={(e) => {
                        const method = e.target.value as 'Cartão' | 'Boleto/pix';
                        setNewProductData({ 
                          ...newProductData, 
                          paymentMethod: method,
                          balance: method === 'Cartão' ? 'Limite Disponível' : 'R$ 0'
                        });
                      }}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-violet-500 outline-none transition-all appearance-none"
                    >
                      <option value="Cartão" className="bg-light-sidebar dark:bg-dark-input">Cartão (Automático)</option>
                      <option value="Boleto/pix" className="bg-light-sidebar dark:bg-dark-input">Boleto/pix (Manual)</option>
                    </select>
                  </div>

                  {newProductData.paymentMethod === 'Boleto/pix' && (
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Saldo Inicial</label>
                      <input 
                        type="text" 
                        placeholder="Ex: R$ 500"
                        value={newProductData.balance || ''}
                        onChange={(e) => setNewProductData({ ...newProductData, balance: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all"
                      />
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 pt-4">
                  <button 
                    onClick={() => setIsAddProductModalOpen(false)}
                    className="flex-1 px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-light-text dark:text-white font-bold rounded-xl transition-all border border-slate-200 dark:border-white/5"
                  >
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveNewProduct}
                    disabled={!newProductData.name}
                    className="flex-1 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
                  >
                    Cadastrar Produto
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Meeting Modal */}
      <AnimatePresence>
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10 custom-scrollbar">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMeetingModalOpen(false)}
              className="fixed inset-0 modal-overlay"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg modal-container overflow-hidden my-auto transition-colors duration-300"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/10 flex items-center justify-between">
                <h2 className="text-lg font-bold text-light-text dark:text-white">Adicionar Reunião</h2>
                <button 
                  onClick={() => setIsMeetingModalOpen(false)}
                  className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500 hover:text-light-text dark:hover:text-white transition-all"
                >
                  <X size={20} />
                </button>
              </div>
              <div className="p-6 space-y-4">
                <input 
                  type="text" 
                  placeholder="Título da Reunião"
                  value={meetingData.title}
                  onChange={(e) => setMeetingData({ ...meetingData, title: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-light-text dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all"
                />
                <input 
                  type="date" 
                  value={meetingData.date}
                  onChange={(e) => setMeetingData({ ...meetingData, date: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-light-text dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all"
                />
                <input 
                  type="text" 
                  placeholder="Participantes (separados por vírgula)"
                  value={meetingData.attendees}
                  onChange={(e) => setMeetingData({ ...meetingData, attendees: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-light-text dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all"
                />
                <textarea 
                  placeholder="Anotações e Próximas Ações"
                  value={meetingData.actions}
                  onChange={(e) => setMeetingData({ ...meetingData, actions: e.target.value })}
                  className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-light-text dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all min-h-[150px]"
                />
                <button 
                  onClick={handleSaveMeeting}
                  className="w-full px-6 py-3 bg-violet-600 hover:bg-violet-700 text-slate-900 dark:text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
                >
                  Salvar Reunião
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Add Partner Modal */}
      <AnimatePresence>
        {isAddPartnerModalOpen && (
          <div className="fixed inset-0 z-[150] overflow-y-auto p-4 flex justify-center items-start">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsAddPartnerModalOpen(false)}
              className="fixed inset-0 modal-overlay"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-xl modal-container overflow-hidden my-auto transition-colors"
            >
              <div className="p-8 border-b border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-4">
                    <div className="p-3 bg-violet-600/20 rounded-xl">
                      <Plus className="text-violet-500" size={24} />
                    </div>
                    <h2 className="text-2xl font-bold text-slate-900 dark:text-white">Adicionar Parceiro</h2>
                  </div>
                  <button 
                    onClick={() => setIsAddPartnerModalOpen(false)}
                    className="p-2 hover:bg-slate-100 dark:hover:bg-white/10 rounded-xl text-slate-500 transition-all"
                  >
                    <X size={20} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Vincular a Cliente Ativo</label>
                    <select 
                      value={newPartnerData.activeClientId || ''}
                      onChange={(e) => {
                        const selectedClient = clients.find(c => c.id === e.target.value);
                        setNewPartnerData({ 
                          ...newPartnerData, 
                          activeClientId: e.target.value,
                          partner: selectedClient ? selectedClient.name : ''
                        });
                      }}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-violet-500 transition-all appearance-none"
                    >
                      <option value="">Selecione um cliente...</option>
                      {clients.map(client => (
                        <option key={client.id} value={client.id}>{client.name}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-[10px] text-slate-500 italic">* Vincule este parceiro a um registro da página de Clientes Ativos.</p>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status Inicial</label>
                      <select 
                        value={newPartnerData.status}
                        onChange={(e) => setNewPartnerData({ ...newPartnerData, status: e.target.value as any })}
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-violet-500 transition-all appearance-none"
                      >
                        <option value="Operacional">Operacional</option>
                        <option value="Gargalo">Gargalo</option>
                        <option value="Pausado">Pausado</option>
                      </select>
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Responsável</label>
                      <select 
                        value={newPartnerData.responsible}
                        onChange={(e) => setNewPartnerData({ ...newPartnerData, responsible: e.target.value })}
                        className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-violet-500 transition-all appearance-none"
                      >
                        <option value="Lucas Lima">Lucas Lima</option>
                        <option value="Ana Souza">Ana Souza</option>
                        <option value="Pedro Rocha">Pedro Rocha</option>
                        <option value="Mariana Costa">Mariana Costa</option>
                      </select>
                    </div>
                  </div>
                  
                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setIsAddPartnerModalOpen(false)}
                      className="flex-1 px-6 py-3 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-900 dark:text-white font-bold rounded-xl transition-all border border-slate-200 dark:border-white/5"
                    >
                      Cancelar
                    </button>
                    <button 
                      onClick={handleSaveNewPartner}
                      disabled={!newPartnerData.partner}
                      className="flex-1 px-6 py-3 bg-violet-600 hover:bg-violet-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20"
                    >
                      Criar Parceiro
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Header */}
      <header className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
              Projetos & <span className="text-violet-500">Parceiros</span>
            </h1>
            <p className="text-slate-500 text-sm">Gerenciamento centralizado de contas, performance e gargalos operacionais.</p>
          </div>
          <button 
            onClick={() => setIsAddPartnerModalOpen(true)}
            className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2"
          >
            <Plus size={20} />
            Adicionar Parceiro
          </button>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        {dynamicStats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-dark-card/60 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-3xl p-6 shadow-xl transition-all group">
            <div className="flex items-center justify-between mb-4">
              <div className={`p-3 rounded-xl ${stat.bg}`}>
                <stat.icon size={20} className={stat.color} />
              </div>
              <ArrowUpRight size={16} className="text-slate-400 group-hover:text-violet-500 transition-colors" />
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">{stat.label}</p>
            <h3 className="text-3xl font-bold text-slate-900 dark:text-white">{stat.value}</h3>
          </div>
        ))}
      </div>

      {/* Filters */}
      <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-white/10 mb-6 flex flex-wrap items-center gap-4 shadow-sm transition-colors">
        <div className="flex-1 min-w-[240px] relative">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
          <input 
            type="text" 
            placeholder="Buscar parceiro ou produto..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm text-light-text dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/20 transition-all"
          />
        </div>
        
        <div className="flex items-center gap-3">
          <div className="relative">
            <select 
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none bg-slate-100 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-4 pr-10 text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
            >
              <option className="bg-dark-input">Todos os Status</option>
              <option className="bg-dark-input">Operacional</option>
              <option className="bg-dark-input">Gargalo</option>
              <option className="bg-dark-input">Pausado</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
          </div>

          <div className="relative">
            <select 
              value={resultFilter}
              onChange={(e) => setResultFilter(e.target.value)}
              className="appearance-none bg-slate-100 dark:bg-white/5 backdrop-blur-md border border-slate-200 dark:border-white/10 rounded-2xl py-3 pl-4 pr-10 text-sm text-slate-700 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20 transition-all cursor-pointer"
            >
              <option className="bg-dark-input">Todos os Resultados</option>
              <option className="bg-dark-input">RESULTADO BOM</option>
              <option className="bg-dark-input">RESULTADO OK</option>
              <option className="bg-dark-input">RESULTADO RUIM</option>
              <option className="bg-dark-input">Sem Resultado</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none" size={16} />
          </div>
        </div>
      </div>

      {/* Containers por grupo */}
      <div className="space-y-6">
        {Object.entries(groupedProjects).map(([groupName, projectsInGroup]) => (
          <div key={groupName} className="bg-white dark:bg-dark-card/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10 overflow-hidden shadow-xl transition-colors duration-300">
            <div 
              className="px-6 py-4 bg-transparent cursor-pointer flex items-center justify-between relative z-10"
              onClick={() => toggleGroup(groupName)}
            >
              <div className="flex items-center gap-3">
                <ChevronDown size={16} className={`text-slate-400 transition-transform ${expandedGroups[groupName] ? '' : '-rotate-90'}`} />
                <div className={`flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  groupName === 'Grupo 1' ? 'bg-blue-500/10 text-blue-500' :
                  groupName === 'Grupo 2' ? 'bg-emerald-500/10 text-emerald-500' :
                  groupName === 'Quarentena' ? 'bg-rose-500/10 text-rose-500' :
                  'bg-slate-500/10 text-slate-400'
                }`}>
                  <Users size={14} />
                  {groupName} ({projectsInGroup.length})
                </div>
              </div>
            </div>
            
            {expandedGroups[groupName] && (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 bg-transparent">
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-10"></th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Parceiro</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Produto Ativo</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Resultado</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Investimento Mensal</th>
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {projectsInGroup.map((project) => (
                    <React.Fragment key={project.id}>
                      <tr 
                        className={`border-b border-slate-200 dark:border-white/5 transition-colors group ${
                          project.status === 'Gargalo' ? 'bg-rose-500/5' : ''
                        }`}
                      >
                    <td className="px-6 py-5">
                      <button 
                        onClick={(e) => toggleRow(project.id, e)}
                        className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all ${
                          expandedRowId === project.id ? 'rotate-90 text-violet-500' : 'text-slate-500'
                        }`}
                      >
                        <ChevronRight size={18} />
                      </button>
                    </td>
                    <td className="px-6 py-5" onClick={(e) => toggleRow(project.id, e)}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        <div className={`w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold ${
                          project.status === 'Gargalo' ? 'bg-rose-500/20 text-rose-500' : 'bg-violet-500/20 text-violet-500'
                        }`}>
                          {project.partner.charAt(0)}
                        </div>
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-400 transition-colors">{project.partner}</p>
                          <p className="text-[10px] text-slate-500 font-medium">{project.responsible}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => handleRowClick(project)}>
                      <p className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">{project.product}</p>
                    </td>
                    <td className="px-6 py-5" onClick={() => handleRowClick(project)}>
                      <div className="cursor-pointer">
                        {getResultBadge(project.projectResult)}
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => handleRowClick(project)}>
                      <div className="cursor-pointer">
                        {getStatusBadge(project.status)}
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={() => handleRowClick(project)}>
                      <p className="text-sm text-slate-600 dark:text-slate-300 cursor-pointer">{project.investment}</p>
                    </td>
                    <td className="px-6 py-5 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            handleRowClick(project);
                          }}
                          className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-light-text dark:hover:text-white transition-all"
                        >
                          <Eye size={16} />
                        </button>
                        <div className="relative">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenProjectMenuId(openProjectMenuId === project.id ? null : project.id);
                            }}
                            className="p-2 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-light-text dark:hover:text-white transition-all"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openProjectMenuId === project.id && (
                            <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-white/10 z-10">
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.id);
                                  setOpenProjectMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 rounded-xl"
                              >
                                Excluir Projeto
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </tr>
                  
                  {/* Expanded Row */}
                  <AnimatePresence>
                    {expandedRowId === project.id && (
                      <tr>
                        <td colSpan={7} className="p-0 border-b border-slate-200 dark:border-white/5">
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.3, ease: 'easeInOut' }}
                            className="overflow-hidden bg-transparent"
                          >
                            <div className="p-8">
                              <div className="flex items-center justify-between mb-6">
                                <div className="flex items-center gap-2">
                                  <div className="w-1.5 h-6 bg-violet-600 rounded-full"></div>
                                  <h4 className="text-sm font-bold text-light-text dark:text-white uppercase tracking-widest">Produtos do Parceiro</h4>
                                  <span className="ml-2 px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500 text-[10px] font-bold">
                                    {project.products?.length || 0}
                                  </span>
                                </div>
                              </div>

                              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                {/* Add Product Card */}
                                <button 
                                  onClick={() => handleOpenAddProduct(project.id)}
                                  className="group relative flex flex-col items-center justify-center gap-3 p-8 rounded-2xl border-2 border-dashed border-slate-200 dark:border-white/5 hover:border-violet-500/30 hover:bg-violet-500/5 transition-all min-h-[200px]"
                                >
                                  <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 group-hover:bg-violet-600 flex items-center justify-center transition-all">
                                    <Plus size={24} className="text-slate-400 group-hover:text-white" />
                                  </div>
                                  <p className="text-sm font-bold text-slate-500 group-hover:text-light-text dark:group-hover:text-white transition-colors">Adicionar Novo Produto</p>
                                </button>

                                {/* Product Cards */}
                                {project.products?.map((prod) => (
                                  <div 
                                    key={prod.id} 
                                    onClick={() => handleProductClick(prod)}
                                    className="bg-dark-card backdrop-blur-md rounded-2xl border border-violet-500/10 p-6 shadow-xl relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-violet-500/5 before:to-transparent before:opacity-50 before:pointer-events-none transition-all cursor-pointer group/prod"
                                  >
                                    <div className="flex items-center justify-between mb-6">
                                      <div className="flex items-center gap-3">
                                        <div className="p-2 bg-violet-600/20 rounded-lg">
                                          <div className="text-violet-500">
                                            {getProductIcon(prod.icon)}
                                          </div>
                                        </div>
                                        <h5 className="font-bold text-slate-900 dark:text-white">{prod.name}</h5>
                                      </div>
                                      <button className="text-slate-500 hover:text-light-text dark:hover:text-white transition-colors">
                                        <MoreHorizontal size={18} />
                                      </button>
                                    </div>

                                    <div className="flex items-center justify-between mb-4">
                                      <span className={`px-3 py-1 ${(getCampaignStatusColor(prod.status) || '').replace('text-', 'bg-')}/20 ${getCampaignStatusColor(prod.status)} text-[10px] font-bold rounded-full`}>
                                        {prod.status}
                                      </span>
                                      {prod.projectResult && (
                                        <span className={`px-3 py-1 ${
                                          projectResults.find(r => r.label === prod.projectResult)?.color || 'bg-slate-500'
                                        } text-white text-[10px] font-bold rounded-full`}>
                                          {prod.projectResult}
                                        </span>
                                      )}
                                    </div>

                                    <div className="grid grid-cols-3 gap-3">
                                      <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm transition-all hover:border-violet-500/20">
                                        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">Investimento Mensal</p>
                                        <p className="text-sm font-bold text-slate-900">{prod.budget}</p>
                                      </div>
                                      <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm transition-all hover:border-violet-500/20">
                                        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">CPA</p>
                                        <p className="text-sm font-bold text-emerald-700">{prod.cpa}</p>
                                      </div>
                                      <div className="p-3 rounded-2xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm transition-all hover:border-violet-500/20">
                                        <p className="text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">CAC</p>
                                        <p className="text-sm font-bold text-emerald-700">{prod.cac}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
            </tbody>
          </table>
        </div>
        )}
      </div>
    ))}
  </div>
        <div className="p-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Mostrando 5 de 24 parceiros ativos</p>
        </div>

      {/* Project Modal Simulation */}
      {selectedProject && (
        <Modal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false);
            setIsEditing(false);
          }}
          title={selectedProject.partner || 'Detalhes do Projeto'}
          maxWidth="max-w-6xl"
        >
        <div className="flex flex-col h-full">
          {/* Tabs */}
          <div className="flex items-center gap-6 mb-6 border-b modal-divider shrink-0">
            {(['resultado', 'reunioes', 'comentarios', 'analise', 'arquivos', 'roteiros'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveProjectTab(tab as any)}
                className={`pb-4 text-sm font-bold transition-all ${
                  activeProjectTab === tab
                    ? 'modal-tab-active'
                    : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab === 'resultado' ? 'Resultado do projeto' : tab === 'reunioes' ? 'Reuniões' : tab === 'arquivos' ? 'Arquivos do projeto' : tab === 'roteiros' ? 'Roteiros' : tab === 'comentarios' ? 'Comentários' : 'Análise de Leads'}
              </button>
            ))}
          </div>

          {/* Content based on active tab */}
          <div className="flex-1 overflow-y-auto">
            {activeProjectTab === 'resultado' && (
                  <>
                    <div className="space-y-8">
                      <div className="flex items-center gap-4 p-6 bg-slate-50 dark:bg-dark-card/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10">
                        <div className="w-16 h-16 rounded-2xl bg-violet-600 flex items-center justify-center text-2xl font-bold text-slate-900 dark:text-white">
                          {selectedProject.partner.charAt(0)}
                        </div>
                        <div>
                          <h3 className="text-lg font-bold text-slate-900 dark:text-white">{selectedProject.partner}</h3>
                          <p className="text-sm text-slate-500">{selectedProject.product}</p>
                        </div>
                      </div>
                    </div>

                    {/* Status and Result Cards */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-8 items-start">
                      <div className="p-6 bg-slate-50 dark:bg-dark-card/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Status do Projeto</p>
                        {getStatusBadge(selectedProject.status)}
                      </div>
                      {/* Resultado do Projeto — select nativo */}
                      <div className="p-6 bg-slate-50 dark:bg-dark-card/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/10">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Resultado do Projeto</p>
                        <div className="flex items-center gap-2">
                          <div className={`w-2 h-2 rounded-full flex-shrink-0 ${projectResults.find(r => r.label === selectedProject.projectResult)?.color || 'bg-slate-500'}`} />
                          <select
                            value={selectedProject.projectResult || ''}
                            onChange={(e) => handleUpdateProjectResult(e.target.value)}
                            className="text-sm font-bold text-slate-900 dark:text-white bg-transparent outline-none cursor-pointer border-none appearance-none w-full"
                          >
                            <option value="">Sem resultado</option>
                            {projectResults.map((res) => (
                              <option key={res.label} value={res.label}>{res.label}</option>
                            ))}
                          </select>
                        </div>
                      </div>
                    </div>

                    {/* Product Previews */}
                    {selectedProject.products && selectedProject.products.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                        {selectedProject.products.map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => handleProductClick(prod)}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 hover:border-violet-500/30 hover:bg-violet-500/5 cursor-pointer transition-all group"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-gradient-to-br from-violet-600/30 to-violet-900/20 border border-violet-500/20 text-violet-500 flex-shrink-0">
                              {getProductIcon(prod.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-violet-400 transition-colors">{prod.name}</p>
                              <span className={`inline-block mt-0.5 px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-200/70 dark:bg-white/10 text-slate-500 dark:text-slate-400`}>{prod.status}</span>
                            </div>
                            <p className="text-sm font-bold text-emerald-500 flex-shrink-0">{prod.budget}</p>
                          </div>
                        ))}
                      </div>
                    )}

                    {isEditing ? (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="p-4 bg-slate-100 dark:bg-dark-input rounded-xl border border-slate-200 dark:border-white/5">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Status Atual</p>
                          {getStatusBadge(selectedProject.status)}
                        </div>
                        <div className="p-4 bg-slate-100 dark:bg-dark-input rounded-xl border border-slate-200 dark:border-white/5 relative">
                          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Resultado do Projeto</p>
                          <button 
                            onClick={() => setIsProjectResultDropdownOpen(!isProjectResultDropdownOpen)}
                            className="flex items-center justify-between w-full px-4 py-2 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-light-text dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                          >
                            <div className="flex items-center gap-2">
                              <div className={`w-2 h-2 rounded-full ${projectResults.find(r => r.label === selectedProject.projectResult)?.color || 'bg-slate-500'}`} />
                              {selectedProject.projectResult || 'Selecionar Resultado'}
                            </div>
                            <ChevronDown size={16} className={`text-slate-500 transition-transform ${isProjectResultDropdownOpen ? 'rotate-180' : ''}`} />
                          </button>

                          <AnimatePresence>
                            {isProjectResultDropdownOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 mt-2 w-full bg-light-sidebar dark:bg-dark-sidebar border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-50 overflow-hidden"
                              >
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                  {projectResults.map((res) => (
                                    <button
                                      key={res.label}
                                      onClick={() => handleUpdateProjectResult(res.label)}
                                      className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-100 dark:hover:bg-white/5 ${
                                        selectedProject.projectResult === res.label ? 'bg-violet-500/10 text-light-text dark:text-white' : 'text-slate-400'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3">
                                        <div className={`w-2 h-2 rounded-full ${res.color}`} />
                                        {res.label}
                                      </div>
                                      {selectedProject.projectResult === res.label && <Check size={14} className="text-violet-500" />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>
                    ) : null}
                  </>
                )}
                
                {activeProjectTab === 'resultado' && (
                  <div className="space-y-4 mt-8">
                    <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Informações Gerais</h4>
                    <div className="space-y-3">
                      {/* Responsável — dropdown com gestores de tráfego */}
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-card/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3 text-slate-400">
                          <User size={16} />
                          <span className="text-sm">Responsável</span>
                        </div>
                        <div className="relative">
                          {/* Trigger button */}
                          <button
                            ref={responsavelBtnRef}
                            onClick={() => {
                              if (!showResponsavelDropdown && responsavelBtnRef.current) {
                                const rect = responsavelBtnRef.current.getBoundingClientRect();
                                setResponsavelDropdownPos({
                                  top: rect.bottom + 6,
                                  right: window.innerWidth - rect.right,
                                });
                              }
                              setShowResponsavelDropdown(!showResponsavelDropdown);
                            }}
                            className="flex items-center gap-2 hover:opacity-80 transition-opacity"
                          >
                            {(() => {
                              const gestor = gestores.find(g => g.name === selectedProject.responsible);
                              return gestor?.picture ? (
                                <img src={gestor.picture} alt={gestor.name} className="w-6 h-6 rounded-full object-cover border border-white/20" />
                              ) : selectedProject.responsible ? (
                                <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-[10px] font-black">
                                  {selectedProject.responsible.charAt(0)}
                                </div>
                              ) : null;
                            })()}
                            <span className="text-sm font-bold text-slate-900 dark:text-white">
                              {selectedProject.responsible || 'Selecionar...'}
                            </span>
                            <svg width={12} height={12} viewBox="0 0 12 12" fill="none" className="text-slate-400">
                              <path d="M2 4l4 4 4-4" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                          </button>

                          {/* Dropdown — renderizado via portal para escapar do overflow:hidden do modal */}
                          {showResponsavelDropdown && ReactDOM.createPortal(
                            <>
                              {/* Overlay to close */}
                              <div className="fixed inset-0 z-[9998]" onClick={() => setShowResponsavelDropdown(false)} />
                              <div
                                className="fixed z-[9999] w-[320px] bg-[#0f1119] border border-white/10 rounded-2xl shadow-2xl overflow-hidden"
                                style={{ top: responsavelDropdownPos.top, right: responsavelDropdownPos.right }}
                              >
                                <div className="px-4 py-3 border-b border-white/5 flex items-center gap-2">
                                  <div className="w-1.5 h-1.5 rounded-full bg-violet-500" />
                                  <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Gestores de Tráfego</span>
                                </div>
                                {gestores.length === 0 ? (
                                  <div className="px-4 py-3 text-xs text-slate-500">Nenhum gestor encontrado</div>
                                ) : (
                                   <div className="py-2 space-y-1">
                                    {gestores.map(g => (
                                      <button
                                        key={g.id}
                                        onClick={() => {
                                          const updated = { ...selectedProject, responsible: g.name };
                                          setSelectedProject(updated);
                                          const updatedProjects = projects.map(p => p.id === selectedProject.id ? updated : p);
                                          setProjects(updatedProjects);
                                          saveProjects(updatedProjects);
                                          setShowResponsavelDropdown(false);
                                        }}
                                        className={`w-full flex items-center gap-4 px-4 py-3 hover:bg-white/5 transition-all text-left rounded-xl mx-2 ${
                                          selectedProject.responsible === g.name ? 'bg-violet-500/10 border border-violet-500/20' : 'border border-transparent'
                                        }`}
                                        style={{ width: 'calc(100% - 16px)' }}
                                      >
                                        {/* Avatar grande */}
                                        {g.picture ? (
                                          <img
                                            src={g.picture}
                                            alt={g.name || ''}
                                            className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                                            style={{ border: `2px solid ${selectedProject.responsible === g.name ? '#7c3aed' : 'rgba(255,255,255,0.1)'}` }}
                                          />
                                        ) : (
                                          <div className="w-12 h-12 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-400 text-lg font-black flex-shrink-0">
                                            {(g.name || '?').charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                          <p className="text-sm font-bold text-white truncate">{g.name || '—'}</p>
                                          <p className="text-xs text-slate-500 truncate mt-0.5">{g.email || ''}</p>
                                          <span className="inline-flex items-center mt-1 text-[9px] font-bold text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded-full uppercase tracking-wide">Gestor de Tráfego</span>
                                        </div>
                                        {/* Checkmark */}
                                        {selectedProject.responsible === g.name && (
                                          <div className="w-6 h-6 rounded-full bg-violet-500 flex items-center justify-center flex-shrink-0">
                                            <svg width={12} height={12} viewBox="0 0 14 14" fill="none">
                                              <path d="M2 7l3.5 3.5L12 3" stroke="white" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
                                            </svg>
                                          </div>
                                        )}
                                      </button>
                                    ))}
                                  </div>

                                )}
                              </div>
                            </>,
                            document.body
                          )}
                        </div>
                      </div>

                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-card/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3 text-slate-500">
                          <DollarSign size={16} />
                          <span className="text-sm">Investimento Mensal</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedProject.investment}</span>
                      </div>
                      <div className="flex items-center justify-between p-4 bg-slate-50 dark:bg-dark-card/60 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10">
                        <div className="flex items-center gap-3 text-slate-500">
                          <Calendar size={16} />
                          <span className="text-sm">Última Atualização</span>
                        </div>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">
                          {timelineItems.length > 0
                            ? (() => {
                                const d = new Date(timelineItems[0].createdAt);
                                return isNaN(d.getTime())
                                  ? selectedProject.lastUpdate
                                  : `${d.toLocaleDateString('pt-BR')} às ${d.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}`;
                              })()
                            : selectedProject.lastUpdate || '—'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}

                {activeProjectTab === 'resultado' && (
                  <div className="space-y-4 mt-8">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Histórico Consolidado</h4>
                    </div>
                    
                    {/* Timeline */}
                    <div className="relative max-h-[900px] overflow-y-auto custom-scrollbar pr-2">
                      <div className="relative space-y-12 py-4">
                        {/* Vertical Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                        {timelineItems.map((opt, idx) => (
                          <div key={opt.id} className="relative flex items-center justify-center">
                            {/* Timeline Dot */}
                            <div className="absolute left-1/2 -translate-x-1/2 z-10">
                              <div className="w-8 h-8 rounded-full bg-white dark:bg-dark-card border border-violet-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                <Check size={14} className="text-violet-500" />
                              </div>
                            </div>

                            {/* Card */}
                            <div className={`w-[40%] p-5 rounded-2xl border transition-all bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-violet-500/20 ${idx % 2 === 0 ? 'mr-auto text-left' : 'ml-auto text-left'}`}>
                              {opt.type === 'meeting' ? (
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 flex flex-col items-center justify-center bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
                                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">{new Date(opt.rawDate).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                      <span className="text-lg font-bold text-violet-800 dark:text-violet-200">{new Date(opt.rawDate).getDate()}</span>
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{opt.message.split('\n')[0]}</h4>
                                      <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Users size={12} />
                                        <span>{opt.attendees}</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(opt.createdAt).toLocaleDateString('pt-BR')} às {new Date(opt.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                  <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Próximas Ações / Acordos:</p>
                                    <div className="space-y-1">
                                      {opt.actions.split(',').map((action, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                          <Check size={12} className="text-green-500" />
                                          {action.trim()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                              ) : (
                                <>
                                  <div className="flex items-center justify-between mb-3">
                                    <div className="flex items-center gap-2">
                                      {opt.authorPhoto ? (
                                        <img src={opt.authorPhoto} alt={opt.author} className="w-6 h-6 rounded-full object-cover" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-6 h-6 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-500 text-xs font-bold">
                                          {opt.author.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <p className="text-sm font-bold text-slate-900 dark:text-white">
                                        {opt.author} <span className="text-slate-500 font-medium">({opt.role})</span>
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[10px] text-slate-500 font-medium">{opt.date} {opt.time && `às ${opt.time}`}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">{opt.productName}</p>
                                    <span className="px-2 py-0.5 text-[10px] font-bold text-violet-700 bg-violet-100 dark:bg-violet-900/30 rounded-full uppercase">MUDANÇA DE MÉTRICAS</span>
                                  </div>
                                  <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed whitespace-pre-line">
                                    {opt.message}
                                  </p>
                                </>
                              )}

                              {opt.images && opt.images.length > 0 && (
                                <div className="mt-3 flex flex-wrap gap-2">
                                  {opt.images.map((img, i) => (
                                    <img 
                                      key={i} 
                                      src={img} 
                                      alt="Nota" 
                                      className="w-20 h-20 object-cover rounded-lg cursor-pointer hover:opacity-80 transition-opacity" 
                                      referrerPolicy="no-referrer" 
                                      onClick={() => setPreviewImage(img)}
                                    />
                                  ))}
                                </div>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      {(!selectedProject.products || selectedProject.products.flatMap(p => p.optimizations || []).length === 0) && (
                        <p className="text-xs text-slate-500 italic text-center mt-4">Nenhum histórico disponível.</p>
                      )}
                    </div>
                  </div>
                )}
                
                {activeProjectTab === 'reunioes' && (
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Reuniões</h4>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => setIsMeetingModalOpen(true)}
                          className="px-3 py-1.5 text-[10px] font-bold text-slate-900 dark:text-white bg-violet-600 hover:bg-violet-700 rounded-lg transition-all"
                        >
                          Nova Reunião
                        </button>
                      </div>
                    </div>
                    
                    {/* Timeline */}
                    <div className="relative pr-2">
                      <div className="relative space-y-12 py-4">
                        {/* Vertical Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                        {timelineItems.filter(opt => opt.type === 'meeting').map((opt, idx) => (
                          <div key={opt.id} className="relative flex items-center justify-center">
                            {/* Timeline Dot */}
                            <div className="absolute left-1/2 -translate-x-1/2 z-10">
                              <div className="w-8 h-8 rounded-full bg-light-card dark:bg-dark-card border border-violet-500/50 flex items-center justify-center shadow-[0_0_15px_rgba(139,92,246,0.3)]">
                                <Check size={14} className="text-violet-500" />
                              </div>
                            </div>

                            {/* Card */}
                            <div className={`w-[40%] p-5 rounded-2xl border transition-all bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-violet-500/20 ${idx % 2 === 0 ? 'mr-auto text-left' : 'ml-auto text-left'}`}>
                                <div className="flex flex-col gap-3">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 flex flex-col items-center justify-center bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
                                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">{new Date(opt.rawDate).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                      <span className="text-lg font-bold text-violet-800 dark:text-violet-200">{new Date(opt.rawDate).getDate()}</span>
                                    </div>
                                    <div className="flex-1">
                                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{opt.message.split('\n')[0]}</h4>
                                      <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Users size={12} />
                                        <span>{opt.attendees}</span>
                                      </div>
                                    </div>
                                    <div className="text-[10px] text-slate-400">
                                      {new Date(opt.createdAt).toLocaleDateString('pt-BR')} às {new Date(opt.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                    </div>
                                  </div>
                                  <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Próximas Ações / Acordos:</p>
                                    <div className="space-y-1">
                                      {opt.actions.split(',').map((action, i) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                          <Check size={12} className="text-green-500" />
                                          {action.trim()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </div>
                            </div>
                          </div>
                        ))}
                      </div>
                      {timelineItems.filter(opt => opt.type === 'meeting').length === 0 && (
                        <p className="text-xs text-slate-500 italic text-center mt-4">Nenhuma reunião registrada.</p>
                      )}
                    </div>
                  </div>
                )}
                
                {activeProjectTab === 'arquivos' && (
                  <div className="space-y-6">
                    <div className="flex items-center justify-between">
                      <h3 className="text-lg font-bold text-light-text dark:text-white">Documentos e Arquivos</h3>
                      <button 
                        onClick={() => fileInputRef.current?.click()}
                        className="flex items-center gap-2 px-4 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 border border-slate-200 dark:border-white/10 text-light-text dark:text-white rounded-xl text-sm font-bold transition-all"
                      >
                        <Upload size={16} />
                        Fazer Upload
                      </button>
                      <input 
                        type="file" 
                        ref={fileInputRef} 
                        onChange={handleFileChange} 
                        className="hidden" 
                      />
                    </div>

                    <div 
                      onDragOver={handleDragOver}
                      onDrop={handleDrop}
                      onClick={() => fileInputRef.current?.click()}
                      className="border-2 border-dashed border-slate-300 dark:border-white/10 rounded-2xl p-8 text-center bg-slate-50 dark:bg-white/5 backdrop-blur-md cursor-pointer hover:border-purple-500 transition-all relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-50 before:pointer-events-none"
                    >
                      <div className="flex flex-col items-center gap-3">
                        <div className="p-3 bg-white/5 rounded-full border border-white/10">
                          <Folder size={24} className="text-slate-400" />
                        </div>
                        <div>
                          <p className="text-sm font-bold text-light-text dark:text-white">Clique ou arraste arquivos para cá</p>
                          <p className="text-xs text-slate-500">Suporta PDF, DOCX, XLSX, imagens e vídeos (Máx 50MB)</p>
                        </div>
                      </div>
                    </div>

                    <div className="bg-slate-50 dark:bg-white/5 backdrop-blur-md rounded-2xl border border-slate-200 dark:border-white/10 overflow-hidden relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:from-white/10 before:to-transparent before:opacity-50 before:pointer-events-none">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-100 dark:bg-white/5 text-slate-500 dark:text-slate-400 font-bold uppercase tracking-widest">
                          <tr>
                            <th className="px-6 py-4">Nome do Arquivo</th>
                            <th className="px-6 py-4">Data</th>
                            <th className="px-6 py-4">Tamanho</th>
                            <th className="px-6 py-4">Enviado por</th>
                            <th className="px-6 py-4 text-right">Ações</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-200 dark:divide-white/10 text-light-text dark:text-white">
                          {(selectedProject.files || []).map((file: any, index: number) => (
                            <tr key={index}>
                              <td className="px-6 py-4 flex items-center gap-3 font-bold">
                                <File size={16} className="text-purple-500" />
                                {file.name}
                              </td>
                              <td className="px-6 py-4 text-slate-400">{file.date}</td>
                              <td className="px-6 py-4 text-slate-400">{file.size}</td>
                              <td className="px-6 py-4">
                                <span className={`px-2 py-1 rounded-lg font-bold ${file.sender === 'Agência' ? 'bg-violet-500/10 text-violet-500' : 'bg-emerald-500/10 text-emerald-500'}`}>
                                  {file.sender}
                                </span>
                              </td>
                              <td className="px-6 py-4 text-right flex items-center justify-end gap-2 text-slate-500">
                                <button onClick={() => window.open(file.url, '_blank')} className="hover:text-violet-500"><Eye size={16} /></button>
                                <button onClick={() => {
                                  const a = document.createElement('a');
                                  a.href = file.url;
                                  a.download = file.name;
                                  a.click();
                                }} className="hover:text-violet-500"><Download size={16} /></button>
                                <button onClick={() => {
                                  const updatedProjects = projects.map(p => {
                                    if (p.id === selectedProject.id) {
                                      return {
                                        ...p,
                                        files: p.files?.filter((_, i) => i !== index)
                                      };
                                    }
                                    return p;
                                  });
                                  setProjects(updatedProjects);
                                  saveProjects(updatedProjects);
                                }} className="hover:text-rose-500"><Trash2 size={16} /></button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                )}

                {activeProjectTab === 'analise' && (
                  <div className="flex flex-col items-center justify-center py-20 gap-4 text-slate-400">
                    <div className="w-16 h-16 rounded-2xl bg-violet-500/10 flex items-center justify-center">
                      <BarChart3 size={32} className="text-violet-500/50" />
                    </div>
                    <div className="text-center">
                      <p className="text-sm font-bold text-slate-500">Análise de Leads</p>
                      <p className="text-xs text-slate-400 mt-1">Em breve.</p>
                    </div>
                  </div>
                )}

                {activeProjectTab === 'roteiros' && (
                  <div className="p-8 text-center text-slate-500">
                    Roteiros em breve.
                  </div>
                )}

                {activeProjectTab === 'comentarios' && (() => {
                  const allComments = projectComments[selectedProject.id] || [];
                  const filteredComments = commentFilter === 'all' ? allComments
                    : commentFilter === 'comment' ? allComments.filter(c => !c.isInternal)
                    : allComments.filter(c => c.isInternal);

                  const submitComment = async () => {
                    if (!newComment.trim()) return;
                    const body = {
                      author: userData?.name || 'Você',
                      author_photo: userData?.picture || auth.currentUser?.photoURL || null,
                      text: newComment.trim(),
                      is_internal: isInternalNote,
                    };
                    setNewComment('');
                    try {
                      const res = await fetch(`/api/project-comments/${encodeURIComponent(selectedProject.id)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify(body),
                      });
                      if (res.ok) {
                        const saved = await res.json();
                        const normalized = { id: saved.id, author: saved.author, authorPhoto: saved.author_photo, text: saved.text, createdAt: saved.created_at, isInternal: saved.is_internal };
                        setProjectComments(prev => ({ ...prev, [selectedProject.id]: [...(prev[selectedProject.id] || []), normalized] }));
                      }
                    } catch (err) {
                      console.error('Failed to save comment:', err);
                    }
                  };

                  return (
                    <div className="space-y-5">
                      {/* Header + Filter */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="w-1.5 h-5 bg-violet-600 rounded-full" />
                          <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Comentários</h4>
                          {allComments.length > 0 && (
                            <span className="px-2 py-0.5 rounded-md bg-violet-500/10 text-violet-500 text-[10px] font-bold">{allComments.length}</span>
                          )}
                        </div>
                        {/* Filter pills */}
                        <div className="flex items-center gap-1 p-1 bg-slate-100 dark:bg-white/5 rounded-xl">
                          {(['all', 'comment', 'internal'] as const).map((f) => (
                            <button
                              key={f}
                              onClick={() => setCommentFilter(f)}
                              className={`px-3 py-1 text-[10px] font-bold rounded-lg transition-all ${
                                commentFilter === f
                                  ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm'
                                  : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                              }`}
                            >
                              {f === 'all' ? 'Todos' : f === 'comment' ? 'Comentários' : '🔒 Internas'}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Feed */}
                      <div className="space-y-3">
                        {filteredComments.length === 0 && (
                          <div className="flex flex-col items-center gap-3 py-10 text-slate-400">
                            <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                              <MessageSquare size={22} className="text-slate-400" />
                            </div>
                            <p className="text-sm">
                              {commentFilter === 'internal' ? 'Nenhuma nota interna.' : commentFilter === 'comment' ? 'Nenhum comentário.' : 'Nenhum comentário ainda.'}
                            </p>
                          </div>
                        )}
                        {filteredComments.map((c) => (
                          <div
                            key={c.id}
                            className={`group flex gap-3 p-4 rounded-2xl border transition-all ${
                              c.isInternal
                                ? 'bg-amber-950/20 border-amber-500/30 hover:border-amber-500/50'
                                : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 hover:border-violet-500/20'
                            }`}
                          >
                            <div className="flex-shrink-0">
                              {c.authorPhoto ? (
                                <img src={c.authorPhoto} alt={c.author} className="w-8 h-8 rounded-full object-cover" referrerPolicy="no-referrer" />
                              ) : (
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                  c.isInternal ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-500'
                                }`}>
                                  {c.author.charAt(0).toUpperCase()}
                                </div>
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center gap-2 mb-1">
                                <span className={`text-sm font-bold ${c.isInternal ? 'text-amber-400' : 'text-slate-900 dark:text-white'}`}>{c.author}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(c.createdAt).toLocaleDateString('pt-BR')} às {new Date(c.createdAt).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                </span>
                              </div>
                              {c.isInternal && (
                                <span className="inline-block mb-2 text-[10px] font-bold text-amber-400 uppercase tracking-wider">🔒 Nota Interna</span>
                              )}
                              <p className={`text-sm leading-relaxed whitespace-pre-wrap ${c.isInternal ? 'text-amber-100/80' : 'text-slate-600 dark:text-slate-300'}`}>{c.text}</p>
                            </div>
                            <button
                              onClick={async () => {
                                // Optimistic UI
                                setProjectComments(prev => ({ ...prev, [selectedProject.id]: allComments.filter(x => x.id !== c.id) }));
                                try { await fetch(`/api/project-comments/${c.id}`, { method: 'DELETE' }); } catch(e) {}
                              }}
                              className="flex-shrink-0 text-slate-400 hover:text-rose-500 transition-colors opacity-0 group-hover:opacity-100 self-start mt-0.5"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                      </div>

                      {/* Input */}
                      <div className={`rounded-2xl border transition-all ${
                        isInternalNote
                          ? 'bg-amber-950/20 border-amber-500/30'
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10'
                      }`}>
                        <div className="flex gap-3 p-3">
                          <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ${
                            isInternalNote ? 'bg-amber-500/20 text-amber-400' : 'bg-violet-500/20 text-violet-500'
                          }`}>
                            {(userData?.name || 'U').charAt(0).toUpperCase()}
                          </div>
                          <textarea
                            value={newComment}
                            onChange={(e) => setNewComment(e.target.value)}
                            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); submitComment(); } }}
                            placeholder={isInternalNote ? '🔒 Nota interna (só visível para a equipe)...' : 'Escreva um comentário... (Enter para enviar)'}
                            rows={2}
                            className="flex-1 bg-transparent text-sm text-slate-900 dark:text-white placeholder-slate-400 resize-none outline-none"
                          />
                        </div>
                        {/* Footer do input */}
                        <div className={`flex items-center justify-between px-4 py-2.5 border-t ${
                          isInternalNote ? 'border-amber-500/20' : 'border-slate-200 dark:border-white/10'
                        }`}>
                          <button
                            onClick={() => setIsInternalNote(!isInternalNote)}
                            className={`flex items-center gap-2 text-xs font-bold transition-all ${
                              isInternalNote ? 'text-amber-400' : 'text-slate-400 hover:text-slate-600 dark:hover:text-white'
                            }`}
                          >
                            <div className={`w-4 h-4 rounded border-2 flex items-center justify-center transition-all ${
                              isInternalNote ? 'bg-amber-500 border-amber-500' : 'border-slate-400'
                            }`}>
                              {isInternalNote && <Check size={10} className="text-white" />}
                            </div>
                            Nota Interna
                          </button>
                          <button
                            onClick={submitComment}
                            className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all text-white ${
                              isInternalNote ? 'bg-amber-600 hover:bg-amber-700' : 'bg-violet-600 hover:bg-violet-700'
                            }`}
                          >
                            Enviar
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })()}
          </div>
        </div>
        </Modal>
      )}
      <Modal
        isOpen={!!projectToDelete}
        onClose={() => setProjectToDelete(null)}
        title="Confirmar exclusão"
        maxWidth="max-w-md"
        footer={
          <>
            <button 
              onClick={() => setProjectToDelete(null)}
              className={designSystem.button.secondary}
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDeleteProject}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Excluir
            </button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-300">
          Tem certeza que deseja excluir este projeto?
        </p>
      </Modal>
    </div>


    {/* Image Preview Modal */}
    <AnimatePresence>
      {previewImage && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setPreviewImage(null)}
            className="fixed inset-0 modal-overlay"
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
    </>
  );
};

export default ProjectsModule;
