import React, { useState, useRef, useEffect } from 'react';
import OptionPicker from './ui/OptionPicker';
import ReactDOM from 'react-dom';
import { Layers, Plus, Save, Loader2, FolderPlus, Edit, Trash2, Folder, FileText, ChevronUp, ChevronDown, GripVertical, Users, Settings, Bell, Check, X, Search, Lock, Unlock, Database, FolderOpen, Home, Briefcase, BarChart2, PieChart, Activity, Calendar, MessageSquare, Mail, Image, Video, Music, Map, ShoppingCart, CreditCard, DollarSign, Percent, Tag, Bookmark, Star, Heart, Shield, Zap, TrendingUp, TrendingDown, Target, Award, Compass, Navigation, MapPin, Phone, Smartphone, Monitor, Laptop, Server, HardDrive, Cpu, Wifi, Bluetooth, Battery, Cloud, Sun, Moon, Umbrella, Wind, Droplet, Flame, PersonStanding, Swords, UsersRound,
  // New icons
  LayoutDashboard, LayoutGrid, LayoutList, Columns, Rows, Grid, Table, List, SidebarOpen, PanelLeft,
  BookOpen, BookMarked, Book, ClipboardList, Clipboard, ClipboardCheck, NotepadText, NotebookPen, Notebook,
  LineChart, AreaChart, BarChart, ScatterChart, Gauge, Sigma, Binary, Hash, Calculator,
  Building, Building2, Landmark, Store, Warehouse, Factory, Hotel, Church,
  UserCheck, UserPlus, UserCircle, UserCog, UserSearch, Contact, Handshake, HeartHandshake, PersonStandingIcon,
  Megaphone, Mic, Radio, Rss, Send, SendHorizonal, Share2, Share, Link, Link2, Globe, Globe2, ExternalLink,
  Box, Package, PackageOpen, Archive, Inbox, Layers3, Blocks, Component,
  Clock, Timer, AlarmClock, Hourglass, CalendarDays, CalendarCheck, CalendarRange, CalendarClock,
  Rocket, Plane, Car, Truck, Ship, Train, Bus, Bike, Sailboat,
  ShoppingBag, Receipt, Banknote, Coins, Wallet, PiggyBank, BadgeDollarSign, TrendingUpIcon,
  Wrench, Hammer, Ruler, Scissors, Pen, Pencil, HighlighterIcon,
  Camera, Film, Tv, Speaker, Headphones, Gamepad2, Joystick,
  Apple, Coffee, Pizza, Utensils, Wine, Beer, Cookie,
  Leaf, Flower, Flower2, Sprout, Clover,
  Trophy, Medal, Ribbon, Crown, Gem, Diamond, CircleDollarSign,
  AlertCircle, AlertTriangle, Info, HelpCircle, MessageCircle, MessagesSquare, BotMessageSquare,
  Code, Code2, Terminal, Bug, GitBranch, GitCommit, Github, Gitlab,
  Key, KeyRound, Fingerprint, Eye, EyeOff, ShieldCheck, ShieldAlert, ShieldX,
  Printer, ScanLine, QrCode, Barcode, Nfc, CreditCardIcon,
  Route, Milestone, Flag, FlagOff, Signpost,
  Accessibility, Dumbbell, HeartPulse, Stethoscope, Pill, Syringe, Microscope, FlaskConical,
  Lightbulb, Flashlight, Lamp, LampDesk, Sparkles, Wand2,
  ChevronRight, ChevronLeft, ArrowRight, ArrowLeft, ArrowUp, ArrowDown, MoveRight, CornerDownRight
} from 'lucide-react';
import Soldier from './icons/Soldier';
import Squad from './icons/Squad';
import ColorSelector from './ColorSelector';
import { useMenu } from '../context/MenuContext';
import EstruturaMenu from './EstruturaMenu';
import { toast } from '@/src/lib/toast';

const availableIcons = [
  // ── Custom ──────────────────────────────────────────────────────
  { name: 'Soldier', component: Soldier },
  { name: 'Squad', component: Squad },
  { name: 'Swords', component: Swords },
  { name: 'PersonStanding', component: PersonStanding },

  // ── Navigation & Layout ─────────────────────────────────────────
  { name: 'Home', component: Home },
  { name: 'LayoutDashboard', component: LayoutDashboard },
  { name: 'LayoutGrid', component: LayoutGrid },
  { name: 'LayoutList', component: LayoutList },
  { name: 'Columns', component: Columns },
  { name: 'Rows', component: Rows },
  { name: 'Grid', component: Grid },
  { name: 'Table', component: Table },
  { name: 'List', component: List },
  { name: 'SidebarOpen', component: SidebarOpen },
  { name: 'Layers', component: Layers },
  { name: 'Layers3', component: Layers3 },
  { name: 'Blocks', component: Blocks },
  { name: 'Component', component: Component },
  { name: 'ChevronRight', component: ChevronRight },
  { name: 'ChevronLeft', component: ChevronLeft },
  { name: 'ChevronUp', component: ChevronUp },
  { name: 'ChevronDown', component: ChevronDown },
  { name: 'ArrowRight', component: ArrowRight },
  { name: 'ArrowLeft', component: ArrowLeft },
  { name: 'ArrowUp', component: ArrowUp },
  { name: 'ArrowDown', component: ArrowDown },
  { name: 'CornerDownRight', component: CornerDownRight },

  // ── Analytics & Charts ───────────────────────────────────────────
  { name: 'BarChart2', component: BarChart2 },
  { name: 'BarChart', component: BarChart },
  { name: 'PieChart', component: PieChart },
  { name: 'LineChart', component: LineChart },
  { name: 'AreaChart', component: AreaChart },
  { name: 'ScatterChart', component: ScatterChart },
  { name: 'Activity', component: Activity },
  { name: 'TrendingUp', component: TrendingUp },
  { name: 'TrendingDown', component: TrendingDown },
  { name: 'Gauge', component: Gauge },
  { name: 'Sigma', component: Sigma },
  { name: 'Calculator', component: Calculator },
  { name: 'Target', component: Target },

  // ── Business & Work ──────────────────────────────────────────────
  { name: 'Briefcase', component: Briefcase },
  { name: 'Building', component: Building },
  { name: 'Building2', component: Building2 },
  { name: 'Landmark', component: Landmark },
  { name: 'Store', component: Store },
  { name: 'Warehouse', component: Warehouse },
  { name: 'Factory', component: Factory },
  { name: 'Hotel', component: Hotel },
  { name: 'Handshake', component: Handshake },
  { name: 'HeartHandshake', component: HeartHandshake },
  { name: 'ClipboardList', component: ClipboardList },
  { name: 'Clipboard', component: Clipboard },
  { name: 'ClipboardCheck', component: ClipboardCheck },
  { name: 'NotepadText', component: NotepadText },
  { name: 'Notebook', component: Notebook },
  { name: 'NotebookPen', component: NotebookPen },

  // ── People & Users ───────────────────────────────────────────────
  { name: 'Users', component: Users },
  { name: 'UsersRound', component: UsersRound },
  { name: 'UserCheck', component: UserCheck },
  { name: 'UserPlus', component: UserPlus },
  { name: 'UserCircle', component: UserCircle },
  { name: 'UserCog', component: UserCog },
  { name: 'UserSearch', component: UserSearch },
  { name: 'Contact', component: Contact },

  // ── Communication ────────────────────────────────────────────────
  { name: 'Mail', component: Mail },
  { name: 'MessageSquare', component: MessageSquare },
  { name: 'MessageCircle', component: MessageCircle },
  { name: 'MessagesSquare', component: MessagesSquare },
  { name: 'BotMessageSquare', component: BotMessageSquare },
  { name: 'Phone', component: Phone },
  { name: 'Smartphone', component: Smartphone },
  { name: 'Megaphone', component: Megaphone },
  { name: 'Mic', component: Mic },
  { name: 'Radio', component: Radio },
  { name: 'Rss', component: Rss },
  { name: 'Send', component: Send },
  { name: 'SendHorizonal', component: SendHorizonal },
  { name: 'Share2', component: Share2 },
  { name: 'Link', component: Link },
  { name: 'Link2', component: Link2 },
  { name: 'Globe', component: Globe },
  { name: 'Globe2', component: Globe2 },
  { name: 'ExternalLink', component: ExternalLink },
  { name: 'Bell', component: Bell },

  // ── Files & Folders ──────────────────────────────────────────────
  { name: 'Folder', component: Folder },
  { name: 'FolderOpen', component: FolderOpen },
  { name: 'FolderPlus', component: FolderPlus },
  { name: 'FileText', component: FileText },
  { name: 'Book', component: Book },
  { name: 'BookOpen', component: BookOpen },
  { name: 'BookMarked', component: BookMarked },
  { name: 'Database', component: Database },
  { name: 'Archive', component: Archive },
  { name: 'Inbox', component: Inbox },
  { name: 'Box', component: Box },
  { name: 'Package', component: Package },
  { name: 'PackageOpen', component: PackageOpen },
  { name: 'Save', component: Save },

  // ── Time & Calendar ──────────────────────────────────────────────
  { name: 'Calendar', component: Calendar },
  { name: 'CalendarDays', component: CalendarDays },
  { name: 'CalendarCheck', component: CalendarCheck },
  { name: 'CalendarRange', component: CalendarRange },
  { name: 'CalendarClock', component: CalendarClock },
  { name: 'Clock', component: Clock },
  { name: 'Timer', component: Timer },
  { name: 'AlarmClock', component: AlarmClock },
  { name: 'Hourglass', component: Hourglass },

  // ── Commerce & Finance ───────────────────────────────────────────
  { name: 'ShoppingCart', component: ShoppingCart },
  { name: 'ShoppingBag', component: ShoppingBag },
  { name: 'CreditCard', component: CreditCard },
  { name: 'Receipt', component: Receipt },
  { name: 'DollarSign', component: DollarSign },
  { name: 'Banknote', component: Banknote },
  { name: 'Coins', component: Coins },
  { name: 'Wallet', component: Wallet },
  { name: 'PiggyBank', component: PiggyBank },
  { name: 'BadgeDollarSign', component: BadgeDollarSign },
  { name: 'Percent', component: Percent },
  { name: 'CircleDollarSign', component: CircleDollarSign },

  // ── Security ─────────────────────────────────────────────────────
  { name: 'Shield', component: Shield },
  { name: 'ShieldCheck', component: ShieldCheck },
  { name: 'ShieldAlert', component: ShieldAlert },
  { name: 'ShieldX', component: ShieldX },
  { name: 'Lock', component: Lock },
  { name: 'Unlock', component: Unlock },
  { name: 'Key', component: Key },
  { name: 'KeyRound', component: KeyRound },
  { name: 'Fingerprint', component: Fingerprint },
  { name: 'Eye', component: Eye },
  { name: 'EyeOff', component: EyeOff },

  // ── Technology ───────────────────────────────────────────────────
  { name: 'Monitor', component: Monitor },
  { name: 'Laptop', component: Laptop },
  { name: 'Server', component: Server },
  { name: 'HardDrive', component: HardDrive },
  { name: 'Cpu', component: Cpu },
  { name: 'Wifi', component: Wifi },
  { name: 'Bluetooth', component: Bluetooth },
  { name: 'Battery', component: Battery },
  { name: 'Cloud', component: Cloud },
  { name: 'Code', component: Code },
  { name: 'Code2', component: Code2 },
  { name: 'Terminal', component: Terminal },
  { name: 'Bug', component: Bug },
  { name: 'GitBranch', component: GitBranch },
  { name: 'Github', component: Github },
  { name: 'QrCode', component: QrCode },
  { name: 'Barcode', component: Barcode },
  { name: 'Printer', component: Printer },
  { name: 'Camera', component: Camera },
  { name: 'Video', component: Video },
  { name: 'Tv', component: Tv },
  { name: 'Speaker', component: Speaker },
  { name: 'Headphones', component: Headphones },
  { name: 'Gamepad2', component: Gamepad2 },
  { name: 'Nfc', component: Nfc },

  // ── Transport ────────────────────────────────────────────────────
  { name: 'Rocket', component: Rocket },
  { name: 'Plane', component: Plane },
  { name: 'Car', component: Car },
  { name: 'Truck', component: Truck },
  { name: 'Ship', component: Ship },
  { name: 'Train', component: Train },
  { name: 'Bus', component: Bus },
  { name: 'Bike', component: Bike },
  { name: 'Map', component: Map },
  { name: 'MapPin', component: MapPin },
  { name: 'Navigation', component: Navigation },
  { name: 'Compass', component: Compass },
  { name: 'Route', component: Route },
  { name: 'Milestone', component: Milestone },
  { name: 'Flag', component: Flag },
  { name: 'Signpost', component: Signpost },

  // ── Nature & Weather ─────────────────────────────────────────────
  { name: 'Sun', component: Sun },
  { name: 'Moon', component: Moon },
  { name: 'Cloud', component: Cloud },
  { name: 'Umbrella', component: Umbrella },
  { name: 'Wind', component: Wind },
  { name: 'Droplet', component: Droplet },
  { name: 'Flame', component: Flame },
  { name: 'Leaf', component: Leaf },
  { name: 'Flower', component: Flower },
  { name: 'Flower2', component: Flower2 },
  { name: 'Sprout', component: Sprout },
  { name: 'Clover', component: Clover },

  // ── Health & Science ─────────────────────────────────────────────
  { name: 'Heart', component: Heart },
  { name: 'HeartPulse', component: HeartPulse },
  { name: 'Stethoscope', component: Stethoscope },
  { name: 'Pill', component: Pill },
  { name: 'Syringe', component: Syringe },
  { name: 'Microscope', component: Microscope },
  { name: 'FlaskConical', component: FlaskConical },
  { name: 'Dumbbell', component: Dumbbell },
  { name: 'Accessibility', component: Accessibility },
  { name: 'Apple', component: Apple },
  { name: 'Coffee', component: Coffee },
  { name: 'Utensils', component: Utensils },

  // ── Awards & Achievement ─────────────────────────────────────────
  { name: 'Award', component: Award },
  { name: 'Trophy', component: Trophy },
  { name: 'Medal', component: Medal },
  { name: 'Crown', component: Crown },
  { name: 'Gem', component: Gem },
  { name: 'Diamond', component: Diamond },
  { name: 'Star', component: Star },
  { name: 'Ribbon', component: Ribbon },
  { name: 'Sparkles', component: Sparkles },
  { name: 'Zap', component: Zap },

  // ── Tools & Creation ─────────────────────────────────────────────
  { name: 'Settings', component: Settings },
  { name: 'Wrench', component: Wrench },
  { name: 'Hammer', component: Hammer },
  { name: 'Ruler', component: Ruler },
  { name: 'Scissors', component: Scissors },
  { name: 'Pen', component: Pen },
  { name: 'Pencil', component: Pencil },
  { name: 'Edit', component: Edit },
  { name: 'Lightbulb', component: Lightbulb },
  { name: 'Wand2', component: Wand2 },
  { name: 'Music', component: Music },
  { name: 'Image', component: Image },

  // ── Info & Status ────────────────────────────────────────────────
  { name: 'Info', component: Info },
  { name: 'AlertCircle', component: AlertCircle },
  { name: 'AlertTriangle', component: AlertTriangle },
  { name: 'HelpCircle', component: HelpCircle },
  { name: 'Check', component: Check },
  { name: 'X', component: X },
  { name: 'Search', component: Search },
  { name: 'Tag', component: Tag },
  { name: 'Bookmark', component: Bookmark },
  { name: 'Hash', component: Hash },
  { name: 'Plus', component: Plus },
  { name: 'GripVertical', component: GripVertical },
];

const IconSelector = ({ value, onChange }: { value: string, onChange: (icon: string) => void }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const buttonRef = useRef<HTMLButtonElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [dropdownPos, setDropdownPos] = useState<{ top: number; left: number; width: number; openUp: boolean }>({ top: 0, left: 0, width: 0, openUp: false });

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current && !dropdownRef.current.contains(event.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
        setSearch('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (isOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      const openUp = spaceBelow < 500;
      setDropdownPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 320),
        openUp,
      });
    }
  }, [isOpen]);

  const selectedIcon = availableIcons.find(i => i.name === value) || availableIcons[0];
  const SelectedIconComponent = selectedIcon.component;

  const filteredIcons = search
    ? availableIcons.filter(i => i.name.toLowerCase().includes(search.toLowerCase()))
    : availableIcons;

  return (
    <div className="relative w-full">
      <button
        ref={buttonRef}
        type="button"
        onClick={() => { setIsOpen(!isOpen); setSearch(''); }}
        className="w-full flex items-center justify-between bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20"
      >
        <div className="flex items-center gap-2">
          <SelectedIconComponent size={18} />
          <span>{selectedIcon.name}</span>
        </div>
        <ChevronDown size={16} />
      </button>
      {isOpen && ReactDOM.createPortal(
        <div
          ref={dropdownRef}
          className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl flex flex-col"
          style={{
            position: 'fixed',
            zIndex: 9999,
            left: dropdownPos.left,
            width: dropdownPos.width,
            maxHeight: 480,
            ...(dropdownPos.openUp
              ? { bottom: window.innerHeight - dropdownPos.top }
              : { top: dropdownPos.top }),
          }}
        >
          <div className="p-2 border-b border-slate-200 dark:border-white/10">
            <input
              type="text"
              placeholder="Buscar ícone..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              autoFocus
              className="w-full bg-slate-50 dark:bg-dark-bg/50 border border-slate-200 dark:border-white/5 rounded-lg px-3 py-1.5 text-sm text-light-text dark:text-white placeholder:text-slate-400 outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>
          <div className="overflow-y-auto flex-1">
            {filteredIcons.length === 0 && (
              <div className="px-4 py-3 text-sm text-slate-400">Nenhum ícone encontrado</div>
            )}
            {filteredIcons.map(icon => {
              const IconComponent = icon.component;
              return (
                <button
                  key={icon.name}
                  type="button"
                  onClick={() => { onChange(icon.name); setIsOpen(false); setSearch(''); }}
                  className={`w-full flex items-center gap-3 px-4 py-2 hover:bg-violet-500/10 text-sm text-light-text dark:text-white ${icon.name === value ? 'bg-violet-500/10 font-medium' : ''}`}
                >
                  <IconComponent size={18} />
                  {icon.name}
                </button>
              );
            })}
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

const templates = (() => {
  const list = [
    { id: 'automacoes', label: 'Automações' },
    { id: 'closer', label: 'Calculadora Closer' },
    { id: 'contratos', label: 'Calculadora por Contratos' },
    { id: 'comercial-grape', label: 'Calculadora Comercial' },
    { id: 'gestor', label: 'Calculadora Gestor' },
    { id: 'gerente-operacional', label: 'Calculadora Gerente Operacional' },
    { id: 'sdr', label: 'Calculadora SDR' },
    { id: 'chamados-grapehub', label: 'Chamados Grapehub' },
    { id: 'ideais-criativos', label: 'Ideais Criativos' },

    { id: 'checklist-integracao', label: 'Checklist Integração' },
    { id: 'checklist-saida', label: 'Checklist Saída' },
    { id: 'colaboradores', label: 'Colaboradores' },
    { id: 'minha-equipe', label: 'Minha Equipe' },
    { id: 'contas-a-pagar', label: 'Contas a Pagar' },
    { id: 'contas-a-receber', label: 'Contas a Receber' },
    { id: 'contratacao', label: 'Contratação' },
    { id: 'crm-atividades', label: 'CRM Atividades' },
    { id: 'crm-comercial', label: 'CRM Comercial' },
    { id: 'crm-empresas', label: 'CRM Empresas' },
    { id: 'crm-metas', label: 'CRM Metas' },
    { id: 'crm-pessoas', label: 'CRM Pessoas' },
    { id: 'crm-sequencias', label: 'CRM Sequências' },
    { id: 'gestor-dashboard', label: 'Dashboard Gestor' },
    { id: 'marketing-dashboard', label: 'Dashboard Marketing' },
    { id: 'dashboard-operacional', label: 'Dashboard Operacional' },
    { id: 'dashboard-head', label: 'Dashboard Head' },
    { id: 'diferenciais', label: 'Diferenciais' },
    { id: 'implementacao-ia', label: 'Implementação IA' },
    { id: 'kpis-squad', label: 'KPIs Squad' },
    { id: 'lista', label: 'Lista' },
    { id: 'task-templates', label: 'Modelos de Tarefas' },
    { id: 'meeting-notes', label: 'Notas de Reunião' },
    { id: 'head-operacao', label: 'Calculadora Head de Operação' },
    { id: 'cursos', label: 'Central de Treinamentos' },
    { id: 'estudio', label: 'Estúdio de Vídeo' },
    { id: 'onboarding-operacional', label: 'Onboarding Operacional' },
    { id: 'parceiros-squad', label: 'Parceiros Squad' },
    { id: 'planejamento-crescimento', label: 'Planejamento de Crescimento' },
    { id: 'planos-de-carreira', label: 'Planos de Carreira' },
    { id: 'playbook-acoes', label: 'Playbook de Ações' },
    { id: 'senhas', label: 'Senhas e Logins' },
    { id: 'projects', label: 'Projetos (Projects)' },
    { id: 'todo', label: 'Tarefas (Todo)' },
    { id: 'todo-staff', label: 'To Do (Staff)' },
    { id: 'visual-hub', label: 'VisualHub' },
    { id: 'bolao', label: 'Bolão da Copa' },

  ];
  return [{ id: 'blank', label: 'Em Branco' }, ...list.sort((a, b) => a.label.localeCompare(b.label, 'pt-BR'))];
})();

export const PageManager: React.FC = () => {
  const { menu, setMenu, refreshMenu } = useMenu();
  const [activeTab, setActiveTab] = useState<'create-page' | 'create-section' | 'create-sub' | 'create-subsub' | 'manage'>('manage');
  const [isAdding, setIsAdding] = useState(false);
  
  // Form states
  const [pageData, setPageData] = useState({ id: '', label: '', icon: 'FileText', icon_color: '#64748b', template: 'blank', subsubsession_id: '', subsession_id: '', section_id: '' });
  const [sectionData, setSectionData] = useState({ id: '', title: '', icon: 'Folder', icon_color: '#64748b' });
  const [subData, setSubData] = useState({ id: '', section_id: '', label: '', icon: 'Folder', icon_color: '#64748b' });
  const [subsubData, setSubsubData] = useState({ id: '', subsession_id: '', section_id: '', label: '', icon: 'FolderOpen', icon_color: '#64748b' });

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageData.id || !pageData.label || (!pageData.subsubsession_id && !pageData.subsession_id && !pageData.section_id)) return toast.error('Preencha todos os campos obrigatórios.');
    setIsAdding(true);
    try {
      const payload = {
          ...pageData,
          subsubsession_id: pageData.subsubsession_id || null,
          subsession_id: pageData.subsession_id || null,
          section_id: pageData.section_id || null
      };
      const res = await fetch('/api/menu/pages', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      if (res.ok) {
        toast.success('Página criada com sucesso!');
        await refreshMenu();
        setPageData({ id: '', label: '', icon: 'FileText', icon_color: '#64748b', template: 'blank', subsubsession_id: '', subsession_id: '', section_id: '' });
      } else toast.error('Erro ao criar página.');
    } catch (err) { console.error(err); toast.error('Erro ao criar página.'); } finally { setIsAdding(false); }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionData.id || !sectionData.title) return toast.error('Preencha todos os campos obrigatórios.');
    setIsAdding(true);
    try {
      const res = await fetch('/api/menu/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sectionData) });
      if (res.ok) {
        toast.success('Seção criada com sucesso!');
        await refreshMenu();
        setSectionData({ id: '', title: '', icon: 'Folder', icon_color: '#64748b' });
      } else toast.error('Erro ao criar seção.');
    } catch (err) { console.error(err); toast.error('Erro ao criar seção.'); } finally { setIsAdding(false); }
  };

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subData.id || !subData.label || !subData.section_id) return toast.error('Preencha todos os campos obrigatórios.');
    setIsAdding(true);
    try {
      const res = await fetch('/api/menu/subsessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subData) });
      if (res.ok) {
        toast.success('Pasta criada.');
        await refreshMenu();
        setSubData({ id: '', section_id: '', label: '', icon: 'Folder', icon_color: '#64748b' });
      } else toast.error('Erro ao criar pasta.');
    } catch (err) { console.error(err); toast.error('Erro ao criar pasta.'); } finally { setIsAdding(false); }
  };

  const handleCreateSubsub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subsubData.id || !subsubData.label || (!subsubData.subsession_id && !subsubData.section_id)) return toast.error('Preencha todos os campos obrigatórios.');
    setIsAdding(true);
    try {
      const res = await fetch('/api/menu/subsubsessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subsubData) });
      if (res.ok) {
        toast.success('Subpasta criada.');
        await refreshMenu();
        setSubsubData({ id: '', subsession_id: '', section_id: '', label: '', icon: 'FolderOpen', icon_color: '#64748b' });
      } else toast.error('Erro ao criar subpasta.');
    } catch (err) { console.error(err); toast.error('Erro ao criar subpasta.'); } finally { setIsAdding(false); }
  };

  return (
    <div className="bg-dark-card/60 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl p-6">
      <div className="flex flex-wrap items-center gap-1 mb-6 p-1 w-fit max-w-full overflow-x-auto rounded-xl bg-slate-100 dark:bg-white/[0.04] border border-slate-200 dark:border-white/5">
        {([
          ['manage', 'Estrutura'],
          ['create-page', 'Nova página'],
          ['create-section', 'Nova seção'],
          ['create-sub', 'Nova pasta'],
          ['create-subsub', 'Nova subpasta'],
        ] as const).map(([id, rotulo]) => (
          <button key={id} onClick={() => setActiveTab(id)}
            className={`h-9 px-4 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap ${
              activeTab === id ? 'bg-white dark:bg-white/10 text-slate-900 dark:text-white shadow-sm' : 'text-slate-500 hover:text-slate-800 dark:hover:text-white'
            }`}>
            {rotulo}
          </button>
        ))}
      </div>

      {activeTab === 'create-page' && (
        <form onSubmit={handleCreatePage} className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-violet-500" size={24} />
            <h3 className="text-xl font-bold text-light-text dark:text-white">Nova página</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">ID da Página (URL/Identificador)</label>
              <input type="text" required value={pageData.id} onChange={(e) => setPageData({ ...pageData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="ex: nova-pagina" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Nome da Página (Exibição)</label>
              <input type="text" required value={pageData.label} onChange={(e) => setPageData({ ...pageData, label: e.target.value })} placeholder="ex: Projetos Squad B" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Modelo (Template)</label>
              <OptionPicker
                value={templates.find(t => t.id === pageData.template)?.label || null}
                options={templates.map(t => ({ label: t.label }))}
                placeholder="Template"
                onChange={(val) => {
                  const tId = templates.find(t => t.label === val)?.id || '';
                  setPageData({ ...pageData, template: tId });
                }}
              />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ícone (Lucide React)</label>
              <IconSelector value={pageData.icon} onChange={(icon) => setPageData({ ...pageData, icon })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cor do Ícone</label>
              <ColorSelector value={pageData.icon_color} onChange={(icon_color) => setPageData({ ...pageData, icon_color })} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Onde fica (seção, pasta ou subpasta)</label>
              <OptionPicker
                value={(() => {
                  if (pageData.section_id) {
                    const sec = Array.isArray(menu) && menu.find((s: any) => s.id === pageData.section_id);
                    return sec ? `📁 ${sec.title} (direto na seção)` : null;
                  }
                  if (pageData.subsubsession_id) {
                    for (const s of (Array.isArray(menu) ? menu : [])) {
                      const direta = (s.subSubSessions || []).find((x: any) => x.id === pageData.subsubsession_id);
                      if (direta) return `  ${s.title} > ${direta.label}`;
                      for (const sub of s.subSessions) {
                        const sss = sub.subSubSessions?.find((x: any) => x.id === pageData.subsubsession_id);
                        if (sss) return `  ${s.title} > ${sub.label} > ${sss.label}`;
                      }
                    }
                    return null;
                  }
                  if (pageData.subsession_id) {
                    for (const s of (Array.isArray(menu) ? menu : [])) {
                      const sub = s.subSessions.find((x: any) => x.id === pageData.subsession_id);
                      if (sub) return `${s.title} > ${sub.label}`;
                    }
                    return null;
                  }
                  return null;
                })()}
                options={(() => {
                  const opts: { label: string }[] = [];
                  if (Array.isArray(menu)) {
                    menu.forEach((section: any) => {
                      opts.push({ label: `📁 ${section.title} (direto na seção)` });
                      (section.subSubSessions || []).forEach((ss: any) => opts.push({ label: `  ${section.title} > ${ss.label}` }));
                      section.subSessions.forEach((sub: any) => {
                        opts.push({ label: `${section.title} > ${sub.label}` });
                        if (sub.subSubSessions) {
                          sub.subSubSessions.forEach((subsub: any) => {
                            opts.push({ label: `  ${section.title} > ${sub.label} > ${subsub.label}` });
                          });
                        }
                      });
                    });
                  }
                  return opts;
                })()}
                placeholder="Selecione..."
                emptyLabel="Selecione..."
                onChange={(val) => {
                  if (!val) {
                    setPageData({...pageData, section_id: '', subsubsession_id: '', subsession_id: ''});
                    return;
                  }
                  if (Array.isArray(menu)) {
                    for (const section of menu) {
                      if (val === `📁 ${section.title} (direto na seção)`) {
                        setPageData({...pageData, section_id: section.id, subsubsession_id: '', subsession_id: ''});
                        return;
                      }
                      const direta = (section.subSubSessions || []).find((ss: any) => val === `  ${section.title} > ${ss.label}`);
                      if (direta) {
                        setPageData({...pageData, section_id: '', subsubsession_id: direta.id, subsession_id: ''});
                        return;
                      }
                      for (const sub of section.subSessions) {
                        if (val === `${section.title} > ${sub.label}`) {
                          setPageData({...pageData, section_id: '', subsubsession_id: '', subsession_id: sub.id});
                          return;
                        }
                        if (sub.subSubSessions) {
                          for (const subsub of sub.subSubSessions) {
                            if (val === `  ${section.title} > ${sub.label} > ${subsub.label}`) {
                              setPageData({...pageData, section_id: '', subsubsession_id: subsub.id, subsession_id: ''});
                              return;
                            }
                          }
                        }
                      }
                    }
                  }
                  setPageData({...pageData, section_id: '', subsubsession_id: '', subsession_id: ''});
                }}
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isAdding} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-600/20">
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Criar Página
            </button>
          </div>
        </form>
      )}

      {activeTab === 'create-section' && (
        <form onSubmit={handleCreateSection} className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Layers className="text-violet-500" size={24} />
            <h3 className="text-xl font-bold text-light-text dark:text-white">Nova seção</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">ID da Seção</label>
              <input type="text" required value={sectionData.id} onChange={(e) => setSectionData({ ...sectionData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="ex: marketing" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Título da Seção</label>
              <input type="text" required value={sectionData.title} onChange={(e) => setSectionData({ ...sectionData, title: e.target.value })} placeholder="ex: Marketing" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ícone</label>
              <IconSelector value={sectionData.icon} onChange={(icon) => setSectionData({ ...sectionData, icon })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cor do Ícone</label>
              <ColorSelector value={sectionData.icon_color} onChange={(icon_color) => setSectionData({ ...sectionData, icon_color })} />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isAdding} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-600/20">
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Criar Seção
            </button>
          </div>
        </form>
      )}

      {activeTab === 'create-sub' && (
        <form onSubmit={handleCreateSub} className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <Folder className="text-violet-500" size={24} />
            <h3 className="text-xl font-bold text-light-text dark:text-white">Nova pasta</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">ID da pasta</label>
              <input type="text" required value={subData.id} onChange={(e) => setSubData({ ...subData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="ex: equipe-a" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Nome da pasta</label>
              <input type="text" required value={subData.label} onChange={(e) => setSubData({ ...subData, label: e.target.value })} placeholder="ex: Equipe A" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ícone</label>
              <IconSelector value={subData.icon} onChange={(icon) => setSubData({ ...subData, icon })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cor do Ícone</label>
              <ColorSelector value={subData.icon_color} onChange={(icon_color) => setSubData({ ...subData, icon_color })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dentro da seção</label>
              <OptionPicker
                value={(() => {
                  if (Array.isArray(menu)) {
                    const sec = menu.find((s: any) => s.id === subData.section_id);
                    if (sec) return sec.title;
                  }
                  return null;
                })()}
                options={Array.isArray(menu) ? menu.map((section: any) => ({ label: section.title })) : []}
                placeholder="Selecione..."
                emptyLabel="Selecione..."
                onChange={(val) => {
                  const sec = Array.isArray(menu) && menu.find((s: any) => s.title === val);
                  setSubData({ ...subData, section_id: sec ? sec.id : '' });
                }}
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isAdding} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-600/20">
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Criar pasta
            </button>
          </div>
        </form>
      )}

      {activeTab === 'create-subsub' && (
        <form onSubmit={handleCreateSubsub} className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <FolderPlus className="text-violet-500" size={24} />
            <h3 className="text-xl font-bold text-light-text dark:text-white">Nova subpasta</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">ID da subpasta</label>
              <input type="text" required value={subsubData.id} onChange={(e) => setSubsubData({ ...subsubData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="ex: relatorios-equipe-a" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Nome da subpasta</label>
              <input type="text" required value={subsubData.label} onChange={(e) => setSubsubData({ ...subsubData, label: e.target.value })} placeholder="ex: Relatórios" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Ícone</label>
              <IconSelector value={subsubData.icon} onChange={(icon) => setSubsubData({ ...subsubData, icon })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Cor do Ícone</label>
              <ColorSelector value={subsubData.icon_color} onChange={(icon_color) => setSubsubData({ ...subsubData, icon_color })} />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Dentro de (seção ou pasta)</label>
              <OptionPicker
                value={(() => {
                  if (subsubData.subsession_id) {
                    for (const s of (Array.isArray(menu) ? menu : [])) {
                      const sub = s.subSessions.find((x: any) => x.id === subsubData.subsession_id);
                      if (sub) return `${s.title} > ${sub.label}`;
                    }
                    return null;
                  }
                  if (subsubData.section_id) {
                    const sec = Array.isArray(menu) && menu.find((s: any) => s.id === subsubData.section_id);
                    return sec ? `📁 ${sec.title} (direto na seção)` : null;
                  }
                  return null;
                })()}
                options={(() => {
                  const opts: { label: string }[] = [];
                  if (Array.isArray(menu)) {
                    menu.forEach((section: any) => {
                      opts.push({ label: `📁 ${section.title} (direto na seção)` });
                      section.subSessions.forEach((sub: any) => {
                        opts.push({ label: `${section.title} > ${sub.label}` });
                      });
                    });
                  }
                  return opts;
                })()}
                placeholder="Selecione..."
                emptyLabel="Selecione..."
                onChange={(val) => {
                  if (!val) {
                    setSubsubData({ ...subsubData, subsession_id: '', section_id: '' });
                    return;
                  }
                  if (Array.isArray(menu)) {
                    for (const section of menu) {
                      if (val === `📁 ${section.title} (direto na seção)`) {
                        setSubsubData({ ...subsubData, section_id: section.id, subsession_id: '' });
                        return;
                      }
                      for (const sub of section.subSessions) {
                        if (val === `${section.title} > ${sub.label}`) {
                          setSubsubData({ ...subsubData, subsession_id: sub.id, section_id: '' });
                          return;
                        }
                      }
                    }
                  }
                  setSubsubData({ ...subsubData, subsession_id: '', section_id: '' });
                }}
              />
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isAdding} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-600/20">
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Criar subpasta
            </button>
          </div>
        </form>
      )}

      {activeTab === 'manage' && (
        <EstruturaMenu
          menu={Array.isArray(menu) ? menu : []}
          setMenu={setMenu}
          refreshMenu={refreshMenu}
          iconeDe={(nome) => availableIcons.find(i => i.name === nome)?.component || FileText}
          IconSelector={IconSelector}
          ColorSelector={ColorSelector}
          templates={templates}
          onNovaPagina={({ tipo, id }) => {
            setPageData(d => ({
              ...d,
              section_id: tipo === 'section' ? id : '',
              subsession_id: tipo === 'subsession' ? id : '',
              subsubsession_id: tipo === 'subsubsession' ? id : '',
            }));
            setActiveTab('create-page');
          }}
        />
      )}
    </div>
  );
};
