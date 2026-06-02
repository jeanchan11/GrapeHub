
import React, { useState, useEffect, useRef, useMemo } from 'react';
import ReactDOM from 'react-dom';
import { auth, storage } from '../firebase';
import { Modal } from '../components/ui/Modal';
import { useAuth } from '../contexts/AuthContext';
import { useMenu } from '../context/MenuContext';
import { designSystem } from '../design-system';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { 
  Search, Filter, ChevronDown, MoreHorizontal, 
  AlertTriangle, CheckCircle2, PauseCircle, 
  ArrowUpRight, Users, TrendingUp,
  X, Calendar, User, Briefcase, DollarSign,
  Plus, ChevronRight, Target, Activity, 
  BarChart3, Wallet, MessageSquare, History,
  Globe, Layout, CreditCard, Check, Clock,
  Gavel, Scale, HeartPulse, ShieldCheck, 
  Hammer, Landmark, Banknote, ShoppingCart, 
  Home, Stethoscope, Building2, Image as ImageIcon,
  Folder, File, Eye, Download, Trash2, Upload, FileText, GripVertical, Copy, Loader2, Star, Lock, LockOpen, Bot, Edit2, ThumbsUp, SmilePlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import confetti from 'canvas-confetti';
import { DndContext, closestCenter, KeyboardSensor, PointerSensor, useSensor, useSensors, DragEndEvent } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

const DragHandleContext = React.createContext<any>(null);

// Smart title case: capitalizes first letter of each word,
// but keeps single letters and common connectors lowercase (except at start).
const LOWERCASE_WORDS = new Set(['de', 'da', 'do', 'das', 'dos', 'e', 'em', 'a', 'o', 'ao', 'aos', 'para', 'com', 'por', 'no', 'na', 'nos', 'nas', 'soc', 'indiv', 'ad', 'ltda', 'me', 'eireli']);
const toTitleCase = (str: string): string => {
  return str
    .toLowerCase()
    .split(/\s+/)
    .map((word, i) => {
      if (!word) return '';
      // Always capitalize the first word
      if (i === 0) return word.charAt(0).toUpperCase() + word.slice(1);
      // Single letters stay lowercase
      if (word.length === 1) return word;
      // Connectors stay lowercase
      if (LOWERCASE_WORDS.has(word)) return word;
      return word.charAt(0).toUpperCase() + word.slice(1);
    })
    .join(' ');
};

// Normalizes legacy payment method values to new labels
const normalizePaymentMethod = (v?: string): string => {
  if (!v) return 'Automático';
  if (v === 'Cartão') return 'Automático';
  if (v === 'Boleto/pix') return 'Manual';
  return v;
};

const formatCurrency = (val: string) => {
  if (!val) return '';
  const num = val.replace(/\D/g, '');
  if (!num) return '';
  const amount = parseInt(num, 10) / 100;
  return amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
};

const formatDateShort = (dateStr?: string) => {
  if (!dateStr) return '';
  const parts = dateStr.split('/');
  if (parts.length !== 3) return dateStr;
  const [day, month] = parts;
  const months = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
  const monthName = months[parseInt(month, 10) - 1];
  return `${monthName} ${parseInt(day, 10)}`;
};

const DragHandle = () => {
  const { attributes, listeners } = React.useContext(DragHandleContext);
  return (
    <div
      className="cursor-grab active:cursor-grabbing text-slate-300 dark:text-slate-600 hover:text-violet-500 transition-colors p-1"
      {...attributes}
      {...listeners}
      onClick={(e) => e.stopPropagation()}
    >
      <GripVertical size={16} />
    </div>
  );
};

const SortableRowWrapper = ({ id, children, className }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    ...(isDragging ? { position: 'relative' as any, zIndex: 99, opacity: 0.8 } : {})
  };

  return (
    <DragHandleContext.Provider value={{ attributes, listeners }}>
      <tr ref={setNodeRef} style={style} className={`${className} ${isDragging ? 'bg-slate-50 dark:bg-white/[0.05] shadow-xl border-t-2 border-violet-500' : ''}`}>
        {children}
      </tr>
    </DragHandleContext.Provider>
  );
};

export interface OptimizationReply {
  id: string;
  author: string;
  authorPhoto?: string;
  message: string;
  date: string;
  time: string;
}

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
  likes?: string[];
  productId?: string;
  replies?: OptimizationReply[];
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
  aiKeyword?: string;
  bottleneck: string;
  history: string;
  balance: string;
  paymentMethod?: 'Automático' | 'Manual';
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
  status: 'Rodando' | 'Operacional' | 'Gargalo' | 'Pausado';
  roi: string;
  investment: string;
  responsible: string;
  lastUpdate: string;
  products?: Product[];
  activeClientId?: string;
  page_id?: string;
  group?: string;
  projectResult?: string;
  sortOrder?: number;
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
        delivery: 'Full Time',
        aiService: 'Ativado',
        bottleneck: 'Nenhum',
        history: '3 alterações',
        balance: 'Limite Disponível',
        paymentMethod: 'Automático',
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
        paymentMethod: 'Manual',
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
        paymentMethod: 'Manual'
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
  modalOnly?: boolean;
}

const ProjectsModule: React.FC<Props> = ({ activePage, modalOnly }) => {
  const { userData } = useAuth();
  const { menu, refreshMenu } = useMenu();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('Todos os Status');
  const [resultFilter, setResultFilter] = useState('Todos os Resultados');
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isGroupModalOpen, setIsGroupModalOpen] = useState(false);
  const [groupModalProjectId, setGroupModalProjectId] = useState<string | null>(null);
  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [activeProductTab, setActiveProductTab] = useState<'resultado' | 'kpis'>('resultado');
  const [activeProjectTab, setActiveProjectTab] = useState<'resultado' | 'reunioes' | 'arquivos' | 'comentarios' | 'analise' | 'nps'>('resultado');
  const [npsResponses, setNpsResponses] = useState<any[]>([]);
  const [isNpsLoading, setIsNpsLoading] = useState(false);
  const [timelineFilter, setTimelineFilter] = useState('Todos');

  useEffect(() => {
    if (selectedProject && activeProjectTab === 'nps') {
      setIsNpsLoading(true);
      fetch(`/api/nps/${selectedProject.id}`)
        .then(res => res.json())
        .then(data => setNpsResponses(Array.isArray(data) ? data : []))
        .catch(console.error)
        .finally(() => setIsNpsLoading(false));
    }
  }, [selectedProject, activeProjectTab]);
  const [isEditing, setIsEditing] = useState(false);
  const [expandedRowId, setExpandedRowId] = useState<string | null>(null);
  const [activeProductsFilter, setActiveProductsFilter] = useState<'ativos' | 'inativos'>('ativos');
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
  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [newNote, setNewNote] = useState('');
  const [editingNoteId, setEditingNoteId] = useState<string | null>(null);
  const [editingNoteMessage, setEditingNoteMessage] = useState<string>('');
  const [replyingNoteId, setReplyingNoteId] = useState<string | null>(null);
  const [replyMessage, setReplyMessage] = useState<string>('');
  const [isInternal, setIsInternal] = useState(false);
  const [images, setImages] = useState<File[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);
  const [isEditingMetrics, setIsEditingMetrics] = useState(false);
  const [tempProduct, setTempProduct] = useState<Product | null>(null);
  const [isResultDropdownOpen, setIsResultDropdownOpen] = useState(false);
  const [isStatusDropdownOpen, setIsStatusDropdownOpen] = useState(false);
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
  const [openProductMenuId, setOpenProductMenuId] = useState<string | null>(null);
  const [productToDelete, setProductToDelete] = useState<string | null>(null);
  const [projectSortColumn, setProjectSortColumn] = useState<'partner' | 'projectResult' | 'status' | 'investment' | null>(null);
  const [projectSortDirection, setProjectSortDirection] = useState<'asc' | 'desc'>('asc');
  const [lockedGroups, setLockedGroups] = useState<Record<string, boolean>>({});
  const [projectResultFilter, setProjectResultFilter] = useState<string | null>(null);
  const [isResultFilterOpen, setIsResultFilterOpen] = useState(false);
  const [isPaymentMethodDropdownOpen, setIsPaymentMethodDropdownOpen] = useState(false);
  const [dragFromIndex, setDragFromIndex] = useState<{group: string, id: string} | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<{group: string, id: string} | null>(null);
  const [isAddProductModalOpen, setIsAddProductModalOpen] = useState(false);
  const [isIconDropdownOpen, setIsIconDropdownOpen] = useState(false);
  const [isAddPartnerModalOpen, setIsAddPartnerModalOpen] = useState(false);
  const [isGoalsModalOpen, setIsGoalsModalOpen] = useState(false);
  const [isMeetingModalOpen, setIsMeetingModalOpen] = useState(false);
  const [meetings, setMeetings] = useState<any[]>([]);
  const [meetingData, setMeetingData] = useState({ id: '', title: '', date: '', attendees: '', actions: '' });
  const [tempGoals, setTempGoals] = useState({ cpa: '', leads: '', cac: '', fechamentos: '' });
  const [activeProjectId, setActiveProjectId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [clients, setClients] = useState<{ id: string, name: string, status?: string }[]>([]);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const [filterPerson, setFilterPerson] = useState('Pessoa');
  const [filterType, setFilterType] = useState('Tipo');

  // Fetch gestores de tráfego para o dropdown de responsável
  useEffect(() => {
    fetch('/api/users')
      .then(r => r.json())
      .then((users: any[]) => {
        setGestores(users.filter(u => u.role === 'gestor-trafego' || u.role === 'gerente-operacional'));
      })
      .catch(console.error);
  }, []);

  const timelineItems = useMemo(() => {
    if (!selectedProject) return [];
    const optimizations = selectedProject.products?.flatMap(p => (p.optimizations || []).map(opt => ({ 
      ...opt, 
      productName: p.name, 
      productId: p.id,
      type: 'optimization',
      createdAt: opt.date.split('/').reverse().join('-') + (opt.time ? 'T' + opt.time : 'T00:00')
    }))) || [];
    const meetingItems = meetings.map(m => ({ 
      id: m.id, 
      author: userData?.name || 'Reunião', 
      authorPhoto: userData?.picture || auth.currentUser?.photoURL || '',
      role: 'Reunião',
      message: `${m.title}\nParticipantes: ${m.attendees}\nAções: ${m.actions}`,
      date: new Date(m.date).toLocaleDateString('pt-BR'),
      time: new Date(m.created_at || m.date).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      rawDate: m.date,
      createdAt: m.created_at || m.date,
      attendees: m.attendees,
      actions: m.actions,
      type: 'meeting',
      productName: 'Reunião',
      title: m.title,
      likes: m.likes || [],
      replies: m.replies || []
    }));
    return ([...optimizations, ...meetingItems] as any[]).sort((a: any, b: any) => {
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
            // Auto-recalculate project status based on product campaign statuses
            const correctedData = data.map((proj: any) => {
              if (proj.products && proj.products.length > 0) {
                const hasNonRodando = proj.products.some((p: any) => p.status && p.status !== 'Rodando' && p.status !== 'Inativo');
                return { ...proj, status: hasNonRodando ? 'Gargalo' : (proj.status === 'Gargalo' ? 'Rodando' : proj.status) };
              }
              return proj;
            });
            setProjects(correctedData);
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

  // Listen for global open project event
  useEffect(() => {
    const handleOpenProject = (e: Event) => {
      const customEvent = e as CustomEvent;
      const project = customEvent.detail;
      if (project && project.page_id === activePage) {
        setSelectedProject(project);
        setIsProjectModalOpen(true);
        setActiveProjectTab('resultado');
      }
    };
    window.addEventListener('OPEN_PROJECT_MODAL', handleOpenProject);
    return () => window.removeEventListener('OPEN_PROJECT_MODAL', handleOpenProject);
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
        headers: { 'Content-Type': 'application/json' },
        body: body,
        signal: controller.signal
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

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    // Find which group the dragged project belongs to and check if it's locked
    const draggedProject = projects.find(p => p.id === active.id);
    if (draggedProject) {
      const groupName = draggedProject.group || 'Sem Grupo';
      if (lockedGroups[groupName]) return; // Group is locked, block reordering
    }

    setProjectSortColumn(null);

    setProjects(prev => {
      const oldIndex = prev.findIndex(p => p.id === active.id);
      const newIndex = prev.findIndex(p => p.id === over.id);
      
      if (oldIndex < 0 || newIndex < 0) return prev;
      
      const newArray = arrayMove(prev, oldIndex, newIndex);
      const updated = newArray.map((p, i) => ({ ...p, sortOrder: i }));
      
      // Persist order
      fetch('/api/projects/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ projects: updated.map(p => ({ id: p.id, sort_order: p.sortOrder })) })
      }).catch(err => console.error('Failed to reorder projects:', err));
      
      return updated;
    });
  };

  const confirmDeleteProduct = async () => {
    if (!productToDelete) return;
    console.log(`[DELETE PRODUCT] Confirmando exclusão do produto: ${productToDelete}`);
    try {
      const response = await fetch(`/api/products/${productToDelete}`, { method: 'DELETE' });
      if (response.ok) {
        setProjects(prev => prev.map(p => ({
          ...p,
          products: p.products?.filter((prod: any) => prod.id !== productToDelete) || []
        })));
      } else {
        const errorText = await response.text();
        console.error(`[DELETE PRODUCT] Erro: ${response.status} - ${errorText}`);
        alert('Erro ao excluir produto');
      }
    } catch (err) {
      console.error('Failed to delete product:', err);
      alert('Erro ao excluir produto');
    } finally {
      setProductToDelete(null);
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
    delivery: 'Full Time',
    balance: 'Limite Disponível',
    paymentMethod: 'Automático',
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
    { label: 'Rodando', value: projectsList.filter(p => p.status === 'Operacional' || p.status === 'Rodando').length.toString(), icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
    { label: 'Pausados', value: projectsList.filter(p => p.status === 'Pausado').length.toString(), icon: PauseCircle, color: 'text-slate-500', bg: 'bg-slate-500/10' },
    { label: 'Gargalo', value: projectsList.filter(p => p.status === 'Gargalo').length.toString(), icon: AlertTriangle, color: 'text-rose-500', bg: 'bg-rose-500/10' },
    { label: 'Investimento Total', value: `R$ ${projectsList.reduce((acc, p) => acc + parseCurrency(p.investment || '0'), 0).toLocaleString('pt-BR')}`, icon: DollarSign, color: 'text-violet-500', bg: 'bg-violet-500/10' },
  ];

  const filteredProjects = projects.map(project => {
    // Resolve partner name dynamically from clients list when linked
    const clientsMap = new Map(clients.map(c => [c.id, c.name]));
    const resolvedPartner = project.activeClientId
      ? (clientsMap.get(project.activeClientId) ?? project.partner)
      : project.partner;
    const projectWithResolvedPartner = { ...project, partner: resolvedPartner };

    if (projectWithResolvedPartner.products && projectWithResolvedPartner.products.length > 0) {
      const productNames = projectWithResolvedPartner.products.map(p => p.name).join(', ');
      
      let derivedStatus: Project['status'] = 'Rodando';
      const activeProducts = projectWithResolvedPartner.products.filter(p => p.status !== 'Inativo');
      const productStatuses = activeProducts.map(p => p.status);
      
      if (productStatuses.length > 0 && productStatuses.some(s => s && s !== 'Rodando')) {
        derivedStatus = 'Gargalo';
      }
      
      const totalInvestment = projectWithResolvedPartner.products.reduce((acc, p) => acc + parseCurrency(p.budget), 0);
      
      return {
        ...projectWithResolvedPartner,
        product: productNames,
        status: derivedStatus,
        investment: `R$ ${totalInvestment.toLocaleString('pt-BR')}`
      };
    }
    return projectWithResolvedPartner;
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
      case 'Rodando':
      case 'Operacional':
        return (
          <span className="px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-bold uppercase tracking-widest flex items-center gap-1.5 w-fit">
            <CheckCircle2 size={12} />
            Rodando
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
    setActiveProductsFilter('ativos');
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
    { label: 'Inativo', color: 'text-slate-400' },
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
      id: meetingData.id || Math.random().toString(36).substr(2, 9),
      project_id: selectedProject.id,
      title: meetingData.title,
      date: meetingData.date,
      attendees: meetingData.attendees,
      actions: meetingData.actions
    };

    try {
      const response = await fetch('/api/meetings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(newMeeting)
      });

      if (!response.ok) throw new Error('Failed to save meeting');

      setIsMeetingModalOpen(false);
      setMeetingData({ id: '', title: '', date: '', attendees: '', actions: '' });
      
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
      delivery: 'Full Time',
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
      delivery: newProductData.delivery || 'Full Time',
      balance: newProductData.balance || 'Limite Disponível',
      paymentMethod: newProductData.paymentMethod || 'Automático',
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
      status: newPartnerData.status as Project['status'] || 'Rodando',
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
      status: 'Rodando',
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
      { key: 'investmentMonthly', label: 'Investimento' },
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
      { key: 'paymentMethod', label: 'Pagamento' },
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

  const handleSaveEditNote = (noteId: string) => {
    if (!selectedProduct) return;
    
    const now = new Date();
    const editSuffix = `\n\n(Editado em ${now.toLocaleDateString('pt-BR')} às ${now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })})`;
    
    const updatedProduct = {
      ...selectedProduct,
      optimizations: selectedProduct.optimizations?.map(opt => {
        if (opt.id === noteId) {
          return {
            ...opt,
            message: editingNoteMessage + editSuffix
          };
        }
        return opt;
      })
    };
    
    setSelectedProduct(updatedProduct);
    setEditingNoteId(null);
    setEditingNoteMessage('');
    
    const updatedProjects = projects.map(proj => {
      if (proj.products?.some(p => p.id === selectedProduct.id)) {
        return {
          ...proj,
          products: proj.products.map(p => p.id === selectedProduct.id ? updatedProduct : p)
        };
      }
      return proj;
    });
    setProjects(updatedProjects as any);
  };

  const handleSaveReply = (noteId: string, productId?: string) => {
    if (!replyMessage.trim()) return;
    const targetProductId = productId || selectedProduct?.id;
    if (!targetProductId) return;

    const newReply: OptimizationReply = {
      id: crypto.randomUUID(),
      author: userData?.name || auth.currentUser?.displayName || 'Usuário',
      authorPhoto: userData?.picture || auth.currentUser?.photoURL || '',
      message: replyMessage,
      date: new Date().toLocaleDateString('pt-BR'),
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };

    const updatedProjects = projects.map(proj => {
      if (proj.id === selectedProject?.id || proj.products?.some(p => p.id === targetProductId)) {
        return {
          ...proj,
          products: proj.products?.map(p => {
            if (p.id === targetProductId) {
              const updatedProduct = {
                ...p,
                optimizations: p.optimizations?.map(opt => {
                  if (opt.id === noteId) {
                    return {
                      ...opt,
                      replies: [...(opt.replies || []), newReply]
                    };
                  }
                  return opt;
                })
              };
              if (selectedProduct?.id === targetProductId) {
                setSelectedProduct(updatedProduct as any);
              }
              return updatedProduct;
            }
            return p;
          })
        };
      }
      return proj;
    });
    setProjects(updatedProjects as any);
    setReplyingNoteId(null);
    setReplyMessage('');
  };

  const handleToggleLike = (noteId: string, productId?: string) => {
    const userIdentifier = auth.currentUser?.email || userData?.name || 'user';
    const targetProductId = productId || selectedProduct?.id;
    if (!targetProductId) return;

    const updatedProjects = projects.map(proj => {
      if (proj.id === selectedProject?.id || proj.products?.some(p => p.id === targetProductId)) {
        return {
          ...proj,
          products: proj.products?.map(p => {
            if (p.id === targetProductId) {
              const updatedProduct = {
                ...p,
                optimizations: p.optimizations?.map(opt => {
                  if (opt.id === noteId) {
                    const likes = opt.likes || [];
                    const hasLiked = likes.includes(userIdentifier);
                    return {
                      ...opt,
                      likes: hasLiked ? likes.filter(e => e !== userIdentifier) : [...likes, userIdentifier]
                    };
                  }
                  return opt;
                })
              };
              if (selectedProduct?.id === targetProductId) {
                setSelectedProduct(updatedProduct as any);
              }
              return updatedProduct;
            }
            return p;
          })
        };
      }
      return proj;
    });
    setProjects(updatedProjects as any);
  };

  const handleDeleteNote = (noteId: string) => {
    if (!selectedProduct) return;
    if (!window.confirm("Tem certeza que deseja apagar esta nota?")) return;
    
    const updatedProduct = {
      ...selectedProduct,
      optimizations: selectedProduct.optimizations?.filter(opt => opt.id !== noteId)
    };
    
    setSelectedProduct(updatedProduct);
    
    const updatedProjects = projects.map(proj => {
      if (proj.products?.some(p => p.id === selectedProduct.id)) {
        return {
          ...proj,
          products: proj.products.map(p => p.id === selectedProduct.id ? updatedProduct : p)
        };
      }
      return proj;
    });
    
    setProjects(updatedProjects);
    saveProjects(updatedProjects);
  };

  const handleDeleteMeeting = async (meetingId: string) => {
    if (!window.confirm("Tem certeza que deseja apagar esta reunião?")) return;
    try {
      const response = await fetch(`/api/meetings/${meetingId}`, { method: 'DELETE' });
      if (response.ok && selectedProject) {
        setMeetings(prev => prev.filter(m => m.id !== meetingId));
      }
    } catch (err) {
      console.error("Error deleting meeting:", err);
    }
  };

  const handleToggleMeetingLike = async (meetingId: string) => {
    const userIdentifier = auth.currentUser?.email || userData?.name || 'user';
    try {
      const response = await fetch(`/api/meetings/${meetingId}/like`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userIdentifier })
      });
      if (response.ok) {
        const data = await response.json();
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, likes: data.likes } : m));
      }
    } catch (err) {
      console.error("Error toggling meeting like:", err);
    }
  };

  const handleSaveMeetingReply = async (meetingId: string) => {
    if (!replyMessage.trim()) return;
    const now = new Date();
    const replyData = {
      id: Math.random().toString(36).substr(2, 9),
      author: userData?.name || 'João',
      authorPhoto: userData?.picture || auth.currentUser?.photoURL || '',
      message: replyMessage,
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
    };
    try {
      const response = await fetch(`/api/meetings/${meetingId}/reply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ reply: replyData })
      });
      if (response.ok) {
        const data = await response.json();
        setMeetings(prev => prev.map(m => m.id === meetingId ? { ...m, replies: data.replies } : m));
        setReplyingNoteId(null);
        setReplyMessage('');
      }
    } catch (err) {
      console.error("Error adding meeting reply:", err);
    }
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
    
    saveProjects(projects.map(proj => ({
      ...proj,
      products: proj.products?.map(p => p.id === selectedProduct.id ? updatedProduct : p)
    })));
    
    setIsResultDropdownOpen(false);
  };

  const handleUpdateProductStatus = (status: string) => {
    if (!selectedProduct) return;
    if (selectedProduct.status === status) {
      setIsStatusDropdownOpen(false);
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
      message: `Status da Campanha alterado: de "${selectedProduct.status || '-'}" para "${status}"`,
      status: 'Mudança de Status'
    };

    const updatedProduct = { 
      ...selectedProduct, 
      status: status,
      optimizations: [note, ...(selectedProduct.optimizations || [])]
    };

    setSelectedProduct(updatedProduct);
    setTempProduct(updatedProduct);

    const updatedProjects = projects.map(proj => {
      const updatedProducts = proj.products?.map(p => p.id === selectedProduct.id ? updatedProduct : p);
      // If any active (non-Inativo) product is NOT "Rodando", project becomes "Gargalo"
      const hasNonRodando = updatedProducts?.some(p => p.status && p.status !== 'Rodando' && p.status !== 'Inativo');
      const newProjectStatus = hasNonRodando ? 'Gargalo' : 'Rodando';
      return {
        ...proj,
        products: updatedProducts,
        status: proj.products?.some(p => p.id === selectedProduct.id) ? newProjectStatus : proj.status
      };
    });
    
    setProjects(updatedProjects as Project[]);
    saveProjects(updatedProjects as Project[]);
    
    setIsStatusDropdownOpen(false);
  };

  const handleUpdateResultField = (field: keyof Product, newValue: string, label: string) => {
    if (!selectedProduct) return;
    
    const currentValue = selectedProduct[field] || '';
    if (currentValue === newValue) return;

    const now = new Date();
    const note: Optimization = {
      id: Math.random().toString(36).substr(2, 9),
      author: userData?.name || 'João',
      authorPhoto: userData?.picture || auth.currentUser?.photoURL || '',
      role: userData?.role || 'Gestor',
      date: now.toLocaleDateString('pt-BR'),
      time: now.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      message: `Configuração atualizada: ${label} de "${currentValue}" para "${newValue}"`,
      status: 'Mudança de Métricas'
    };

    let updatedProduct = { 
      ...selectedProduct, 
      [field]: newValue,
      optimizations: [note, ...(selectedProduct.optimizations || [])]
    };

    if (field === 'paymentMethod') {
      updatedProduct.balance = newValue === 'Automático' ? 'Limite Disponível' : 'R$ 0';
    }

    setSelectedProduct(updatedProduct);
    setTempProduct(updatedProduct);

    setProjects(prev => prev.map(proj => ({
      ...proj,
      products: proj.products?.map(p => p.id === selectedProduct.id ? updatedProduct : p)
    })));
    
    saveProjects(projects.map(proj => ({
      ...proj,
      products: proj.products?.map(p => p.id === selectedProduct.id ? updatedProduct : p)
    })));
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

    try {
      const imageUrls: string[] = [];
      if (images.length > 0) {
        if (!auth.currentUser) throw new Error("Usuário não autenticado.");
        // Upload images via server endpoint (uses Firebase Admin SDK - more reliable)
        for (const image of images) {
          // Converte a imagem para base64 e envia como JSON (sem FormData/multipart)
          // Isso elimina problemas de parsing em produção
          const base64 = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve((reader.result as string).split(',')[1]); // remove o prefixo data:...;base64,
            reader.onerror = reject;
            reader.readAsDataURL(image);
          });

          const token = await auth.currentUser!.getIdToken();
          const uploadRes = await fetch('/api/upload', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({
              fileData: base64,
              mimeType: image.type || 'image/jpeg',
              fileName: image.name || 'upload.jpg',
            }),
          });
          if (!uploadRes.ok) {
            const errText = await uploadRes.text().catch(() => `HTTP ${uploadRes.status}`);
            throw new Error(`Erro no upload da imagem: ${errText}`);
          }
          const { url } = await uploadRes.json();
          imageUrls.push(url);
        }
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

      // Save optimization to database — use is_internal (snake_case) as expected by the API
      const apiResponse = await fetch('/api/optimizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: note.id,
          product_id: selectedProduct.id,
          author: note.author,
          authorPhoto: note.authorPhoto,
          role: note.role,
          date: note.date,
          time: note.time,
          message: note.message,
          is_internal: isInternal,
          images: imageUrls,
          status: note.status,
          type: note.type,
          optimization: note.optimization
        })
      });

      if (!apiResponse.ok) {
        const errText = await apiResponse.text().catch(() => `HTTP ${apiResponse.status}`);
        throw new Error(`Erro ao salvar nota no servidor (${apiResponse.status}): ${errText}`);
      }

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
      const errMsg = err instanceof Error ? err.message : String(err);
      alert(`Houve um erro ao salvar a nota: ${errMsg}`);
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
          <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10 scrollbar-hide">
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
              className="relative w-full max-w-5xl min-h-[800px] flex flex-col modal-container overflow-hidden mb-10 transition-colors duration-300"
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
                    {/* Selectors Area */}
                    <div className="pt-2 pb-8 border-b border-slate-200 dark:border-white/5 relative mb-8 flex gap-6">
                      
                      {/* Project Result Selector */}
                      <div className="flex-1 max-w-xs relative">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Resultado do Projeto</p>
                        <button 
                          onClick={() => {
                            setIsResultDropdownOpen(!isResultDropdownOpen);
                            setIsStatusDropdownOpen(false);
                          }}
                          className="flex items-center justify-between w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
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
                              className="absolute top-full left-0 mt-2 w-max min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden"
                            >
                              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                <button
                                  onClick={() => handleUpdateProductResult('')}
                                  className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                                    !selectedProduct.projectResult ? 'bg-violet-500/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                  }`}
                                >
                                  <div className="flex items-center gap-3 pr-4">
                                    <div className={`w-2 h-2 rounded-full flex-shrink-0 bg-slate-500`} />
                                    <span className="whitespace-nowrap">SEM RESULTADO</span>
                                  </div>
                                  {!selectedProduct.projectResult && <Check size={14} className="text-violet-500 flex-shrink-0" />}
                                </button>
                                {projectResults.map((res) => (
                                  <button
                                    key={res.label}
                                    onClick={() => handleUpdateProductResult(res.label)}
                                    className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                                      selectedProduct.projectResult === res.label ? 'bg-violet-500/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 pr-4">
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${res.color}`} />
                                      <span className="whitespace-nowrap">{res.label}</span>
                                    </div>
                                    {selectedProduct.projectResult === res.label && <Check size={14} className="text-violet-500 flex-shrink-0" />}
                                  </button>
                                ))}
                              </div>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </div>

                      {/* Status Campanha Selector */}
                      <div className="flex-1 max-w-xs relative">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Status Campanha</p>
                        <button 
                          onClick={() => {
                            setIsStatusDropdownOpen(!isStatusDropdownOpen);
                            setIsResultDropdownOpen(false);
                          }}
                          className="flex items-center justify-between w-full px-4 py-3 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm font-bold text-slate-900 dark:text-white hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                        >
                          <div className="flex items-center gap-2">
                            <div className={`w-2 h-2 rounded-full ${campaignStatusOptions.find(r => r.label === selectedProduct.status)?.color?.replace('text-', 'bg-') || 'bg-slate-500'}`} />
                            <span className={campaignStatusOptions.find(r => r.label === selectedProduct.status)?.color || 'text-slate-500'}>
                              {selectedProduct.status || 'Selecionar Status'}
                            </span>
                          </div>
                          <ChevronDown size={16} className={`text-slate-500 transition-transform ${isStatusDropdownOpen ? 'rotate-180' : ''}`} />
                        </button>

                        <AnimatePresence>
                          {isStatusDropdownOpen && (
                            <motion.div 
                              initial={{ opacity: 0, y: 10 }}
                              animate={{ opacity: 1, y: 0 }}
                              exit={{ opacity: 0, y: 10 }}
                              className="absolute top-full left-0 mt-2 w-max min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden"
                            >
                              <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                {campaignStatusOptions.map((res) => (
                                  <button
                                    key={res.label}
                                    onClick={() => handleUpdateProductStatus(res.label)}
                                    className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                                      selectedProduct.status === res.label ? 'bg-violet-500/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 pr-4">
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 ${res.color.replace('text-', 'bg-')}`} />
                                      <span className={`whitespace-nowrap ${res.color}`}>{res.label}</span>
                                    </div>
                                    {selectedProduct.status === res.label && <Check size={14} className="text-violet-500 flex-shrink-0" />}
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
                        { label: 'Investimento', value: 'budget', icon: DollarSign, color: 'text-slate-900 dark:text-white', type: 'text', editable: true },
                        { label: 'Plataforma', value: 'platform', icon: Globe, color: 'platformColor', type: 'select', options: platformOptions, editable: true },
                        { label: 'Veiculação', value: 'delivery', icon: Globe, color: 'text-slate-900 dark:text-white', type: 'select', options: ['Full Time', 'Seg a Sex', 'Somente Horário Comercial', 'Seg a Sex + Domingo', 'Seg a Sab', 'Seg a Sex - Ter'], editable: true },
                        { label: 'IA de Atendimento', value: 'aiService', icon: Bot, color: 'text-slate-900 dark:text-white', type: 'select', options: aiServiceOptions, editable: true, hasKeyword: true },
                        { label: 'Pagamento', value: 'paymentMethod', icon: CreditCard, color: 'text-slate-900 dark:text-white', type: 'select', options: ['Automático', 'Manual'], editable: true, hasBalance: true }
                      ].map((metric: any) => (
                        <div key={metric.label} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5 hover:border-violet-500/20 transition-all">
                          <div className="flex items-center gap-2 text-slate-500 mb-1">
                            <metric.icon size={14} />
                            <span className="text-[10px] font-bold uppercase tracking-wider">{metric.label}</span>
                          </div>
                          {metric.type === 'select' ? (
                            <div className="relative group/select">
                              <select
                                value={(tempProduct as any)[metric.value] ?? (selectedProduct as any)[metric.value] ?? ''}
                                onChange={(e) => {
                                  const val = e.target.value;
                                  setTempProduct({ ...tempProduct!, [metric.value]: val });
                                  handleUpdateResultField(metric.value as keyof Product, val, metric.label);
                                }}
                                className={`w-full bg-transparent appearance-none outline-none cursor-pointer hover:underline ${
                                  metric.color === 'dynamic' ? getCampaignStatusColor((selectedProduct as any)[metric.value]) 
                                  : metric.color === 'platformColor' ? (
                                    ((tempProduct as any)[metric.value] ?? (selectedProduct as any)[metric.value]) === 'Meta Ads' ? 'text-blue-500' 
                                    : ((tempProduct as any)[metric.value] ?? (selectedProduct as any)[metric.value]) === 'Google Ads' ? 'text-amber-500' 
                                    : ((tempProduct as any)[metric.value] ?? (selectedProduct as any)[metric.value]) === 'Tiktok Ads' ? 'text-purple-500' 
                                    : ((tempProduct as any)[metric.value] ?? (selectedProduct as any)[metric.value]) === 'Linkedin Ads' ? 'text-sky-400' 
                                    : 'text-slate-400'
                                  ) : metric.color
                                } text-sm font-bold`}
                              >
                                {metric.options?.map((opt: string) => (
                                  <option key={opt} value={opt} className="bg-light-sidebar dark:bg-dark-input text-slate-900 dark:text-white">{opt}</option>
                                ))}
                              </select>
                              <ChevronDown size={14} className="absolute right-0 top-1/2 -translate-y-1/2 text-slate-400 opacity-0 group-hover/select:opacity-100 transition-opacity pointer-events-none" />
                            </div>
                          ) : (
                            <input 
                              type="text" 
                              value={(tempProduct as any)[metric.value] ?? (selectedProduct as any)[metric.value] ?? ''}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (metric.value === 'balance' || metric.value === 'budget') {
                                  val = formatCurrency(val);
                                }
                                setTempProduct({ ...tempProduct!, [metric.value]: val });
                              }}
                              onBlur={(e) => handleUpdateResultField(metric.value as keyof Product, (tempProduct as any)[metric.value] ?? e.target.value, metric.label)}
                              className={`w-full bg-transparent outline-none ${
                                metric.color === 'dynamic' ? getCampaignStatusColor((selectedProduct as any)[metric.value]) : metric.color
                              } text-sm font-bold placeholder:text-slate-500/50 border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-violet-500 transition-all`}
                            />
                          )}
                          {metric.hasKeyword && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Palavra-chave</span>
                              <input 
                                type="text" 
                                placeholder="Ex: quero saber mais"
                                value={(tempProduct as any).aiKeyword ?? (selectedProduct as any).aiKeyword ?? ''}
                                onChange={(e) => setTempProduct({ ...tempProduct!, aiKeyword: e.target.value })}
                                onBlur={(e) => handleUpdateResultField('aiKeyword' as keyof Product, e.target.value, 'Palavra-chave IA')}
                                className="w-full bg-transparent outline-none text-xs font-medium text-violet-500 placeholder:text-slate-400/50 border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-violet-500 transition-all mt-0.5"
                              />
                            </div>
                          )}
                          {metric.hasBalance && ((tempProduct?.paymentMethod ?? selectedProduct?.paymentMethod) === 'Manual') && (
                            <div className="mt-3 pt-3 border-t border-slate-100 dark:border-white/5">
                              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Saldo Atual</span>
                              <input 
                                type="text" 
                                placeholder="R$ 0,00"
                                value={(tempProduct as any).balance ?? (selectedProduct as any).balance ?? ''}
                                onChange={(e) => {
                                  const val = formatCurrency(e.target.value);
                                  setTempProduct({ ...tempProduct!, balance: val });
                                }}
                                onBlur={(e) => handleUpdateResultField('balance' as keyof Product, (tempProduct as any).balance ?? e.target.value, 'Saldo Atual')}
                                className="w-full bg-transparent outline-none text-sm font-bold text-orange-500 placeholder:text-slate-400/50 border-b border-transparent hover:border-slate-300 dark:hover:border-white/20 focus:border-orange-500 transition-all mt-0.5"
                              />
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}

                {activeProductTab === 'kpis' && (
                  <div className="mt-8 grid grid-cols-3 gap-4">
                    {[
                      { label: 'Investimento', value: 'investmentMonthly', icon: DollarSign, color: 'text-slate-900 dark:text-white', type: 'text', editable: false },
                      { label: 'Leads', value: 'leads', icon: Users, color: 'text-slate-900 dark:text-white', type: 'text', editable: false },
                      { label: 'Contratos', value: 'contracts', icon: FileText, color: 'text-slate-900 dark:text-white', type: 'text', editable: false },
                      { label: 'CAC', value: 'cac', icon: Target, color: 'text-emerald-500', type: 'text', editable: false },
                      { label: 'CPA', value: 'cpa', icon: Target, color: 'text-emerald-500', type: 'text', editable: false },
                      { label: 'KPIs Campanha', value: 'kpis', icon: Activity, color: 'text-slate-900 dark:text-white', type: 'text', editable: false },
                    ].map((metric: any) => (
                      <div key={metric.label} className="p-4 bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/5">
                        <div className="flex items-center gap-2 text-slate-500 mb-1">
                          <metric.icon size={14} />
                          <span className="text-[10px] font-bold uppercase tracking-wider">{metric.label}</span>
                        </div>
                        {isEditingMetrics && metric.editable ? (
                          <input 
                            type="text" 
                            value={(tempProduct as any)[metric.value] || ''}
                            onChange={(e) => setTempProduct({ ...tempProduct, [metric.value]: e.target.value })}
                            className="w-full bg-light-sidebar dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-lg px-2 py-1 text-xs text-slate-900 dark:text-white focus:border-violet-500 outline-none mt-1"
                          />
                        ) : (
                          <p className={`text-sm font-bold ${metric.color === 'dynamic' ? getCampaignStatusColor((selectedProduct as any)[metric.value]) : metric.color}`}>
                            {(selectedProduct as any)[metric.value]}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {/* Modal Content - Optimization History */}
              {activeProductTab === 'resultado' && (
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
                      <option value="Todos">Todos</option>
                      <option value="Reuniões">Reuniões</option>
                      <option value="Otimizações">Otimizações</option>
                      <option value="Saldos">Saldos</option>
                      <option value="Resultado">Resultado</option>
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
                        className="w-full bg-transparent border-none outline-none text-sm text-slate-800 dark:text-white placeholder:text-slate-500 resize-none h-24"
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
                        if (filterType !== 'Tipo' && filterType !== 'Todos') {
                          if (filterType === 'Reuniões') matchesType = opt.type === 'meeting';
                          else if (filterType === 'Otimizações') matchesType = (opt.optimization === 'Otimização' || opt.status === 'Otimização' || opt.type === 'Otimização' || opt.status === 'Mudança de Métricas' || opt.type === 'optimization') && !opt.message?.includes('Saldo Atual') && !opt.message?.includes('Pagamento') && !opt.message?.includes('Cartão');
                          else if (filterType === 'Saldos') matchesType = !!(opt.message?.includes('Saldo Atual') || opt.message?.includes('Pagamento') || opt.message?.includes('Cartão'));
                          else if (filterType === 'Resultado') matchesType = opt.status === 'Mudança de Status' || !!opt.message?.includes('Resultado') || !!opt.message?.includes('Status do Projeto');
                        }
                        
                        return matchesPerson && matchesType && 
                               (!opt.isInternal || (auth.currentUser?.email?.endsWith('@grapemidia.com')));
                      })
                      .map((opt, idx) => (
                      <div key={opt.id} className="relative flex items-center justify-center">
                        {/* Timeline Dot */}
                        <div className="absolute left-1/2 -translate-x-1/2 z-10">
                          <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1625]">
                            <div className="w-full h-full rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shadow-sm">
                              <Clock size={16} className="text-violet-500" />
                            </div>
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
                                {opt.author}
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
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                  opt.status === 'Mudança de Status' 
                                    ? 'bg-emerald-500/10 text-emerald-500' 
                                    : 'bg-violet-500/10 text-violet-500'
                                }`}>
                                  {opt.status === 'Mudança de Status' ? 'STATUS' : 'MÉTRICAS'}
                                </span>
                              )}
                              <div className="flex items-center">
                                <p className="text-[10px] text-slate-500 font-medium">{formatDateShort(opt.date)} {opt.time && `às ${opt.time}`}</p>
                                {(userData?.role?.toLowerCase() === 'superadmin' || 
                                  userData?.role?.toLowerCase() === 'super admin' || 
                                  userData?.role?.toLowerCase() === 'diretor operacional' || 
                                  userData?.role?.toLowerCase() === 'diretor-operacional' || 
                                  userData?.role?.toLowerCase() === 'diretoria') && (
                                  <>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setEditingNoteId(opt.id);
                                        setEditingNoteMessage(opt.message?.split('\n\n(Editado em')[0] || '');
                                      }}
                                      className="ml-2 text-slate-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-blue-500/10"
                                      title="Editar nota"
                                    >
                                      <Edit2 size={12} />
                                    </button>
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleDeleteNote(opt.id);
                                      }}
                                      className="ml-1 text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-500/10"
                                      title="Apagar nota"
                                    >
                                      <Trash2 size={12} />
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          </div>
                          {opt.isInternal && (
                            <div className="flex items-center gap-1 mb-2 text-[10px] font-bold text-amber-600 dark:text-amber-500 uppercase tracking-wider">
                              <span className="opacity-70">🔒</span> MENSAGEM INTERNA
                            </div>
                          )}
                          {editingNoteId === opt.id ? (
                            <div className="flex flex-col gap-2">
                              <textarea
                                value={editingNoteMessage}
                                onChange={(e) => setEditingNoteMessage(e.target.value)}
                                className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none resize-none"
                                rows={3}
                              />
                              <div className="flex gap-2 justify-end">
                                <button
                                  onClick={() => setEditingNoteId(null)}
                                  className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                                >
                                  Cancelar
                                </button>
                                <button
                                  onClick={() => handleSaveEditNote(opt.id)}
                                  className="px-3 py-1.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                                >
                                  Salvar
                                </button>
                              </div>
                            </div>
                          ) : (
                            <p className={`text-xs ${opt.isInternal ? 'text-amber-900 dark:text-amber-200' : 'text-slate-600 dark:text-slate-400'} leading-relaxed whitespace-pre-line`}>
                              {opt.message}
                            </p>
                          )}

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

                              {/* Replies */}
                              {opt.replies && opt.replies.length > 0 && (
                                <div className="mt-4 space-y-3">
                                  {opt.replies.map(reply => (
                                    <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-slate-100 dark:border-white/5">
                                      {reply.authorPhoto ? (
                                        <img src={reply.authorPhoto} alt={reply.author} className="w-5 h-5 rounded-full object-cover mt-0.5" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 text-[10px] font-bold mt-0.5">
                                          {reply.author.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                          <p className="text-xs font-bold text-slate-900 dark:text-white">{reply.author}</p>
                                          <p className="text-[10px] text-slate-500">{formatDateShort(reply.date)} às {reply.time}</p>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">{reply.message}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {replyingNoteId === opt.id && (
                                <div className="mt-4 flex flex-col gap-2">
                                  <textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Escreva sua resposta..."
                                    className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none resize-none"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => { setReplyingNoteId(null); setReplyMessage(''); }}
                                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => handleSaveReply(opt.id, selectedProduct?.id)}
                                      className="px-3 py-1.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                                    >
                                      Responder
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Action Bar */}
                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); handleToggleLike(opt.id, selectedProduct?.id); }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors border ${
                                      opt.likes?.includes(auth.currentUser?.email || userData?.name || 'user')
                                        ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                                        : 'text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                  >
                                    {opt.likes?.includes(auth.currentUser?.email || userData?.name || 'user') ? (
                                      <span>👍</span>
                                    ) : (
                                      <ThumbsUp size={14} />
                                    )}
                                    {(opt.likes?.length || 0) > 0 && <span>{opt.likes?.length}</span>}
                                  </button>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setReplyingNoteId(opt.id); }}
                                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                >
                                  Responder
                                </button>
                              </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              )}
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
                      <div className="relative z-50 shrink-0 w-[50px] h-[50px]">
                        <button 
                          type="button"
                          onClick={() => setIsIconDropdownOpen(!isIconDropdownOpen)}
                          className="absolute inset-0 flex items-center justify-center bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-violet-500 hover:bg-slate-200 dark:hover:bg-white/10 transition-all"
                          title="Escolher Ícone"
                        >
                          {getProductIcon(newProductData.icon)}
                        </button>
                        {isIconDropdownOpen && (
                          <>
                            <div 
                              className="fixed inset-0 z-[105]" 
                              onClick={() => setIsIconDropdownOpen(false)}
                            ></div>
                            <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[110] p-2 grid grid-cols-4 gap-1">
                              {productIcons.map((item) => (
                                <button
                                  type="button"
                                  key={item.name}
                                  onClick={() => {
                                    setNewProductData({ ...newProductData, icon: item.name });
                                    setIsIconDropdownOpen(false);
                                  }}
                                  className={`p-2 rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-all flex items-center justify-center ${newProductData.icon === item.name ? 'bg-violet-500/20 text-violet-500' : 'text-slate-400'}`}
                                  title={item.label}
                                >
                                  <item.icon size={18} />
                                </button>
                              ))}
                            </div>
                          </>
                        )}
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
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Investimento</label>
                    <input 
                      type="text" 
                      placeholder="Ex: R$ 5.000"
                      value={newProductData.budget || ''}
                      onChange={(e) => setNewProductData({ ...newProductData, budget: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white placeholder:text-slate-400 focus:border-violet-500 outline-none transition-all"
                    />
                  </div>


                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Pagamento</label>
                    <select
                      value={newProductData.paymentMethod || 'Automático'}
                      onChange={(e) => {
                        const method = e.target.value as 'Automático' | 'Manual';
                        setNewProductData({ 
                          ...newProductData, 
                          paymentMethod: method,
                          balance: method === 'Automático' ? 'Limite Disponível' : 'R$ 0'
                        });
                      }}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-violet-500 outline-none transition-all appearance-none"
                    >
                      <option value="Automático" className="bg-light-sidebar dark:bg-dark-input">Automático</option>
                      <option value="Manual" className="bg-light-sidebar dark:bg-dark-input">Manual</option>
                    </select>
                  </div>

                  <div>
                    <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Veiculação</label>
                    <select
                      value={newProductData.delivery || 'Full Time'}
                      onChange={(e) => setNewProductData({ ...newProductData, delivery: e.target.value })}
                      className="w-full bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white focus:border-violet-500 outline-none transition-all appearance-none"
                    >
                      {['Full Time', 'Seg a Sex', 'Somente Horário Comercial', 'Seg a Sex + Domingo', 'Seg a Sab', 'Seg a Sex - Ter'].map(opt => (
                        <option key={opt} value={opt} className="bg-light-sidebar dark:bg-dark-input">{opt}</option>
                      ))}
                    </select>
                  </div>

                  {newProductData.paymentMethod === 'Manual' && (
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

      {/* Group Modal */}
      <AnimatePresence>
        {isGroupModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-slate-900/20 dark:bg-black/40 backdrop-blur-sm"
              onClick={() => setIsGroupModalOpen(false)}
            ></motion.div>
            
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              className="relative w-full max-w-sm bg-white dark:bg-dark-card rounded-2xl shadow-xl overflow-hidden border border-slate-200 dark:border-white/10"
            >
              <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center justify-between">
                <h3 className="text-lg font-bold text-light-text dark:text-white">Mudar Grupo</h3>
                <button 
                  onClick={() => setIsGroupModalOpen(false)}
                  className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              <div className="p-6 space-y-2">
                {['Quarentena', 'Grupo 1', 'Grupo 2'].map(group => (
                  <button
                    key={group}
                    onClick={() => {
                      if (!groupModalProjectId) return;
                      const proj = projects.find(p => p.id === groupModalProjectId);
                      if (proj) {
                        const updated = { ...proj, group };
                        setProjects(prev => prev.map(p => p.id === proj.id ? updated : p));
                        handleSaveProject([updated]);
                      }
                      setIsGroupModalOpen(false);
                      setGroupModalProjectId(null);
                    }}
                    className="w-full text-left px-4 py-3 rounded-xl hover:bg-violet-50 dark:hover:bg-violet-500/10 text-slate-700 dark:text-slate-300 hover:text-violet-600 dark:hover:text-violet-400 transition-colors font-medium"
                  >
                    {group}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Meeting Modal */}
      <AnimatePresence>
        {isMeetingModalOpen && (
          <div className="fixed inset-0 z-[1000] flex items-start justify-center p-4 overflow-y-auto pt-10 pb-10 scrollbar-hide">
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
                      className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-violet-500 transition-all appearance-none"
                    >
                      <option value="" className="bg-white dark:bg-dark-input text-slate-900 dark:text-white">Selecione um cliente...</option>
                      {clients.filter(c => c.status !== 'Inativo' && c.status !== 'churn').map(client => (
                        <option key={client.id} value={client.id} className="bg-white dark:bg-dark-input text-slate-900 dark:text-white">{client.name}</option>
                      ))}
                    </select>
                    <p className="mt-2 text-[10px] text-slate-500 italic">* Vincule este parceiro a um registro da página de Clientes Ativos.</p>
                  </div>

                  <div>
                    <div>
                      <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2 block">Status Inicial</label>
                      <select 
                        value={newPartnerData.status}
                        onChange={(e) => setNewPartnerData({ ...newPartnerData, status: e.target.value as any })}
                        className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-slate-900 dark:text-white outline-none focus:border-violet-500 transition-all appearance-none"
                      >
                        <option value="Rodando" className="bg-white dark:bg-dark-input text-slate-900 dark:text-white">Rodando</option>
                        <option value="Gargalo" className="bg-white dark:bg-dark-input text-slate-900 dark:text-white">Gargalo</option>
                        <option value="Pausado" className="bg-white dark:bg-dark-input text-slate-900 dark:text-white">Pausado</option>
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
      {!modalOnly && (
        <>
      <header className="mb-10">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-4xl font-black text-slate-900 dark:text-white tracking-tight mb-1">
              Projetos & <span className="text-violet-500">Parceiros</span>
            </h1>
            <p className="text-slate-500 text-sm">Gerenciamento centralizado de contas, performance e gargalos operacionais.</p>
          </div>
          <div className="flex items-center gap-4 relative z-50">
            <div className="flex items-center gap-2 bg-white dark:bg-dark-card/60 backdrop-blur-md px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 shadow-sm">
              <User size={16} className="text-slate-500" />
              <span className="text-sm font-medium text-slate-600 dark:text-slate-300">Responsável:</span>
              <div className="relative">
                <button
                  type="button"
                  onClick={() => setShowResponsavelDropdown(!showResponsavelDropdown)}
                  className="flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-white hover:text-violet-500 transition-colors bg-slate-50 dark:bg-white/5 px-3 py-1.5 rounded-lg border border-slate-200 dark:border-white/10"
                >
                  {(() => {
                    let pageData = null;
                    if (menu) {
                      for (const section of menu) {
                        if (section.pages) { const p = section.pages.find((p: any) => p.id === activePage); if (p) pageData = p; }
                        if (section.subSessions) {
                          for (const sub of section.subSessions) {
                            if (sub.pages) { const p = sub.pages.find((p: any) => p.id === activePage); if (p) pageData = p; }
                            if (sub.subSubSessions) {
                              for (const subsub of sub.subSubSessions) {
                                if (subsub.pages) { const p = subsub.pages.find((p: any) => p.id === activePage); if (p) pageData = p; }
                              }
                            }
                          }
                        }
                        if (section.subSubSessions) {
                          for (const subsub of section.subSubSessions) {
                            if (subsub.pages) { const p = subsub.pages.find((p: any) => p.id === activePage); if (p) pageData = p; }
                          }
                        }
                      }
                    }
                    const gestor = gestores.find(g => g.id === pageData?.manager_id);
                    if (gestor) {
                      return (
                        <>
                          <div className="w-5 h-5 rounded-full overflow-hidden shrink-0 border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-white/5 flex items-center justify-center">
                            {gestor.picture ? (
                              <img src={gestor.picture} alt={gestor.name} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-[10px] font-bold text-violet-500">{gestor.name.substring(0, 2).toUpperCase()}</span>
                            )}
                          </div>
                          <span>{gestor.name}</span>
                        </>
                      );
                    }
                    return <span>Atribuir responsável...</span>;
                  })()}
                  <ChevronDown size={14} className="ml-1" />
                </button>
                {showResponsavelDropdown && (
                  <div className="absolute right-0 top-full mt-2 w-64 bg-white dark:bg-[#1a1625] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[9999] overflow-hidden">
                    <div className="p-2 border-b border-slate-100 dark:border-white/5">
                      <p className="text-xs font-bold text-slate-500 px-2 py-1 uppercase tracking-wider">Gestores Disponíveis</p>
                    </div>
                    <div className="max-h-60 overflow-y-auto p-1 bg-white dark:bg-[#1a1625]">
                      {gestores.map(g => (
                        <button
                          key={g.id}
                          onClick={async () => {
                            try {
                              const res = await fetch(`/api/menu-pages/${activePage}/manager`, {
                                method: 'PATCH',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({ manager_id: g.id, requester_email: userData?.email })
                              });
                              if (res.ok) {
                                refreshMenu();
                                setShowResponsavelDropdown(false);
                              } else {
                                const data = await res.json();
                                alert(data.error || 'Erro ao definir gestor da página.');
                              }
                            } catch (err) {
                              console.error(err);
                              alert('Erro ao definir gestor da página.');
                            }
                          }}
                          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-white/5 text-left transition-colors"
                        >
                          <div className="w-8 h-8 rounded-full bg-violet-100 dark:bg-violet-900/30 flex items-center justify-center shrink-0">
                            {g.picture ? (
                              <img src={g.picture} alt={g.name} className="w-8 h-8 rounded-full object-cover" />
                            ) : (
                              <span className="text-violet-600 dark:text-violet-400 font-bold text-xs">
                                {g.name.substring(0, 2).toUpperCase()}
                              </span>
                            )}
                          </div>
                          <div>
                            <p className="text-sm font-bold text-slate-900 dark:text-white">{g.name}</p>
                            <p className="text-xs text-slate-500">{g.email}</p>
                          </div>
                        </button>
                      ))}
                      <button
                        onClick={async () => {
                          try {
                            const res = await fetch(`/api/menu-pages/${activePage}/manager`, {
                              method: 'PATCH',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({ manager_id: null, requester_email: userData?.email })
                            });
                            if (res.ok) {
                              refreshMenu();
                              setShowResponsavelDropdown(false);
                            } else {
                              const data = await res.json();
                              alert(data.error || 'Erro ao remover gestor.');
                            }
                          } catch (err) {
                            console.error(err);
                            alert('Erro ao remover gestor.');
                          }
                        }}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg hover:bg-rose-50 dark:hover:bg-rose-500/10 text-left transition-colors text-rose-500 mt-1"
                      >
                        <div className="w-8 h-8 rounded-full bg-rose-100 dark:bg-rose-500/20 flex items-center justify-center shrink-0">
                          <X size={14} />
                        </div>
                        <span className="text-sm font-bold">Remover Responsável</span>
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
            <button 
              onClick={() => setIsAddPartnerModalOpen(true)}
              className="px-6 py-3 bg-violet-600 hover:bg-violet-500 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-600/20 flex items-center gap-2 shrink-0"
            >
              <Plus size={20} />
              Adicionar Parceiro
            </button>
          </div>
        </div>
      </header>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-6 mb-10">
        {dynamicStats.map((stat, i) => (
          <div key={i} className="bg-white dark:bg-dark-card/60 backdrop-blur-md border border-slate-200 dark:border-white/5 rounded-3xl p-6 shadow-xl transition-all group">
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
      <div className="bg-white dark:bg-dark-card/60 backdrop-blur-md p-4 rounded-3xl border border-slate-200 dark:border-white/5 mb-6 flex flex-wrap items-center gap-4 shadow-sm transition-colors">
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
              <option className="bg-dark-input">Rodando</option>
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
          <div key={groupName} className="bg-white dark:bg-dark-card/60 backdrop-blur-md rounded-3xl border border-slate-200 dark:border-white/5 overflow-hidden shadow-xl transition-colors duration-300">
            <div 
              className="px-6 py-4 bg-transparent flex items-center justify-between relative z-10"
            >
              <div className="flex items-center gap-3 cursor-pointer flex-1" onClick={() => toggleGroup(groupName)}>
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
              <button
                onClick={(e) => { e.stopPropagation(); setLockedGroups(prev => ({ ...prev, [groupName]: !prev[groupName] })); }}
                title={lockedGroups[groupName] ? 'Desbloquear classificação' : 'Bloquear classificação'}
                className={`p-2 rounded-xl transition-all ${
                  lockedGroups[groupName]
                    ? 'bg-amber-500/15 text-amber-500 border border-amber-500/30'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-white/5'
                }`}
              >
                {lockedGroups[groupName] ? <Lock size={14} /> : <LockOpen size={14} />}
              </button>
            </div>
            
            {expandedGroups[groupName] && (
              <div className="overflow-x-auto">
                <DndContext sensors={sensors} collisionDetection={closestCenter} onDragStart={() => setExpandedRowId(null)} onDragEnd={handleDragEnd}>
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-white/5 bg-transparent">
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest w-10"></th>
                      {[
                        { key: 'partner' as const, label: 'Parceiro' },
                        { key: null, label: '' },
                        { key: 'projectResult' as const, label: 'Resultado' },
                        { key: 'status' as const, label: 'Status' },
                        { key: null, label: 'Pagamento' },
                        { key: 'investment' as const, label: 'Investimento' },
                      ].map((col, idx) => (
                        <th
                          key={idx}
                          className={`px-6 py-5 text-[10px] font-bold uppercase tracking-widest ${
                            col.key && projectSortColumn === col.key ? 'text-violet-500' : 'text-slate-500 dark:text-slate-400'
                          } ${col.key ? 'cursor-pointer select-none hover:text-violet-400 transition-colors' : ''} ${col.key === 'projectResult' ? 'relative' : ''}`}
                          onClick={() => {
                            if (!col.key) return;
                            if (projectSortColumn === col.key) {
                              setProjectSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
                            } else {
                              setProjectSortColumn(col.key);
                              setProjectSortDirection('asc');
                            }
                          }}
                        >
                          <div className="flex items-center gap-1">
                            {col.label}
                            {col.key && projectSortColumn === col.key && (
                              <ChevronDown size={12} className={`transition-transform ${projectSortDirection === 'asc' ? 'rotate-180' : ''}`} />
                            )}
                            {col.key === 'projectResult' && (
                              <button
                                onClick={(e) => { e.stopPropagation(); setIsResultFilterOpen(!isResultFilterOpen); }}
                                className={`ml-1 p-0.5 rounded transition-colors ${projectResultFilter ? 'text-violet-500' : 'text-slate-400 hover:text-violet-400'}`}
                              >
                                <Filter size={10} />
                              </button>
                            )}
                          </div>
                          {col.key === 'projectResult' && isResultFilterOpen && (
                            <>
                              <div className="fixed inset-0 z-[98]" onClick={(e) => { e.stopPropagation(); setIsResultFilterOpen(false); }} />
                              <div className="absolute left-0 top-full mt-1 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-white/10 z-[99] overflow-hidden">
                                <button
                                  onClick={(e) => { e.stopPropagation(); setProjectResultFilter(null); setIsResultFilterOpen(false); }}
                                  className={`w-full text-left px-3 py-2 text-xs font-medium transition-colors ${
                                    !projectResultFilter ? 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                  }`}
                                >
                                  Todos
                                </button>
                                {projectResults.map(r => (
                                  <button
                                    key={r.label}
                                    onClick={(e) => { e.stopPropagation(); setProjectResultFilter(r.label); setIsResultFilterOpen(false); }}
                                    className={`w-full text-left px-3 py-2 text-xs font-medium flex items-center gap-2 transition-colors ${
                                      projectResultFilter === r.label ? 'text-violet-500 bg-violet-50 dark:bg-violet-900/20' : 'text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5'
                                    }`}
                                  >
                                    <div className={`w-2 h-2 rounded-full ${r.color}`} />
                                    {r.label}
                                  </button>
                                ))}
                              </div>
                            </>
                          )}
                        </th>
                      ))}
                      <th className="px-6 py-5 text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const resultPriority: Record<string, number> = {
                        'RESULTADO BOM': 1,
                        'RESULTADO OK': 2,
                        'TESTANDO': 3,
                        'RESULTADO RUIM': 4,
                        'AGUARDANDO CRIATIVOS': 5,
                        'AGUARDANDO ARTIGO': 5,
                        'AGUARDANDO LP': 5,
                        'SUBIR CAMPANHA': 5,
                        'CAMPANHA PAUSADA': 6,
                        '-': 7,
                        '': 8,
                      };
                      const sortedProjects = [...projectsInGroup]
                        .filter(p => !projectResultFilter || (p.projectResult || '-') === projectResultFilter)
                        .sort((a, b) => {
                          if (lockedGroups[groupName] || !projectSortColumn) return (a.sortOrder || 0) - (b.sortOrder || 0);
                          const dir = projectSortDirection === 'asc' ? 1 : -1;
                          switch (projectSortColumn) {
                            case 'partner':
                              return dir * (a.partner || '').localeCompare(b.partner || '');
                            case 'projectResult': {
                              const aPri = resultPriority[a.projectResult || ''] ?? 99;
                              const bPri = resultPriority[b.projectResult || ''] ?? 99;
                              return dir * (aPri - bPri);
                            }
                            case 'status':
                              return dir * (a.status || '').localeCompare(b.status || '');
                            case 'investment':
                              return dir * (parseCurrency(a.investment || '0') - parseCurrency(b.investment || '0'));
                            default:
                              return 0;
                          }
                        });

                      return (
                        <SortableContext items={sortedProjects.map(p => p.id)} strategy={verticalListSortingStrategy}>
                          {sortedProjects.map((project) => (
                            <React.Fragment key={project.id}>
                              <SortableRowWrapper 
                                id={project.id}
                                className={`border-b border-slate-200 dark:border-white/5 transition-colors group ${
                                  project.status === 'Gargalo' ? 'bg-rose-500/5' : ''
                                } hover:bg-slate-50 dark:hover:bg-white/[0.02]`}
                              >
                                <td className="px-6 py-5">
                                  <div className="flex items-center gap-2">
                                    <DragHandle />
                                    <button 
                          onClick={(e) => toggleRow(project.id, e)}
                          className={`p-1.5 rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 transition-all ${
                          expandedRowId === project.id ? 'rotate-90 text-violet-500' : 'text-slate-500'
                        }`}
                      >
                        <ChevronRight size={18} />
                      </button>
                      </div>
                    </td>
                    <td className="px-6 py-5" onClick={(e) => toggleRow(project.id, e)}>
                      <div className="flex items-center gap-3 cursor-pointer">
                        {(() => {
                          const colorMap: Record<string, { bg: string; text: string }> = {
                            'bg-emerald-500': { bg: 'bg-emerald-500/20', text: 'text-emerald-500' },
                            'bg-amber-500':   { bg: 'bg-amber-500/20',   text: 'text-amber-500' },
                            'bg-rose-500':    { bg: 'bg-rose-500/20',    text: 'text-rose-500' },
                            'bg-blue-500':    { bg: 'bg-blue-500/20',    text: 'text-blue-500' },
                            'bg-slate-500':   { bg: 'bg-slate-500/20',   text: 'text-slate-500' },
                            'bg-slate-400':   { bg: 'bg-slate-400/20',   text: 'text-slate-400' },
                          };
                          const resultBg = projectResults.find(r => r.label === project.projectResult)?.color || 'bg-slate-500';
                          const c = colorMap[resultBg] || colorMap['bg-slate-500'];
                          return (
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${c.bg} ${c.text}`}>
                              <Scale size={20} />
                            </div>
                          );
                        })()}
                        <div>
                          <p className="text-sm font-bold text-slate-900 dark:text-white group-hover:text-violet-400 transition-colors">{toTitleCase(project.partner || '')}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-5">
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
                      <div className="cursor-pointer flex flex-col gap-1">
                        {(project.products && project.products.length > 0) ? (
                          [...new Set(project.products.map((prod: any) => normalizePaymentMethod(prod.paymentMethod)))].map((pm: string) => (
                            <span
                              key={pm}
                              className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border w-fit ${
                                pm === 'Manual'
                                  ? 'bg-orange-500/10 text-orange-500 border-orange-500/20'
                                  : 'bg-blue-500/10 text-blue-500 border-blue-500/20'
                              }`}
                            >
                              <CreditCard size={9} />
                              {pm}
                            </span>
                          ))
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
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
                        <div className="relative flex items-center justify-center w-8 h-8">
                          <button 
                            onClick={(e) => {
                              e.stopPropagation();
                              setOpenProjectMenuId(openProjectMenuId === project.id ? null : project.id);
                            }}
                            className="absolute inset-0 flex items-center justify-center rounded-lg hover:bg-slate-200 dark:hover:bg-white/10 text-slate-500 hover:text-light-text dark:hover:text-white transition-all"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                          {openProjectMenuId === project.id && (
                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-white/10 z-[100] overflow-hidden" style={{ minWidth: '160px' }}>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setGroupModalProjectId(project.id);
                                  setIsGroupModalOpen(true);
                                  setOpenProjectMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5"
                              >
                                Mudar Grupo
                              </button>
                              <button 
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDeleteProject(project.id);
                                  setOpenProjectMenuId(null);
                                }}
                                className="w-full text-left px-4 py-2 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20"
                              >
                                Excluir Projeto
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                  </SortableRowWrapper>
                  
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
                                    
                                    <div className="ml-6 flex items-center bg-slate-100 dark:bg-[#1a1625] rounded-xl p-1 border border-slate-200 dark:border-white/5">
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveProductsFilter('ativos');
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                          activeProductsFilter === 'ativos'
                                            ? 'bg-white dark:bg-white/10 text-violet-500 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                      >
                                        Ativos ({project.products?.filter(p => p.status !== 'Inativo').length || 0})
                                      </button>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          setActiveProductsFilter('inativos');
                                        }}
                                        className={`px-4 py-1.5 rounded-lg text-xs font-bold transition-all ${
                                          activeProductsFilter === 'inativos'
                                            ? 'bg-white dark:bg-white/10 text-violet-500 shadow-sm'
                                            : 'text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                                        }`}
                                      >
                                        Inativos ({project.products?.filter(p => p.status === 'Inativo').length || 0})
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                                  {/* Product Cards */}
                                  {project.products
                                    ?.filter(prod => activeProductsFilter === 'ativos' ? prod.status !== 'Inativo' : prod.status === 'Inativo')
                                    .map((prod) => (
                                  <div 
                                    key={prod.id} 
                                    onClick={() => handleProductClick(prod)}
                                    className={`bg-dark-card backdrop-blur-md rounded-2xl border p-6 shadow-xl relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-br before:to-transparent before:opacity-50 before:pointer-events-none transition-all cursor-pointer group/prod ${
                                      prod.status === 'Inativo'
                                        ? 'opacity-40 hover:opacity-70 border-slate-500/20 before:from-slate-500/5 hover:border-slate-500/40'
                                        : prod.status && prod.status !== 'Rodando' 
                                          ? 'border-rose-500/30 before:from-rose-500/10 hover:border-rose-500/50' 
                                          : 'border-violet-500/10 before:from-violet-500/5 hover:border-violet-500/30'
                                    }`}
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
                                      <div className="relative">
                                        <button 
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setOpenProductMenuId(openProductMenuId === prod.id ? null : prod.id);
                                          }}
                                          className="text-slate-500 hover:text-light-text dark:hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                                        >
                                          <MoreHorizontal size={18} />
                                        </button>
                                        {openProductMenuId === prod.id && (
                                          <>
                                            <div className="fixed inset-0 z-[98]" onClick={(e) => { e.stopPropagation(); setOpenProductMenuId(null); }} />
                                            <div className="absolute right-0 top-full mt-1 w-48 bg-white dark:bg-dark-card rounded-xl shadow-lg border border-slate-200 dark:border-white/10 z-[99] overflow-hidden">
                                              <button
                                                onClick={(e) => {
                                                  e.stopPropagation();
                                                  setProductToDelete(prod.id);
                                                  setOpenProductMenuId(null);
                                                }}
                                                className="w-full text-left px-4 py-2.5 text-sm text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 flex items-center gap-2 transition-colors"
                                              >
                                                <Trash2 size={14} />
                                                Excluir Produto
                                              </button>
                                            </div>
                                          </>
                                        )}
                                      </div>
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

                                    <div className="grid grid-cols-4 gap-2">
                                      <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm transition-all hover:border-violet-500/20">
                                        <p className="text-[8px] font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-0.5 min-h-[24px]">Investimento</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">{prod.budget?.includes('R$') ? prod.budget : (formatCurrency(prod.budget || '') || 'R$ 0,00')}</p>
                                      </div>
                                      <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm transition-all hover:border-violet-500/20">
                                        <p className="text-[8px] font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-0.5 min-h-[24px]">Plataforma</p>
                                        <p className={`text-xs font-bold ${
                                          prod.platform === 'Meta Ads' ? 'text-blue-500' 
                                          : prod.platform === 'Google Ads' ? 'text-amber-500' 
                                          : prod.platform === 'Tiktok Ads' ? 'text-purple-500' 
                                          : prod.platform === 'Linkedin Ads' ? 'text-sky-400' 
                                          : 'text-slate-400'
                                        }`}>{prod.platform || '-'}</p>
                                      </div>
                                      <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm transition-all hover:border-violet-500/20">
                                        <p className="text-[8px] font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-0.5 min-h-[24px]">Pagamento</p>
                                        <p className={`text-xs font-bold ${normalizePaymentMethod(prod.paymentMethod) === 'Manual' ? 'text-orange-500' : 'text-blue-500'}`}>
                                          {normalizePaymentMethod(prod.paymentMethod) === 'Manual' ? (prod.balance?.includes('R$') ? prod.balance : (formatCurrency(prod.balance || '') || 'R$ 0,00')) : 'Automático'}
                                        </p>
                                      </div>
                                      <div className="p-2 rounded-xl bg-white dark:bg-white/5 border border-slate-200 dark:border-white/5 shadow-sm transition-all hover:border-violet-500/20">
                                        <p className="text-[8px] font-bold text-slate-700 dark:text-white uppercase tracking-wider mb-0.5 min-h-[24px]">Veiculação</p>
                                        <p className="text-xs font-bold text-slate-900 dark:text-white">{prod.delivery || 'Full Time'}</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}

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
                              </div>
                            </div>
                          </motion.div>
                        </td>
                      </tr>
                    )}
                  </AnimatePresence>
                </React.Fragment>
              ))}
              </SortableContext>
            );
          })()}
          </tbody>
          </table>
          </DndContext>
        </div>
        )}
      </div>
    ))}
  </div>
        <div className="p-6 border-t border-slate-200 dark:border-white/5 flex items-center justify-between">
          <p className="text-xs text-slate-500 font-medium">Mostrando 5 de 24 parceiros ativos</p>
        </div>
        </>
      )}

      {/* Project Modal Simulation */}
      {selectedProject && (
        <Modal
          isOpen={isProjectModalOpen}
          onClose={() => {
            setIsProjectModalOpen(false);
            setIsEditing(false);
          }}
          title={toTitleCase(selectedProject.partner || 'Detalhes do Projeto')}
          headerContent={
            <div className="flex items-center gap-3 ml-4 border-l border-slate-200 dark:border-white/10 pl-4">
              <div className="w-7 h-7 rounded-lg bg-violet-600 flex items-center justify-center text-xs font-bold text-white shadow-sm">
                {(selectedProject.partner || 'P').charAt(0).toUpperCase()}
              </div>
              {selectedProject.product && (
                <span className="text-[10px] text-slate-500 font-bold px-2 py-1 bg-slate-100 dark:bg-white/5 rounded-md border border-slate-200 dark:border-white/10">{selectedProject.product}</span>
              )}
            </div>
          }
          maxWidth="max-w-5xl"
          minHeight="min-h-[800px]"
        >
        <div className="flex flex-col min-h-[750px]">
          {/* Tabs */}
          <div className="flex items-center gap-6 mb-6 border-b modal-divider shrink-0">
            {(['resultado', 'reunioes', 'comentarios', 'analise', 'arquivos', 'nps'] as const).map((tab) => (
              <button
                key={tab}
                onClick={() => setActiveProjectTab(tab as any)}
                className={`pb-4 text-sm font-bold transition-all ${
                  activeProjectTab === tab
                    ? 'modal-tab-active'
                    : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'
                }`}
              >
                {tab === 'resultado' ? 'Resultado do projeto' : tab === 'reunioes' ? 'Reuniões' : tab === 'arquivos' ? 'Arquivos do projeto' : tab === 'comentarios' ? 'Comentários' : tab === 'nps' ? 'NPS' : 'Análise de Leads'}
              </button>
            ))}
          </div>

          {/* Content based on active tab */}
          <div className="flex-1 overflow-y-auto scrollbar-hide">
            {activeProjectTab === 'resultado' && (
                  <>
                    {/* KPIs Dashboard */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mt-2 items-start">
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Status do Projeto</p>
                        {getStatusBadge(selectedProject.status)}
                      </div>
                      
                      <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Resultado</p>
                        <div className="flex items-center gap-2 mt-1 relative">
                          <button 
                            onClick={() => setIsProjectResultDropdownOpen(!isProjectResultDropdownOpen)}
                            className={`px-3 py-1.5 rounded-full text-[10px] font-bold uppercase tracking-widest cursor-pointer outline-none flex items-center gap-1.5 ${(() => {
                              const res = projectResults.find(r => r.label === selectedProject.projectResult) || { color: 'bg-slate-500' };
                              return `${res.color}/10 ${res.color.replace('bg-', 'text-')}`;
                            })()}`}
                          >
                            {selectedProject.projectResult || 'SEM RESULTADO'}
                            <ChevronDown size={12} className={isProjectResultDropdownOpen ? 'rotate-180 transition-transform' : 'transition-transform'} />
                          </button>

                          <AnimatePresence>
                            {isProjectResultDropdownOpen && (
                              <motion.div 
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: 10 }}
                                className="absolute top-full left-0 mt-2 w-max min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden"
                              >
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                  <button
                                    onClick={() => handleUpdateProjectResult('')}
                                    className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                                      !selectedProject.projectResult ? 'bg-violet-500/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 pr-4">
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 bg-slate-500`} />
                                      <span className="whitespace-nowrap">SEM RESULTADO</span>
                                    </div>
                                    {!selectedProject.projectResult && <Check size={14} className="text-violet-500 flex-shrink-0" />}
                                  </button>
                                  {projectResults.map((res) => (
                                    <button
                                      key={res.label}
                                      onClick={() => handleUpdateProjectResult(res.label)}
                                      className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                                        selectedProject.projectResult === res.label ? 'bg-violet-500/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 pr-4">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${res.color}`} />
                                        <span className="whitespace-nowrap">{res.label}</span>
                                      </div>
                                      {selectedProject.projectResult === res.label && <Check size={14} className="text-violet-500 flex-shrink-0" />}
                                    </button>
                                  ))}
                                </div>
                              </motion.div>
                            )}
                          </AnimatePresence>
                        </div>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Investimento</p>
                        <span className="text-sm font-bold text-slate-900 dark:text-white">{selectedProject.investment}</span>
                      </div>

                      <div className="p-4 bg-slate-50 dark:bg-slate-800/30 rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm">
                        <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-2">Última Atualização</p>
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

                    {/* Product Previews */}
                    {selectedProject.products && selectedProject.products.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-8">
                        {selectedProject.products.map((prod) => (
                          <div
                            key={prod.id}
                            onClick={() => handleProductClick(prod)}
                            className="flex items-center gap-4 p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/30 border border-slate-200 dark:border-white/5 hover:border-violet-500/30 hover:bg-white dark:hover:bg-white/5 cursor-pointer transition-all shadow-sm group"
                          >
                            <div className="w-10 h-10 rounded-xl flex items-center justify-center bg-violet-500/10 text-violet-500 flex-shrink-0">
                              {getProductIcon(prod.icon)}
                            </div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-bold text-slate-900 dark:text-white truncate group-hover:text-violet-400 transition-colors">{prod.name}</p>
                              <span className={`inline-block mt-0.5 px-2 py-0.5 ${(getCampaignStatusColor(prod.status) || '').replace('text-', 'bg-')}/20 ${getCampaignStatusColor(prod.status)} text-[10px] font-bold rounded-full`}>{prod.status}</span>
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
                                className="absolute top-full left-0 mt-2 w-max min-w-[220px] bg-white dark:bg-slate-900 border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl z-[100] overflow-hidden"
                              >
                                <div className="max-h-60 overflow-y-auto custom-scrollbar">
                                  <button
                                    onClick={() => handleUpdateProjectResult('')}
                                    className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                                      !selectedProject.projectResult ? 'bg-violet-500/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                    }`}
                                  >
                                    <div className="flex items-center gap-3 pr-4">
                                      <div className={`w-2 h-2 rounded-full flex-shrink-0 bg-slate-500`} />
                                      <span className="whitespace-nowrap">SEM RESULTADO</span>
                                    </div>
                                    {!selectedProject.projectResult && <Check size={14} className="text-violet-500 flex-shrink-0" />}
                                  </button>
                                  {projectResults.map((res) => (
                                    <button
                                      key={res.label}
                                      onClick={() => handleUpdateProjectResult(res.label)}
                                      className={`w-full px-4 py-3 flex items-center justify-between text-left text-xs font-bold transition-all hover:bg-slate-50 dark:hover:bg-white/5 ${
                                        selectedProject.projectResult === res.label ? 'bg-violet-500/10 text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-400'
                                      }`}
                                    >
                                      <div className="flex items-center gap-3 pr-4">
                                        <div className={`w-2 h-2 rounded-full flex-shrink-0 ${res.color}`} />
                                        <span className="whitespace-nowrap">{res.label}</span>
                                      </div>
                                      {selectedProject.projectResult === res.label && <Check size={14} className="text-violet-500 flex-shrink-0" />}
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
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest">Histórico Consolidado</h4>
                      <select 
                        value={timelineFilter}
                        onChange={(e) => setTimelineFilter(e.target.value)}
                        className="bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2 text-sm text-slate-700 dark:text-white font-bold outline-none"
                      >
                        <option value="Todos">Todos</option>
                        <option value="Reuniões">Reuniões</option>
                        <option value="Otimizações">Otimizações</option>
                        <option value="Saldos">Saldos</option>
                        <option value="Resultado">Resultado</option>
                      </select>
                    </div>
                    
                    {/* Timeline */}
                    <div className="relative max-h-[900px] overflow-y-auto custom-scrollbar pr-2">
                      <div className="relative space-y-12 py-4">
                        {/* Vertical Line */}
                        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-slate-200 dark:bg-white/10 -translate-x-1/2" />

                        {timelineItems.filter(opt => {
                          if (timelineFilter === 'Todos') return true;
                          if (timelineFilter === 'Reuniões') return opt.type === 'meeting';
                          if (timelineFilter === 'Otimizações') return opt.optimization === 'Otimização' || opt.status === 'Otimização' || opt.type === 'Otimização' || opt.type === 'optimization';
                          if (timelineFilter === 'Saldos') return opt.message?.includes('Saldo Atual') || opt.message?.includes('Forma de Pagamento') || opt.message?.includes('Pagamento') || opt.message?.includes('Cartão');
                          if (timelineFilter === 'Resultado') return opt.status === 'Mudança de Status' || opt.message?.includes('Resultado') || opt.message?.includes('Status do Projeto');
                          return true;
                        }).map((opt, idx) => (
                          <div key={opt.id} className="relative flex items-center justify-center">
                            {/* Timeline Clock */}
                            <div className="absolute left-1/2 -translate-x-1/2 z-10">
                              <div className="w-8 h-8 rounded-full bg-white dark:bg-[#1a1625]">
                                <div className="w-full h-full rounded-full bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 flex items-center justify-center shadow-sm">
                                  <Clock size={16} className="text-violet-500" />
                                </div>
                              </div>
                            </div>

                            {/* Card */}
                            <div className={`w-[40%] p-5 rounded-2xl border transition-all bg-white dark:bg-white/5 border-slate-200 dark:border-white/5 hover:border-violet-500/20 ${idx % 2 === 0 ? 'mr-auto text-left' : 'ml-auto text-left'}`}>
                              {opt.type === 'meeting' ? (
                                <>
                                  <div className="flex items-start justify-between mb-4">
                                    <div className="flex items-center gap-3">
                                      <div className="w-12 h-12 flex flex-col items-center justify-center bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
                                        <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">{new Date(opt.rawDate).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                        <span className="text-lg font-bold text-violet-800 dark:text-violet-200">{new Date(opt.rawDate).getDate()}</span>
                                      </div>
                                      <div>
                                        <h4 className="text-sm font-bold text-slate-900 dark:text-white">{opt.title || opt.message?.split('\n')[0]}</h4>
                                        <div className="flex items-center gap-1 text-xs text-slate-500">
                                          <Users size={12} />
                                          <span>{opt.attendees}</span>
                                        </div>
                                      </div>
                                    </div>
                                    
                                    <div className="flex flex-col items-end gap-1">
                                      <div className="flex items-center gap-2">
                                        <p className="text-[10px] text-slate-500 font-medium">{formatDateShort(opt.date)} {opt.time && `às ${opt.time}`}</p>
                                        {(userData?.role?.toLowerCase() === 'superadmin' || 
                                          userData?.role?.toLowerCase() === 'super admin' || 
                                          userData?.role?.toLowerCase() === 'diretor operacional' || 
                                          userData?.role?.toLowerCase() === 'diretor-operacional' || 
                                          userData?.role?.toLowerCase() === 'diretoria') && (
                                          <>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                setMeetingData({
                                                  id: opt.id,
                                                  title: opt.title || '',
                                                  date: opt.rawDate || '',
                                                  attendees: opt.attendees || '',
                                                  actions: opt.actions || ''
                                                });
                                                setIsMeetingModalOpen(true);
                                              }}
                                              className="ml-1 text-slate-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-blue-500/10"
                                              title="Editar reunião"
                                            >
                                              <Edit2 size={12} />
                                            </button>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation();
                                                handleDeleteMeeting(opt.id);
                                              }}
                                              className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-500/10"
                                              title="Apagar reunião"
                                            >
                                              <Trash2 size={12} />
                                            </button>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                                    <p className="text-xs font-bold text-slate-500 uppercase mb-1">Próximas Ações / Acordos:</p>
                                    <div className="space-y-1">
                                      {opt.actions.split(',').map((action: string, i: number) => (
                                        <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                          <Check size={12} className="text-green-500" />
                                          {action.trim()}
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                </>
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
                                        {opt.author}
                                      </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                      <p className="text-[10px] text-slate-500 font-medium">{formatDateShort(opt.date)} {opt.time && `às ${opt.time}`}</p>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2 mb-2">
                                    <p className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase tracking-wide">{opt.productName}</p>
                                    <span className={`px-2 py-0.5 text-[10px] font-bold rounded-full uppercase whitespace-nowrap ${
                                      opt.status === 'Mudança de Status' 
                                        ? 'text-emerald-700 bg-emerald-100 dark:bg-emerald-900/30' 
                                        : 'text-violet-700 bg-violet-100 dark:bg-violet-900/30'
                                    }`}>{opt.status === 'Mudança de Status' ? 'STATUS' : 'MÉTRICAS'}</span>
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

                              {/* Replies */}
                              {opt.replies && opt.replies.length > 0 && (
                                <div className="mt-4 space-y-3">
                                  {opt.replies.map(reply => (
                                    <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-slate-100 dark:border-white/5">
                                      {reply.authorPhoto ? (
                                        <img src={reply.authorPhoto} alt={reply.author} className="w-5 h-5 rounded-full object-cover mt-0.5" referrerPolicy="no-referrer" />
                                      ) : (
                                        <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 text-[10px] font-bold mt-0.5">
                                          {reply.author.charAt(0).toUpperCase()}
                                        </div>
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <div className="flex items-baseline gap-2 mb-0.5">
                                          <p className="text-xs font-bold text-slate-900 dark:text-white">{reply.author}</p>
                                          <p className="text-[10px] text-slate-500">{formatDateShort(reply.date)} às {reply.time}</p>
                                        </div>
                                        <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">{reply.message}</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}

                              {replyingNoteId === opt.id && (
                                <div className="mt-4 flex flex-col gap-2">
                                  <textarea
                                    value={replyMessage}
                                    onChange={(e) => setReplyMessage(e.target.value)}
                                    placeholder="Escreva sua resposta..."
                                    className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none resize-none"
                                    rows={2}
                                    autoFocus
                                  />
                                  <div className="flex gap-2 justify-end">
                                    <button
                                      onClick={() => { setReplyingNoteId(null); setReplyMessage(''); }}
                                      className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                                    >
                                      Cancelar
                                    </button>
                                    <button
                                      onClick={() => {
                                        if (opt.type === 'meeting') {
                                          handleSaveMeetingReply(opt.id);
                                        } else {
                                          handleSaveReply(opt.id, opt.productId);
                                        }
                                      }}
                                      className="px-3 py-1.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                                    >
                                      Responder
                                    </button>
                                  </div>
                                </div>
                              )}

                              {/* Action Bar */}
                              <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                  <button 
                                    onClick={(e) => { 
                                      e.stopPropagation(); 
                                      if (opt.type === 'meeting') {
                                        handleToggleMeetingLike(opt.id);
                                      } else {
                                        handleToggleLike(opt.id, opt.productId); 
                                      }
                                    }}
                                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors border ${
                                      opt.likes?.includes(auth.currentUser?.email || userData?.name || 'user')
                                        ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                                        : 'text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
                                    }`}
                                  >
                                    {opt.likes?.includes(auth.currentUser?.email || userData?.name || 'user') ? (
                                      <span>👍</span>
                                    ) : (
                                      <ThumbsUp size={14} />
                                    )}
                                    {(opt.likes?.length || 0) > 0 && <span>{opt.likes?.length}</span>}
                                  </button>
                                </div>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); setReplyingNoteId(opt.id); }}
                                  className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                >
                                  Responder
                                </button>
                              </div>
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
                                <div className="flex items-start justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className="w-12 h-12 flex flex-col items-center justify-center bg-violet-50 dark:bg-violet-900/20 rounded-xl border border-violet-100 dark:border-violet-800">
                                      <span className="text-xs font-bold text-violet-600 dark:text-violet-400 uppercase">{new Date(opt.rawDate).toLocaleDateString('pt-BR', { month: 'short' })}</span>
                                      <span className="text-lg font-bold text-violet-800 dark:text-violet-200">{new Date(opt.rawDate).getDate()}</span>
                                    </div>
                                    <div>
                                      <h4 className="text-sm font-bold text-slate-900 dark:text-white">{opt.title || opt.message?.split('\n')[0]}</h4>
                                      <div className="flex items-center gap-1 text-xs text-slate-500">
                                        <Users size={12} />
                                        <span>{opt.attendees}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex flex-col items-end gap-1">
                                    <div className="flex items-center gap-2">
                                      <p className="text-[10px] text-slate-500 font-medium">{formatDateShort(opt.date)} {opt.time && `às ${opt.time}`}</p>
                                      {(userData?.role?.toLowerCase() === 'superadmin' || 
                                        userData?.role?.toLowerCase() === 'super admin' || 
                                        userData?.role?.toLowerCase() === 'diretor operacional' || 
                                        userData?.role?.toLowerCase() === 'diretor-operacional' || 
                                        userData?.role?.toLowerCase() === 'diretoria') && (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setMeetingData({
                                                id: opt.id,
                                                title: opt.title || '',
                                                date: opt.rawDate || '',
                                                attendees: opt.attendees || '',
                                                actions: opt.actions || ''
                                              });
                                              setIsMeetingModalOpen(true);
                                            }}
                                            className="ml-1 text-slate-400 hover:text-blue-500 transition-colors p-1 rounded-md hover:bg-blue-500/10"
                                            title="Editar reunião"
                                          >
                                            <Edit2 size={12} />
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleDeleteMeeting(opt.id);
                                            }}
                                            className="text-slate-400 hover:text-rose-500 transition-colors p-1 rounded-md hover:bg-rose-500/10"
                                            title="Apagar reunião"
                                          >
                                            <Trash2 size={12} />
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                                <div className="border-t border-slate-100 dark:border-white/5 pt-3">
                                  <p className="text-xs font-bold text-slate-500 uppercase mb-1">Próximas Ações / Acordos:</p>
                                  <div className="space-y-1">
                                    {opt.actions.split(',').map((action: string, i: number) => (
                                      <div key={i} className="flex items-center gap-2 text-xs text-slate-600 dark:text-slate-400">
                                        <Check size={12} className="text-green-500" />
                                        {action.trim()}
                                      </div>
                                    ))}
                                  </div>
                                </div>

                                {/* Replies Display */}
                                {opt.replies && opt.replies.length > 0 && (
                                  <div className="mt-4 space-y-3">
                                    {opt.replies.map((reply: any) => (
                                      <div key={reply.id} className="flex items-start gap-3 pl-4 border-l-2 border-slate-100 dark:border-white/5">
                                        {reply.authorPhoto ? (
                                          <img src={reply.authorPhoto} alt={reply.author} className="w-5 h-5 rounded-full object-cover mt-0.5" referrerPolicy="no-referrer" />
                                        ) : (
                                          <div className="w-5 h-5 rounded-full bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-500 text-[10px] font-bold mt-0.5">
                                            {reply.author.charAt(0).toUpperCase()}
                                          </div>
                                        )}
                                        <div className="flex-1 min-w-0">
                                          <div className="flex items-baseline gap-2 mb-0.5">
                                            <p className="text-xs font-bold text-slate-900 dark:text-white">{reply.author}</p>
                                            <p className="text-[10px] text-slate-500">{formatDateShort(reply.date)} às {reply.time}</p>
                                          </div>
                                          <p className="text-xs text-slate-600 dark:text-slate-400 whitespace-pre-line">{reply.message}</p>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}

                                {/* Reply Input */}
                                {replyingNoteId === opt.id && (
                                  <div className="mt-4 flex flex-col gap-2">
                                    <textarea
                                      value={replyMessage}
                                      onChange={(e) => setReplyMessage(e.target.value)}
                                      placeholder="Escreva sua resposta..."
                                      className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-slate-900 dark:text-white outline-none resize-none"
                                      rows={2}
                                      autoFocus
                                    />
                                    <div className="flex gap-2 justify-end">
                                      <button
                                        onClick={() => { setReplyingNoteId(null); setReplyMessage(''); }}
                                        className="px-3 py-1.5 text-xs font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors"
                                      >
                                        Cancelar
                                      </button>
                                      <button
                                        onClick={() => handleSaveMeetingReply(opt.id)}
                                        className="px-3 py-1.5 text-xs font-bold text-white bg-violet-500 hover:bg-violet-600 rounded-lg transition-colors"
                                      >
                                        Responder
                                      </button>
                                    </div>
                                  </div>
                                )}

                                {/* Action Bar */}
                                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5 flex items-center justify-between">
                                  <div className="flex items-center gap-2">
                                    <button 
                                      onClick={(e) => { 
                                        e.stopPropagation(); 
                                        handleToggleMeetingLike(opt.id);
                                      }}
                                      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold transition-colors border ${
                                        opt.likes?.includes(auth.currentUser?.email || userData?.name || 'user')
                                          ? 'bg-slate-100 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-700 dark:text-white'
                                          : 'text-slate-400 border-transparent hover:bg-slate-100 dark:hover:bg-white/5'
                                      }`}
                                    >
                                      {opt.likes?.includes(auth.currentUser?.email || userData?.name || 'user') ? (
                                        <span>👍</span>
                                      ) : (
                                        <ThumbsUp size={14} />
                                      )}
                                      {(opt.likes?.length || 0) > 0 && <span>{opt.likes?.length}</span>}
                                    </button>
                                  </div>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); setReplyingNoteId(opt.id); }}
                                    className="text-xs font-bold text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors"
                                  >
                                    Responder
                                  </button>
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

                {activeProjectTab === 'nps' && (
                  <div className="flex flex-col py-8 px-4">
                    {/* Link Section */}
                    <div className="flex flex-col items-center justify-center pb-10 gap-3 border-b border-slate-200 dark:border-white/5 mb-10">
                      <div className="w-12 h-12 rounded-2xl bg-violet-500/10 flex items-center justify-center mb-1">
                        <Star size={22} className="text-violet-500" />
                      </div>
                      <h3 className="text-xl font-bold text-slate-800 dark:text-white">Pesquisa de qualidade</h3>
                      <p className="text-sm text-slate-500 text-center max-w-sm">Copie o link abaixo e envie para o cliente avaliar o projeto e a parceria.</p>
                      <div className="flex items-center gap-2 mt-2 w-full max-w-lg">
                        <input
                          type="text"
                          readOnly
                          value={`${window.location.origin}/nps/${selectedProject.id}`}
                          className="flex-1 px-4 py-2.5 bg-slate-100 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl text-sm text-slate-500 outline-none"
                        />
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(`${window.location.origin}/nps/${selectedProject.id}`);
                            alert('Link copiado para a área de transferência!');
                          }}
                          className="px-5 py-2.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl font-bold transition-all flex items-center gap-2 shrink-0 text-sm"
                        >
                          <Copy size={14} /> Copiar Link
                        </button>
                      </div>
                    </div>

                    {/* Results */}
                    <div className="w-full">
                      <div className="flex items-center justify-between mb-6">
                        <h4 className="text-base font-bold text-slate-800 dark:text-white">
                          Respostas <span className="ml-2 px-2.5 py-0.5 bg-violet-500/10 text-violet-600 dark:text-violet-400 rounded-full text-sm font-bold">{npsResponses.length}</span>
                        </h4>
                      </div>

                      {isNpsLoading ? (
                        <div className="flex justify-center py-16"><Loader2 className="w-6 h-6 text-violet-500 animate-spin" /></div>
                      ) : npsResponses.length === 0 ? (
                        <div className="flex flex-col items-center justify-center py-16 text-slate-400 bg-slate-50 dark:bg-white/[0.02] rounded-2xl border border-slate-200 dark:border-white/5">
                          <Star size={32} className="mb-3 opacity-30" />
                          <p className="text-sm font-medium">Nenhuma avaliação recebida ainda.</p>
                        </div>
                      ) : (
                        <div className="space-y-8">
                          {npsResponses.map((res, i) => {
                            const avg = ((res.response_time_score || 0) + (res.project_result_score || 0) + (res.paid_traffic_score || 0) + (res.operations_manager_score || 0)) / 4;
                            const avgColor = avg >= 4 ? 'text-emerald-500' : avg >= 3 ? 'text-amber-500' : 'text-rose-500';
                            const avgBg = avg >= 4 ? 'from-emerald-500/10 to-transparent' : avg >= 3 ? 'from-amber-500/10 to-transparent' : 'from-rose-500/10 to-transparent';
                            const avgBorder = avg >= 4 ? 'border-emerald-500/20' : avg >= 3 ? 'border-amber-500/20' : 'border-rose-500/20';
                            const pct = (s: number) => Math.round((s / 5) * 100);
                            const circumference = 2 * Math.PI * 20;

                            const metrics = [
                              { label: 'Tempo de resposta e atendimento', score: res.response_time_score, color: 'stroke-blue-500', bg: 'bg-blue-500/10 border-blue-500/20', text: 'text-blue-500' },
                              { label: 'Resultado do projeto', score: res.project_result_score, color: 'stroke-violet-500', bg: 'bg-violet-500/10 border-violet-500/20', text: 'text-violet-500' },
                              { label: 'Satisfação com o Tráfego Pago', score: res.paid_traffic_score, color: 'stroke-emerald-500', bg: 'bg-emerald-500/10 border-emerald-500/20', text: 'text-emerald-500' },
                              { label: 'Gerente de Operações', score: res.operations_manager_score, color: 'stroke-amber-500', bg: 'bg-amber-500/10 border-amber-500/20', text: 'text-amber-500' },
                            ];

                            return (
                              <div key={i} className={`bg-light-card dark:bg-dark-card border ${avgBorder} rounded-3xl overflow-hidden shadow-sm`}>
                                {/* Header */}
                                <div className={`bg-gradient-to-r ${avgBg} px-6 py-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between`}>
                                  <div className="flex items-center gap-4">
                                    <div className="w-11 h-11 rounded-2xl bg-slate-200 dark:bg-white/10 flex items-center justify-center text-slate-700 dark:text-white font-black text-lg">
                                      {(res.office || '?')[0].toUpperCase()}
                                    </div>
                                    <div>
                                      <h5 className="font-bold text-slate-800 dark:text-white text-base leading-tight">{res.office}</h5>
                                      <p className="text-xs text-slate-400 mt-0.5">{new Date(res.created_at).toLocaleString('pt-BR')}</p>
                                    </div>
                                  </div>
                                  {/* Satisfaction overall */}
                                  <div className="flex flex-col items-end gap-1.5">
                                    <span className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">Satisfação geral</span>
                                    <div className="flex items-center gap-1">
                                      {[1,2,3,4,5].map(star => (
                                        <Star key={star} size={18} className={res.grape_satisfaction >= star ? 'text-violet-500 fill-violet-500' : 'text-slate-200 dark:text-white/10 fill-slate-200 dark:fill-white/10'} />
                                      ))}
                                      <span className={`ml-2 text-lg font-black ${avgColor}`}>{res.grape_satisfaction}/5</span>
                                    </div>
                                  </div>
                                </div>

                                {/* Score Metrics Grid */}
                                <div className="grid grid-cols-2 md:grid-cols-4 gap-px bg-slate-100 dark:bg-white/5">
                                  {metrics.map((m, mi) => (
                                    <div key={mi} className="bg-light-card dark:bg-dark-card p-5 flex flex-col items-center gap-3">
                                      {/* Circular Ring */}
                                      <div className="relative w-14 h-14">
                                        <svg className="w-14 h-14 -rotate-90" viewBox="0 0 48 48">
                                          <circle cx="24" cy="24" r="20" fill="none" stroke="currentColor" strokeWidth="4" className="text-slate-100 dark:text-white/5" />
                                          <circle
                                            cx="24" cy="24" r="20" fill="none" strokeWidth="4"
                                            className={m.color}
                                            strokeDasharray={circumference}
                                            strokeDashoffset={circumference - (circumference * pct(m.score)) / 100}
                                            strokeLinecap="round"
                                          />
                                        </svg>
                                        <div className="absolute inset-0 flex items-center justify-center">
                                          <span className="text-sm font-black text-slate-800 dark:text-white">{m.score}</span>
                                        </div>
                                      </div>
                                      <p className="text-[11px] text-slate-500 dark:text-slate-400 text-center leading-tight">{m.label}</p>
                                    </div>
                                  ))}
                                </div>

                                {/* Text Feedbacks */}
                                {(res.improvements || res.other_services) && (
                                  <div className="p-6 space-y-4">
                                    {res.improvements && (
                                      <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4 flex gap-4">
                                        <div className="w-1 shrink-0 rounded-full bg-gradient-to-b from-violet-500 to-violet-500/20" />
                                        <div>
                                          <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 uppercase tracking-widest block mb-2">Pontos de melhoria</span>
                                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{res.improvements}</p>
                                        </div>
                                      </div>
                                    )}
                                    {res.other_services && (
                                      <div className="rounded-2xl border border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/[0.02] p-4 flex gap-4">
                                        <div className="w-1 shrink-0 rounded-full bg-gradient-to-b from-emerald-500 to-emerald-500/20" />
                                        <div>
                                          <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase tracking-widest block mb-2">Outros serviços desejados</span>
                                          <p className="text-sm text-slate-700 dark:text-slate-300 leading-relaxed">{res.other_services}</p>
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
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
      <Modal
        isOpen={!!productToDelete}
        onClose={() => setProductToDelete(null)}
        title="Confirmar exclusão do produto"
        maxWidth="max-w-md"
        footer={
          <>
            <button 
              onClick={() => setProductToDelete(null)}
              className={designSystem.button.secondary}
            >
              Cancelar
            </button>
            <button 
              onClick={confirmDeleteProduct}
              className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors"
            >
              Excluir
            </button>
          </>
        }
      >
        <p className="text-slate-600 dark:text-slate-300">
          Tem certeza que deseja excluir este produto? Todas as otimizações vinculadas também serão removidas.
        </p>
      </Modal>
    </div>


    {/* Image Preview Modal */}
    <AnimatePresence>
      {previewImage && (
        <div className="fixed inset-0 z-[2000] flex items-center justify-center p-4">
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
