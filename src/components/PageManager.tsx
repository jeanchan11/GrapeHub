import React, { useState, useRef, useEffect } from 'react';
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
import { DndContext, closestCenter, rectIntersection, closestCorners, KeyboardSensor, PointerSensor, useSensor, useSensors, useDndContext, useDroppable } from '@dnd-kit/core';
import { arrayMove, SortableContext, sortableKeyboardCoordinates, verticalListSortingStrategy, useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

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
      const openUp = spaceBelow < 280;
      setDropdownPos({
        top: openUp ? rect.top - 4 : rect.bottom + 4,
        left: rect.left,
        width: Math.max(rect.width, 220),
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
            maxHeight: 260,
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

const templates = [
  { id: 'blank', label: 'Em Branco' },
  { id: 'projects', label: 'Projetos & Parceiros' },
  { id: 'todo', label: 'Tarefas' },
  { id: 'todo-staff', label: 'To Do (Staff)' },
  { id: 'crm-comercial', label: 'CRM Comercial' },
  { id: 'crm-atividades', label: 'CRM Atividades' },
  { id: 'crm-pessoas', label: 'CRM Pessoas' },
  { id: 'crm-empresas', label: 'CRM Empresas' },
  { id: 'crm-metas', label: 'CRM Metas' },
  { id: 'ligacoes-dashboard', label: 'Dashboard de Ligações' },
  { id: 'task-templates', label: 'Modelos de Tarefas' },
  { id: 'automacoes', label: 'Automações' },
  { id: 'kpis-squad', label: 'KPIs Squad' },
  { id: 'parceiros-squad', label: 'Parceiros Squad' },
  { id: 'gestor', label: 'Calculadora Gestor' },
  { id: 'gestor-dashboard', label: 'Dashboard Gestor' },
  { id: 'marketing-dashboard', label: 'Dashboard Marketing' },
  { id: 'dashboard-operacional', label: 'Dashboard Operacional' },
  { id: 'onboarding-operacional', label: 'Onboarding Operacional' },
  { id: 'closer', label: 'Calculadora Closer' },
  { id: 'sdr', label: 'Calculadora SDR' },
  { id: 'gerente-operacional', label: 'Calculadora Gerente Operacional' },
  { id: 'meeting-notes', label: '📋 Notas de Reunião' },
];

const SortablePage = ({ page, parentId, parentType, editingPage, editPageData, setEditPageData, setEditingPage, handleSaveEditPage, handleDeletePage, handleEditPage, menu }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: page.id,
    data: { type: 'page', parentId: parentId, parentType: parentType }
  });
  const { over } = useDndContext();
  const isOver = over?.id === page.id;
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className={`flex items-center justify-between p-3 ${parentType === 'section' ? 'pl-6' : (parentType === 'subsession' ? 'pl-10' : 'pl-14')} hover:bg-white/5 transition-colors border-t border-white/5 bg-dark-card/40 ${isOver ? 'bg-violet-900/20' : ''}`}>
      <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600 mr-2">
        <GripVertical size={16} />
      </div>
      {editingPage === page.id ? (
        <div className="flex-1 flex flex-wrap items-center gap-3 pr-4 py-2">
          <input type="text" value={editPageData.label} onChange={e => setEditPageData({...editPageData, label: e.target.value})} className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm flex-1 min-w-[150px]" placeholder="Nome" />
          <div className="w-40 shrink-0">
            <IconSelector value={editPageData.icon} onChange={(icon) => setEditPageData({ ...editPageData, icon })} />
          </div>
          <div className="shrink-0">
            <ColorSelector value={editPageData.icon_color} onChange={(icon_color) => setEditPageData({ ...editPageData, icon_color })} />
          </div>
          <select value={editPageData.template} onChange={e => setEditPageData({...editPageData, template: e.target.value})} className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm shrink-0">
            {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
          </select>
          <select 
            value={editPageData.section_id ? `sec_${editPageData.section_id}` : (editPageData.subsubsession_id ? `subsub_${editPageData.subsubsession_id}` : (editPageData.subsession_id ? `sub_${editPageData.subsession_id}` : ''))} 
            onChange={e => {
                const val = e.target.value;
                console.log('Selected value:', val);
                if (val.startsWith('sec_')) {
                    setEditPageData({...editPageData, section_id: val.replace('sec_', ''), subsubsession_id: null, subsession_id: null});
                } else if (val.startsWith('subsub_')) {
                    setEditPageData({...editPageData, section_id: null, subsubsession_id: val.replace('subsub_', ''), subsession_id: null});
                } else if (val.startsWith('sub_')) {
                    setEditPageData({...editPageData, section_id: null, subsubsession_id: null, subsession_id: val.replace('sub_', '')});
                } else {
                    setEditPageData({...editPageData, section_id: null, subsubsession_id: null, subsession_id: null});
                }
            }} 
            className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm flex-1 min-w-[150px]"
          >
            <option value="">Selecione o destino...</option>
            {Array.isArray(menu) && menu.map((s: any) => (
                <optgroup key={s.id} label={s.title}>
                    <option value={`sec_${s.id}`}>📁 {s.title} (direto na seção)</option>
                    {s.subSessions.map((ss: any) => (
                        <React.Fragment key={ss.id}>
                            <option value={`sub_${ss.id}`}>{s.title} &gt; {ss.label}</option>
                            {ss.subSubSessions && ss.subSubSessions.map((sss: any) => (
                                <option key={sss.id} value={`subsub_${sss.id}`}>&nbsp;&nbsp;{s.title} &gt; {ss.label} &gt; {sss.label}</option>
                            ))}
                        </React.Fragment>
                    ))}
                </optgroup>
            ))}
          </select>
          <div className="flex items-center gap-2 shrink-0">
            <button onClick={handleSaveEditPage} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center gap-1"><Save size={16} /> Salvar</button>
            <button onClick={() => setEditingPage(null)} className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600">Cancelar</button>
          </div>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3">
            {page.icon && React.createElement(availableIcons.find(i => i.name === page.icon)?.component || FileText, { size: 16, className: "text-slate-400", style: { color: page.icon_color } })}
            <span className="text-sm font-medium text-slate-900 dark:text-white">{page.label}</span>
            <span className="text-xs text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-0.5 rounded">ID: {page.id}</span>
            <span className="text-xs text-violet-700 dark:text-violet-400 bg-violet-500/10 px-2 py-0.5 rounded">Template: {page.template}</span>
          </div>
          <div className="flex items-center gap-2">
            <button onClick={(e) => { e.stopPropagation(); handleEditPage(page, parentId, parentType); }} className="p-2 text-blue-500 hover:bg-blue-500/10 rounded-lg transition-colors" title="Editar Página">
              <Edit size={16} />
            </button>
            <button onClick={(e) => { e.stopPropagation(); handleDeletePage(page.id); }} className="p-2 text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors" title="Excluir Página">
              <Trash2 size={16} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};

const SortableSection = ({ section, editingSection, editSectionData, setEditSectionData, setEditingSection, handleSaveEditSection, handleDeleteSection, handleEditSection, children }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: section.id,
    data: { type: 'section' }
  });
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setNodeRef} style={style} className="border border-white/5 rounded-xl overflow-hidden">
      <div className="bg-dark-card/40 p-3 font-bold text-sm text-slate-700 dark:text-slate-300 flex items-center justify-between">
        {editingSection === section.id ? (
          <div className="flex-1 flex flex-wrap items-center gap-3 pr-4 py-2">
            <input type="text" value={editSectionData.title} onChange={e => setEditSectionData({...editSectionData, title: e.target.value})} className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm flex-1 min-w-[150px]" placeholder="Título da Seção" />
            <div className="w-40 shrink-0">
              <IconSelector value={editSectionData.icon} onChange={(icon) => setEditSectionData({ ...editSectionData, icon })} />
            </div>
            <div className="shrink-0">
              <ColorSelector value={editSectionData.icon_color} onChange={(icon_color) => setEditSectionData({ ...editSectionData, icon_color })} />
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleSaveEditSection} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center gap-1"><Save size={16} /> Salvar</button>
              <button onClick={() => setEditingSection(null)} className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600">
                <GripVertical size={16} />
              </div>
              <span>{section.title}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleEditSection(section); }} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded transition-colors" title="Editar Seção"><Edit size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteSection(section.id); }} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors" title="Excluir Seção"><Trash2 size={14} /></button>
            </div>
          </>
        )}
      </div>
      {children}
    </div>
  );
};

const SortableSubSession = ({ sub, sectionId, editingSub, editSubData, setEditSubData, setEditingSub, handleSaveEditSub, handleDeleteSub, handleEditSub, children, menu }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: sub.id,
    data: { type: 'subsession', parentId: sectionId }
  });
  const { setNodeRef: setDroppableRef, isOver: isContainerOver } = useDroppable({
    id: `droppable_sub_${sub.id}`,
    data: { type: 'subsession_container', subId: sub.id }
  });
  const { over } = useDndContext();
  const isOver = over?.id === sub.id || isContainerOver;
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setDroppableRef} className={`border-t border-white/5 w-full ${isOver ? 'bg-violet-900/20' : ''}`}>
      <div ref={setNodeRef} style={style} className="bg-dark-card/40 p-2 pl-6 text-sm font-medium text-slate-600 dark:text-slate-400 flex items-center justify-between w-full">
        {editingSub === sub.id ? (
          <div className="flex-1 flex flex-wrap items-center gap-3 pr-4 py-2">
            <input type="text" value={editSubData.label} onChange={e => setEditSubData({...editSubData, label: e.target.value})} className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm flex-1 min-w-[150px]" placeholder="Nome da Sub-seção" />
            <div className="w-40 shrink-0">
              <IconSelector value={editSubData.icon} onChange={(icon) => setEditSubData({ ...editSubData, icon })} />
            </div>
            <div className="shrink-0">
              <ColorSelector value={editSubData.icon_color} onChange={(icon_color) => setEditSubData({ ...editSubData, icon_color })} />
            </div>
            <select value={editSubData.section_id} onChange={e => setEditSubData({...editSubData, section_id: e.target.value})} className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm flex-1 min-w-[150px]">
              {Array.isArray(menu) && menu.map((s: any) => <option key={s.id} value={s.id}>{s.title}</option>)}
            </select>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleSaveEditSub} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center gap-1"><Save size={16} /> Salvar</button>
              <button onClick={() => setEditingSub(null)} className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600">
                <GripVertical size={14} />
              </div>
              {sub.icon && React.createElement(availableIcons.find(i => i.name === sub.icon)?.component || Folder, { size: 14, className: "text-slate-600 dark:text-slate-400" })}
              <span className="text-slate-800 dark:text-slate-300">└ {sub.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleEditSub(sub, sectionId); }} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded transition-colors" title="Editar Sub-seção"><Edit size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteSub(sub.id); }} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors" title="Excluir Sub-seção"><Trash2 size={14} /></button>
            </div>
          </>
        )}
      </div>
      {children}
    </div>
  );
};

const SortableSubSubSession = ({ subsub, subId, editingSubsub, editSubsubData, setEditSubsubData, setEditingSubsub, handleSaveEditSubsub, handleDeleteSubsub, handleEditSubsub, children, menu }: any) => {
  const { attributes, listeners, setNodeRef, transform, transition } = useSortable({ 
    id: subsub.id,
    data: { type: 'subsubsession', parentId: subId }
  });
  const { setNodeRef: setDroppableRef, isOver: isContainerOver } = useDroppable({
    id: `droppable_subsub_${subsub.id}`,
    data: { type: 'subsubsession_container', subsubId: subsub.id }
  });
  const { over } = useDndContext();
  const isOver = over?.id === subsub.id || isContainerOver;
  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div ref={setDroppableRef} className={`w-full ${isOver ? 'bg-violet-100 dark:bg-violet-900/20' : ''}`}>
      <div ref={setNodeRef} style={style} className="p-2 pl-10 text-xs font-medium text-slate-700 dark:text-slate-400 flex items-center justify-between border-t border-slate-100 dark:border-white/5 w-full">
        {editingSubsub === subsub.id ? (
          <div className="flex-1 flex flex-wrap items-center gap-3 pr-4 py-2">
            <input type="text" value={editSubsubData.label} onChange={e => setEditSubsubData({...editSubsubData, label: e.target.value})} className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm flex-1 min-w-[150px]" placeholder="Nome da Sub-sub-seção" />
            <div className="w-40 shrink-0">
              <IconSelector value={editSubsubData.icon} onChange={(icon) => setEditSubsubData({ ...editSubsubData, icon })} />
            </div>
            <div className="shrink-0">
              <ColorSelector value={editSubsubData.icon_color} onChange={(icon_color) => setEditSubsubData({ ...editSubsubData, icon_color })} />
            </div>
            <select value={editSubsubData.subsession_id ? `sub_${editSubsubData.subsession_id}` : (editSubsubData.section_id ? `sec_${editSubsubData.section_id}` : '')} onChange={e => {
              const val = e.target.value;
              if (val.startsWith('sec_')) {
                setEditSubsubData({...editSubsubData, section_id: val.replace('sec_', ''), subsession_id: ''});
              } else if (val.startsWith('sub_')) {
                setEditSubsubData({...editSubsubData, subsession_id: val.replace('sub_', ''), section_id: ''});
              }
            }} className="bg-white dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded px-2 py-1 text-sm flex-1 min-w-[150px]">
              <option value="">Selecione o pai...</option>
              {Array.isArray(menu) && menu.map((s: any) => (
                <optgroup key={s.id} label={s.title}>
                  <option value={`sec_${s.id}`}>📁 {s.title} (direto na seção)</option>
                  {s.subSessions.map((ss: any) => (
                    <option key={ss.id} value={`sub_${ss.id}`}>{s.title} &gt; {ss.label}</option>
                  ))}
                </optgroup>
              ))}
            </select>
            <div className="flex items-center gap-2 shrink-0">
              <button onClick={handleSaveEditSubsub} className="p-1.5 bg-emerald-500 text-white rounded hover:bg-emerald-600 flex items-center gap-1"><Save size={16} /> Salvar</button>
              <button onClick={() => setEditingSubsub(null)} className="p-1.5 bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300 rounded hover:bg-slate-300 dark:hover:bg-slate-600">Cancelar</button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex items-center gap-2">
              <div {...attributes} {...listeners} className="cursor-grab text-slate-400 hover:text-slate-600">
                <GripVertical size={12} />
              </div>
              {subsub.icon && React.createElement(availableIcons.find(i => i.name === subsub.icon)?.component || FolderOpen, { size: 12, className: "text-slate-600 dark:text-slate-400" })}
              <span className="text-slate-800 dark:text-slate-300">└ {subsub.label}</span>
            </div>
            <div className="flex items-center gap-2">
              <button onClick={(e) => { e.stopPropagation(); handleEditSubsub(subsub, subId, 'subsession'); }} className="p-1.5 text-blue-500 hover:bg-blue-500/10 rounded transition-colors" title="Editar Sub-sub-seção"><Edit size={14} /></button>
              <button onClick={(e) => { e.stopPropagation(); handleDeleteSubsub(subsub.id); }} className="p-1.5 text-rose-500 hover:bg-rose-500/10 rounded transition-colors" title="Excluir Sub-sub-seção"><Trash2 size={14} /></button>
            </div>
          </>
        )}
      </div>
      {children}
    </div>
  );
};

export const PageManager: React.FC = () => {
  const { menu, setMenu, refreshMenu } = useMenu();
  const [activeTab, setActiveTab] = useState<'create-page' | 'create-section' | 'create-sub' | 'create-subsub' | 'manage'>('create-page');
  const [isAdding, setIsAdding] = useState(false);
  
  const activeOriginalParentId = useRef<string | null>(null);
  // Track cross-container move separately without mutating dnd-kit's data
  const crossContainerMove = useRef<{ newParentId: string; parentType: string } | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );
  
  // Form states
  const [pageData, setPageData] = useState({ id: '', label: '', icon: 'FileText', icon_color: '#64748b', template: 'blank', subsubsession_id: '', subsession_id: '', section_id: '' });
  const [sectionData, setSectionData] = useState({ id: '', title: '', icon: 'Folder', icon_color: '#64748b' });
  const [subData, setSubData] = useState({ id: '', section_id: '', label: '', icon: 'Folder', icon_color: '#64748b' });
  const [subsubData, setSubsubData] = useState({ id: '', subsession_id: '', section_id: '', label: '', icon: 'FolderOpen', icon_color: '#64748b' });

  const [confirmDialog, setConfirmDialog] = useState<{ isOpen: boolean, message: string } | null>(null);
  const onConfirmRef = useRef<() => void>(() => {});

  const confirmAction = (message: string, onConfirm: () => void) => {
    onConfirmRef.current = onConfirm;
    setConfirmDialog({ isOpen: true, message });
  };

  const handleCreatePage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pageData.id || !pageData.label || (!pageData.subsubsession_id && !pageData.subsession_id && !pageData.section_id)) return alert('Preencha todos os campos obrigatórios.');
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
        alert('Página criada com sucesso!');
        await refreshMenu();
        setPageData({ id: '', label: '', icon: 'FileText', icon_color: '#64748b', template: 'blank', subsubsession_id: '', subsession_id: '', section_id: '' });
      } else alert('Erro ao criar página.');
    } catch (err) { console.error(err); alert('Erro ao criar página.'); } finally { setIsAdding(false); }
  };

  const handleCreateSection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!sectionData.id || !sectionData.title) return alert('Preencha todos os campos obrigatórios.');
    setIsAdding(true);
    try {
      const res = await fetch('/api/menu/sections', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(sectionData) });
      if (res.ok) {
        alert('Seção criada com sucesso!');
        await refreshMenu();
        setSectionData({ id: '', title: '', icon: 'Folder', icon_color: '#64748b' });
      } else alert('Erro ao criar seção.');
    } catch (err) { console.error(err); alert('Erro ao criar seção.'); } finally { setIsAdding(false); }
  };

  const handleCreateSub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subData.id || !subData.label || !subData.section_id) return alert('Preencha todos os campos obrigatórios.');
    setIsAdding(true);
    try {
      const res = await fetch('/api/menu/subsessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subData) });
      if (res.ok) {
        alert('Sub-seção criada com sucesso!');
        await refreshMenu();
        setSubData({ id: '', section_id: '', label: '', icon: 'Folder', icon_color: '#64748b' });
      } else alert('Erro ao criar sub-seção.');
    } catch (err) { console.error(err); alert('Erro ao criar sub-seção.'); } finally { setIsAdding(false); }
  };

  const handleCreateSubsub = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!subsubData.id || !subsubData.label || (!subsubData.subsession_id && !subsubData.section_id)) return alert('Preencha todos os campos obrigatórios.');
    setIsAdding(true);
    try {
      const res = await fetch('/api/menu/subsubsessions', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(subsubData) });
      if (res.ok) {
        alert('Sub-sub-seção criada com sucesso!');
        await refreshMenu();
        setSubsubData({ id: '', subsession_id: '', section_id: '', label: '', icon: 'FolderOpen', icon_color: '#64748b' });
      } else alert('Erro ao criar sub-sub-seção.');
    } catch (err) { console.error(err); alert('Erro ao criar sub-sub-seção.'); } finally { setIsAdding(false); }
  };

  const [editingPage, setEditingPage] = useState<string | null>(null);
  const [editPageData, setEditPageData] = useState({ id: '', label: '', icon: '', icon_color: '#64748b', template: '', subsubsession_id: '', subsession_id: '', section_id: '' });

  const [editingSection, setEditingSection] = useState<string | null>(null);
  const [editSectionData, setEditSectionData] = useState({ id: '', title: '', icon: 'Folder', icon_color: '#64748b' });

  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [editSubData, setEditSubData] = useState({ id: '', section_id: '', label: '', icon: '', icon_color: '#64748b' });

  const [editingSubsub, setEditingSubsub] = useState<string | null>(null);
  const [editSubsubData, setEditSubsubData] = useState({ id: '', subsession_id: '', section_id: '', label: '', icon: '', icon_color: '#64748b' });

  const handleEditPage = (page: any, parentId: string, parentType: 'section' | 'subsession' | 'subsubsession') => {
    setEditingPage(page.id);
    setEditPageData({
      id: page.id,
      label: page.label,
      icon: page.icon,
      icon_color: page.icon_color || '#64748b',
      template: page.template || 'blank',
      subsubsession_id: parentType === 'subsubsession' ? parentId : '',
      subsession_id: parentType === 'subsession' ? parentId : '',
      section_id: parentType === 'section' ? parentId : ''
    });
  };

  const handleSaveEditPage = async () => {
    if (!editPageData.label || (!editPageData.subsubsession_id && !editPageData.subsession_id && !editPageData.section_id)) return alert('Preencha os campos obrigatórios.');
    
    // Ensure foreign key integrity
    const payload = {
        id: editPageData.id,
        label: editPageData.label,
        icon: editPageData.icon,
        icon_color: editPageData.icon_color,
        template: editPageData.template,
        subsubsession_id: editPageData.subsubsession_id || null,
        subsession_id: editPageData.subsession_id || null,
        section_id: editPageData.section_id || null
    };
    console.log('Saving page payload:', payload);

    try {
      const res = await fetch(`/api/menu/pages/${editPageData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      console.log('Save response status:', res.status);
      if (res.ok) {
        alert('Página atualizada!');
        await refreshMenu();
        setEditingPage(null);
      } else {
        const errorText = await res.text();
        console.error('Save error:', errorText);
        alert(`Erro ao atualizar página: ${errorText}`);
      }
    } catch (err) { console.error(err); alert('Erro ao atualizar página.'); }
  };

  const handleDeletePage = async (id: string) => {
    confirmAction('Tem certeza que deseja excluir esta página?', async () => {
      try {
        const res = await fetch(`/api/menu/pages/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await refreshMenu();
        } else {
          const errorText = await res.text();
          console.error('Delete error:', errorText);
          alert(`Erro ao excluir página: ${errorText}`);
        }
      } catch (err) { console.error('Delete exception:', err); alert('Erro ao excluir página.'); }
    });
  };

  const handleEditSection = (section: any) => {
    setEditingSection(section.id);
    setEditSectionData({ id: section.id, title: section.title, icon: section.icon || 'Folder', icon_color: section.icon_color || '#64748b' });
  };

  const handleSaveEditSection = async () => {
    if (!editSectionData.title) return alert('Preencha os campos obrigatórios.');
    try {
      const res = await fetch(`/api/menu/sections/${editSectionData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSectionData)
      });
      if (res.ok) {
        alert('Seção atualizada!');
        await refreshMenu();
        setEditingSection(null);
      } else alert('Erro ao atualizar seção.');
    } catch (err) { console.error(err); alert('Erro ao atualizar seção.'); }
  };

  const handleDeleteSection = async (id: string) => {
    confirmAction('Tem certeza que deseja excluir esta seção? Todas as sub-seções e páginas dentro dela também serão excluídas.', async () => {
      try {
        const res = await fetch(`/api/menu/sections/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await refreshMenu();
        } else alert('Erro ao excluir seção.');
      } catch (err) { console.error(err); alert('Erro ao excluir seção.'); }
    });
  };

  const handleEditSub = (sub: any, sectionId: string) => {
    setEditingSub(sub.id);
    setEditSubData({ id: sub.id, section_id: sectionId, label: sub.label, icon: sub.icon || 'Folder', icon_color: sub.icon_color || '#64748b' });
  };

  const handleSaveEditSub = async () => {
    if (!editSubData.label || !editSubData.section_id) return alert('Preencha os campos obrigatórios.');
    try {
      const res = await fetch(`/api/menu/subsessions/${editSubData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editSubData)
      });
      if (res.ok) {
        alert('Sub-seção atualizada!');
        await refreshMenu();
        setEditingSub(null);
      } else alert('Erro ao atualizar sub-seção.');
    } catch (err) { console.error(err); alert('Erro ao atualizar sub-seção.'); }
  };

  const handleDeleteSub = async (id: string) => {
    confirmAction('Tem certeza que deseja excluir esta sub-seção? Todas as páginas dentro dela também serão excluídas.', async () => {
      try {
        const res = await fetch(`/api/menu/subsessions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await refreshMenu();
        } else alert('Erro ao excluir sub-seção.');
      } catch (err) { console.error(err); alert('Erro ao excluir sub-seção.'); }
    });
  };

  const handleEditSubsub = (subsub: any, parentId: string, parentType: 'subsession' | 'section') => {
    setEditingSubsub(subsub.id);
    setEditSubsubData({
      id: subsub.id,
      subsession_id: parentType === 'subsession' ? parentId : '',
      section_id: parentType === 'section' ? parentId : '',
      label: subsub.label,
      icon: subsub.icon || 'FolderOpen',
      icon_color: subsub.icon_color || '#64748b'
    });
  };

  const handleSaveEditSubsub = async () => {
    if (!editSubsubData.label || (!editSubsubData.subsession_id && !editSubsubData.section_id)) return alert('Preencha os campos obrigatórios.');
    try {
      const res = await fetch(`/api/menu/subsubsessions/${editSubsubData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editSubsubData,
          subsession_id: editSubsubData.subsession_id || null,
          section_id: editSubsubData.section_id || null,
        })
      });
      if (res.ok) {
        alert('Sub-sub-seção atualizada!');
        await refreshMenu();
        setEditingSubsub(null);
      } else alert('Erro ao atualizar sub-sub-seção.');
    } catch (err) { console.error(err); alert('Erro ao atualizar sub-sub-seção.'); }
  };

  const handleDeleteSubsub = async (id: string) => {
    confirmAction('Tem certeza que deseja excluir esta sub-sub-seção? Todas as páginas dentro dela também serão excluídas.', async () => {
      try {
        const res = await fetch(`/api/menu/subsubsessions/${id}`, { method: 'DELETE' });
        if (res.ok) {
          await refreshMenu();
        } else alert('Erro ao excluir sub-sub-seção.');
      } catch (err) { console.error(err); alert('Erro ao excluir sub-sub-seção.'); }
    });
  };

  const handleReorder = async (type: string, items: any[], oldIndex: number, newIndex: number, parentId: string | null = null) => {
    if (oldIndex === newIndex) return;
    const newItems = arrayMove(items, oldIndex, newIndex);

    // Optimistic UI update
    const updateMenu = (currentMenu: any[]): any[] => {
      if (type === 'section') return newItems;

      return currentMenu.map(section => {
        if (type === 'subsession' && section.id === parentId) {
          return { ...section, subSessions: newItems };
        }
        if (type === 'page_in_section' && section.id === parentId) {
          return { ...section, pages: newItems };
        }

        const updatedSubSessions = section.subSessions?.map((sub: any) => {
          if (type === 'subsubsession' && sub.id === parentId) {
            return { ...sub, subSubSessions: newItems };
          }
          if (type === 'page' && sub.id === parentId) {
            return { ...sub, pages: newItems };
          }

          const updatedSubSubSessions = sub.subSubSessions?.map((subsub: any) => {
            if (type === 'page' && subsub.id === parentId) {
              return { ...subsub, pages: newItems };
            }
            return subsub;
          });

          return { ...sub, subSubSessions: updatedSubSubSessions ?? sub.subSubSessions };
        });

        return { ...section, subSessions: updatedSubSessions ?? section.subSessions };
      });
    };

    setMenu(updateMenu(menu));

    const updates = newItems.map((item: any, i: number) => ({ id: item.id, order_index: i }));

    let apiType = '';
    if (type === 'section') apiType = 'sections';
    else if (type === 'subsession') apiType = 'subsessions';
    else if (type === 'subsubsession') apiType = 'subsubsessions';
    else if (type === 'page' || type === 'page_in_section') apiType = 'pages';

    try {
      const res = await fetch('/api/menu/reorder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type: apiType, items: updates })
      });
      if (!res.ok) {
        alert('Erro ao reordenar. Recarregando...');
        await refreshMenu();
      }
    } catch (err) {
      console.error(err);
      alert('Erro ao reordenar. Recarregando...');
      await refreshMenu();
    }
  };

  const findPage = (menu: any[], pageId: string): any => {
    for (const section of menu) {
      if (section.pages) {
        const page = section.pages.find((p: any) => p.id === pageId);
        if (page) return page;
      }
      if (section.subSubSessions) {
        for (const subsub of section.subSubSessions) {
          if (subsub.pages) {
            const page = subsub.pages.find((p: any) => p.id === pageId);
            if (page) return page;
          }
        }
      }
      if (section.subSessions) {
        for (const sub of section.subSessions) {
          if (sub.subSubSessions) {
            for (const subsub of sub.subSubSessions) {
              if (subsub.pages) {
                const page = subsub.pages.find((p: any) => p.id === pageId);
                if (page) return page;
              }
            }
          }
          if (sub.pages) {
            const page = sub.pages.find((p: any) => p.id === pageId);
            if (page) return page;
          }
        }
      }
    }
    return null;
  };

  const handleMovePage = async (pageId: string, newParentId: string, parentType: string) => {
    const page = findPage(menu, pageId);
    if (!page) return false;

    try {
      const payload = {
        ...page,
        subsubsession_id: parentType === 'subsubsession' ? newParentId : null,
        subsession_id: parentType === 'subsession' ? newParentId : null,
        section_id: parentType === 'section' ? newParentId : null
      };
      
      const res = await fetch(`/api/menu/pages/${pageId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (res.ok) {
        return true;
      } else {
        alert('Erro ao mover página.');
        return false;
      }
    } catch (err) { 
      console.error(err); 
      alert('Erro ao mover página.'); 
      return false;
    }
  };

  const onDragStart = (event: any) => {
    activeOriginalParentId.current = event.active.data.current?.parentId || null;
    crossContainerMove.current = null;
  };

  const onDragOver = (event: any) => {
    const { active, over } = event;
    if (!over) return;

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || !overData) return;
    if (activeData.type !== 'page') return;

    const activeContainerId = activeData.parentId;
    let overContainerId: string | null = null;
    let overParentType = 'section';

    if (overData.type === 'page') {
      overContainerId = overData.parentId;
      overParentType = overData.parentType;
    } else if (overData.type === 'subsession_container') {
      overContainerId = overData.subId;
      overParentType = 'subsession';
    } else if (overData.type === 'subsubsession_container') {
      overContainerId = overData.subsubId;
      overParentType = 'subsubsession';
    } else if (overData.type === 'section_container') {
      overContainerId = overData.sectionId;
      overParentType = 'section';
    } else {
      return;
    }

    if (!overContainerId || activeContainerId === overContainerId) return;

    // Track cross-container move without mutating dnd-kit data
    crossContainerMove.current = { newParentId: overContainerId, parentType: overParentType };

    setMenu((prevMenu: any[]) => {
      const newMenu = JSON.parse(JSON.stringify(prevMenu));
      let activePage: any = null;

      // Find and remove from source
      for (const section of newMenu) {
        if (section.pages && activeContainerId === section.id) {
          const idx = section.pages.findIndex((p: any) => p.id === active.id);
          if (idx !== -1) { activePage = section.pages.splice(idx, 1)[0]; break; }
        }
        for (const subsub of (section.subSubSessions || [])) {
          if (subsub.id === activeContainerId && subsub.pages) {
            const idx = subsub.pages.findIndex((p: any) => p.id === active.id);
            if (idx !== -1) { activePage = subsub.pages.splice(idx, 1)[0]; break; }
          }
        }
        if (activePage) break;
        for (const sub of (section.subSessions || [])) {
          if (sub.id === activeContainerId && sub.pages) {
            const idx = sub.pages.findIndex((p: any) => p.id === active.id);
            if (idx !== -1) { activePage = sub.pages.splice(idx, 1)[0]; break; }
          }
          for (const subsub of (sub.subSubSessions || [])) {
            if (subsub.id === activeContainerId && subsub.pages) {
              const idx = subsub.pages.findIndex((p: any) => p.id === active.id);
              if (idx !== -1) { activePage = subsub.pages.splice(idx, 1)[0]; break; }
            }
          }
          if (activePage) break;
        }
        if (activePage) break;
      }

      if (!activePage) return prevMenu;

      // Insert into target
      for (const section of newMenu) {
        if (section.id === overContainerId && overParentType === 'section') {
          // If moving directly into section (rarely used via droppable zone, but good to have)
          section.pages = section.pages || [];
          const overIdx = overData.type === 'page' ? section.pages.findIndex((p: any) => p.id === over.id) : -1;
          section.pages.splice(overIdx >= 0 ? overIdx : section.pages.length, 0, activePage);
          return newMenu;
        }
        for (const subsub of (section.subSubSessions || [])) {
          if (subsub.id === overContainerId) {
            subsub.pages = subsub.pages || [];
            const overIdx = overData.type === 'page' ? subsub.pages.findIndex((p: any) => p.id === over.id) : -1;
            subsub.pages.splice(overIdx >= 0 ? overIdx : subsub.pages.length, 0, activePage);
            return newMenu;
          }
        }
        for (const sub of (section.subSessions || [])) {
          if (sub.id === overContainerId) {
            sub.pages = sub.pages || [];
            const overIdx = overData.type === 'page' ? sub.pages.findIndex((p: any) => p.id === over.id) : -1;
            sub.pages.splice(overIdx >= 0 ? overIdx : sub.pages.length, 0, activePage);
            return newMenu;
          }
          for (const subsub of (sub.subSubSessions || [])) {
            if (subsub.id === overContainerId) {
              subsub.pages = subsub.pages || [];
              const overIdx = overData.type === 'page' ? subsub.pages.findIndex((p: any) => p.id === over.id) : -1;
              subsub.pages.splice(overIdx >= 0 ? overIdx : subsub.pages.length, 0, activePage);
              return newMenu;
            }
          }
        }
      }
      return newMenu;
    });
  };

  const onDragEnd = async (event: any) => {
    const { active, over } = event;
    if (!over || active.id === over.id) {
      crossContainerMove.current = null;
      return;
    }

    const activeData = active.data.current;
    const overData = over.data.current;
    if (!activeData || !overData) return;

    // --- Handle cross-container page move ---
    if (activeData.type === 'page' && crossContainerMove.current) {
      const { newParentId, parentType } = crossContainerMove.current;
      crossContainerMove.current = null;
      await handleMovePage(active.id, newParentId, parentType);
      // The UI was already updated optimistically in onDragOver — reorder within new list
      const currentMenu = menu;
      let newParentItems: any[] = [];
      for (const section of currentMenu) {
        if (section.id === newParentId && parentType === 'section') { newParentItems = section.pages || []; break; }
        for (const subsub of (section.subSubSessions || [])) {
          if (subsub.id === newParentId) { newParentItems = subsub.pages || []; break; }
        }
        if (newParentItems.length) break;
        
        for (const sub of (section.subSessions || [])) {
          if (sub.id === newParentId) { newParentItems = sub.pages || []; break; }
          for (const subsub of (sub.subSubSessions || [])) {
            if (subsub.id === newParentId) { newParentItems = subsub.pages || []; break; }
          }
          if (newParentItems.length) break;
        }
        if (newParentItems.length) break;
      }
      if (newParentItems.length > 1) {
        const oldIdx = newParentItems.findIndex((p: any) => p.id === active.id);
        const newIdx = newParentItems.findIndex((p: any) => p.id === over.id);
        if (oldIdx !== -1 && newIdx !== -1 && oldIdx !== newIdx) {
          await handleReorder('page', newParentItems, oldIdx, newIdx, newParentId);
        } else {
          await handleReorder('page', newParentItems, 0, 0, newParentId);
        }
      }
      return;
    }
    crossContainerMove.current = null;

    // --- Find the items list for this type ---
    let items: any[] = [];
    let reorderType = activeData.type;
    const parentId: string = activeData.parentId;

    if (activeData.type === 'section') {
      // When dragging sections, the cursor often lands over a child (subsession/page)
      // We need to find which section the over.id belongs to
      items = Array.isArray(menu) ? [...menu] : [];
      // Find what section contains over.id (could be a section itself, or a child)
      const overIsDirectSection = items.some((s: any) => s.id === over.id);
      if (!overIsDirectSection) {
        // Find the section containing the over item and use it as the drop target
        let overSectionId: string | null = null;
        for (const section of items) {
          if (section.pages?.some((p: any) => p.id === over.id)) { overSectionId = section.id; break; }
          if (section.subSubSessions?.some((sss: any) => sss.id === over.id || sss.pages?.some((p: any) => p.id === over.id))) { overSectionId = section.id; break; }
          for (const sub of (section.subSessions || [])) {
            if (sub.id === over.id || sub.pages?.some((p: any) => p.id === over.id)) { overSectionId = section.id; break; }
            if (sub.subSubSessions?.some((sss: any) => sss.id === over.id || sss.pages?.some((p: any) => p.id === over.id))) { overSectionId = section.id; break; }
          }
          if (overSectionId) break;
        }
        if (!overSectionId) return; // couldn't resolve, bail
        const oldIndex = items.findIndex((s: any) => s.id === active.id);
        const newIndex = items.findIndex((s: any) => s.id === overSectionId);
        if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;
        await handleReorder('section', items, oldIndex, newIndex, null);
        return;
      }
    } else if (activeData.type === 'subsession') {
      // For non-section types, require matching over type
      if (overData.type !== activeData.type) return;
      const section = (menu as any[]).find((s: any) => s.id === parentId);
      if (section) items = [...(section.subSessions || [])];
    } else if (activeData.type === 'subsubsession') {
      for (const section of (menu as any[])) {
        const sub = (section.subSessions || []).find((s: any) => s.id === parentId);
        if (sub) { items = [...(sub.subSubSessions || [])]; break; }
      }
    } else if (activeData.type === 'page') {
      for (const section of (menu as any[])) {
        // section-level pages
        if (section.id === parentId && section.pages) {
          items = [...section.pages];
          reorderType = 'page_in_section';
          break;
        }
        for (const sub of (section.subSessions || [])) {
          if (sub.id === parentId) { items = [...(sub.pages || [])]; break; }
          for (const subsub of (sub.subSubSessions || [])) {
            if (subsub.id === parentId) { items = [...(subsub.pages || [])]; break; }
          }
          if (items.length) break;
        }
        if (items.length) break;
      }
    }

    if (!items.length) return;

    const oldIndex = items.findIndex((i: any) => i.id === active.id);
    const newIndex = items.findIndex((i: any) => i.id === over.id);
    if (oldIndex === -1 || newIndex === -1 || oldIndex === newIndex) return;

    await handleReorder(reorderType, items, oldIndex, newIndex, parentId || null);
  };

  return (
    <div className="bg-dark-card/60 backdrop-blur-md rounded-3xl border border-white/10 shadow-xl p-6">
      <div className="flex flex-wrap gap-2 mb-6 border-b border-slate-200 dark:border-white/10 pb-4">
        <button onClick={() => setActiveTab('create-page')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'create-page' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Criar Página</button>
        <button onClick={() => setActiveTab('create-section')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'create-section' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Criar Seção</button>
        <button onClick={() => setActiveTab('create-sub')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'create-sub' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Criar Sub-seção</button>
        <button onClick={() => setActiveTab('create-subsub')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'create-subsub' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Criar Sub-sub-seção</button>
        <button onClick={() => setActiveTab('manage')} className={`px-4 py-2 rounded-lg text-sm font-bold transition-colors ${activeTab === 'manage' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-400' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-white/5'}`}>Gerenciar Páginas</button>
      </div>

      {activeTab === 'create-page' && (
        <form onSubmit={handleCreatePage} className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <FileText className="text-violet-500" size={24} />
            <h3 className="text-xl font-bold text-light-text dark:text-white">Criar Nova Página</h3>
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
              <select value={pageData.template} onChange={(e) => setPageData({ ...pageData, template: e.target.value })} className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20">
                {templates.map(t => <option key={t.id} value={t.id}>{t.label}</option>)}
              </select>
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
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Localização (Seção, Sub-seção ou Sub-sub-seção)</label>
              <select required value={pageData.section_id ? `sec_${pageData.section_id}` : (pageData.subsubsession_id ? `subsub_${pageData.subsubsession_id}` : (pageData.subsession_id ? `sub_${pageData.subsession_id}` : ''))} onChange={(e) => {
                  const val = e.target.value;
                  if (val.startsWith('sec_')) {
                      setPageData({...pageData, section_id: val.replace('sec_', ''), subsubsession_id: '', subsession_id: ''});
                  } else if (val.startsWith('subsub_')) {
                      setPageData({...pageData, section_id: '', subsubsession_id: val.replace('subsub_', ''), subsession_id: ''});
                  } else if (val.startsWith('sub_')) {
                      setPageData({...pageData, section_id: '', subsubsession_id: '', subsession_id: val.replace('sub_', '')});
                  } else {
                      setPageData({...pageData, section_id: '', subsubsession_id: '', subsession_id: ''});
                  }
              }} className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="">Selecione...</option>
                {Array.isArray(menu) && menu.map(section => (
                  <optgroup key={section.id} label={section.title}>
                    <option value={`sec_${section.id}`}>📁 {section.title} (direto na seção)</option>
                    {section.subSessions.map((sub: any) => (
                      <React.Fragment key={sub.id}>
                        <option value={`sub_${sub.id}`}>{section.title} &gt; {sub.label}</option>
                        {sub.subSubSessions.map((subsub: any) => (
                          <option key={subsub.id} value={`subsub_${subsub.id}`}>&nbsp;&nbsp;{section.title} &gt; {sub.label} &gt; {subsub.label}</option>
                        ))}
                      </React.Fragment>
                    ))}
                  </optgroup>
                ))}
              </select>
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
            <h3 className="text-xl font-bold text-light-text dark:text-white">Criar Nova Seção</h3>
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
            <h3 className="text-xl font-bold text-light-text dark:text-white">Criar Nova Sub-seção</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">ID da Sub-seção</label>
              <input type="text" required value={subData.id} onChange={(e) => setSubData({ ...subData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="ex: equipe-a" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Nome da Sub-seção</label>
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
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Seção Pai</label>
              <select required value={subData.section_id} onChange={(e) => setSubData({ ...subData, section_id: e.target.value })} className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="">Selecione...</option>
                {Array.isArray(menu) && menu.map(section => (
                  <option key={section.id} value={section.id}>{section.title}</option>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isAdding} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-600/20">
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Criar Sub-seção
            </button>
          </div>
        </form>
      )}

      {activeTab === 'create-subsub' && (
        <form onSubmit={handleCreateSubsub} className="space-y-6 max-w-2xl">
          <div className="flex items-center gap-3 mb-6">
            <FolderPlus className="text-violet-500" size={24} />
            <h3 className="text-xl font-bold text-light-text dark:text-white">Criar Nova Sub-sub-seção</h3>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">ID da Sub-sub-seção</label>
              <input type="text" required value={subsubData.id} onChange={(e) => setSubsubData({ ...subsubData, id: e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-') })} placeholder="ex: relatorios-equipe-a" className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20" />
            </div>
            <div>
              <label className="block text-sm font-bold text-slate-800 dark:text-slate-200 mb-2">Nome da Sub-sub-seção</label>
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
              <label className="block text-sm font-bold text-slate-700 dark:text-slate-300 mb-2">Pai (Seção ou Sub-seção)</label>
              <select required value={subsubData.subsession_id ? `sub_${subsubData.subsession_id}` : (subsubData.section_id ? `sec_${subsubData.section_id}` : '')} onChange={(e) => {
                const val = e.target.value;
                if (val.startsWith('sec_')) {
                  setSubsubData({ ...subsubData, section_id: val.replace('sec_', ''), subsession_id: '' });
                } else if (val.startsWith('sub_')) {
                  setSubsubData({ ...subsubData, subsession_id: val.replace('sub_', ''), section_id: '' });
                } else {
                  setSubsubData({ ...subsubData, subsession_id: '', section_id: '' });
                }
              }} className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-4 text-sm text-light-text dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20">
                <option value="">Selecione...</option>
                {Array.isArray(menu) && menu.map(section => (
                  <optgroup key={section.id} label={section.title}>
                    <option value={`sec_${section.id}`}>📁 {section.title} (direto na seção)</option>
                    {section.subSessions.map((sub: any) => (
                      <option key={sub.id} value={`sub_${sub.id}`}>{section.title} &gt; {sub.label}</option>
                    ))}
                  </optgroup>
                ))}
              </select>
            </div>
          </div>
          <div className="pt-4 flex justify-end">
            <button type="submit" disabled={isAdding} className="bg-violet-600 hover:bg-violet-700 text-white px-6 py-3 rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-600/20">
              {isAdding ? <Loader2 size={18} className="animate-spin" /> : <Plus size={18} />} Criar Sub-sub-seção
            </button>
          </div>
        </form>
      )}

      {activeTab === 'manage' && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Layers className="text-violet-500" size={24} />
            <h3 className="text-xl font-bold text-light-text dark:text-white">Gerenciar Estrutura</h3>
          </div>
          <div className="space-y-4">
            <DndContext sensors={sensors} collisionDetection={closestCorners} onDragStart={onDragStart} onDragEnd={onDragEnd} onDragOver={onDragOver}>
              <SortableContext items={Array.isArray(menu) ? menu.map(s => s.id) : []} strategy={verticalListSortingStrategy}>
                {Array.isArray(menu) && menu.map((section) => (
                  <SortableSection 
                    key={section.id} 
                    section={section} 
                    editingSection={editingSection} 
                    editSectionData={editSectionData} 
                    setEditSectionData={setEditSectionData} 
                    setEditingSection={setEditingSection} 
                    handleSaveEditSection={handleSaveEditSection} 
                    handleDeleteSection={handleDeleteSection} 
                    handleEditSection={handleEditSection}
                  >
                      {/* Section-level pages */}
                      {section.pages && section.pages.length > 0 && (
                        <SortableContext items={section.pages.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                          {section.pages.map((page: any) => (
                            <SortablePage key={page.id} page={page} parentId={section.id} parentType="section" editingPage={editingPage} editPageData={editPageData} setEditPageData={setEditPageData} setEditingPage={setEditingPage} handleSaveEditPage={handleSaveEditPage} handleDeletePage={handleDeletePage} handleEditPage={handleEditPage} menu={menu} />
                          ))}
                        </SortableContext>
                      )}

                      {/* Section-level SubSubSessions */}
                      {section.subSubSessions && section.subSubSessions.length > 0 && (
                        <SortableContext items={section.subSubSessions.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                          {section.subSubSessions.map((subsub: any) => (
                            <SortableSubSubSession 
                              key={subsub.id} 
                              subsub={subsub} 
                              subId={section.id} 
                              editingSubsub={editingSubsub} 
                              editSubsubData={editSubsubData} 
                              setEditSubsubData={setEditSubsubData} 
                              setEditingSubsub={setEditingSubsub} 
                              handleSaveEditSubsub={handleSaveEditSubsub} 
                              handleDeleteSubsub={handleDeleteSubsub} 
                              handleEditSubsub={handleEditSubsub}
                              menu={menu}
                            >
                              {subsub.pages && (
                                  <SortableContext items={subsub.pages.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                                    {subsub.pages.map((page: any) => (
                                      <SortablePage key={page.id} page={page} parentId={subsub.id} parentType="subsubsession" editingPage={editingPage} editPageData={editPageData} setEditPageData={setEditPageData} setEditingPage={setEditingPage} handleSaveEditPage={handleSaveEditPage} handleDeletePage={handleDeletePage} handleEditPage={handleEditPage} menu={menu} />
                                    ))}
                                  </SortableContext>
                                )}
                            </SortableSubSubSession>
                          ))}
                        </SortableContext>
                      )}
                      <SortableContext items={section.subSessions.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                        {section.subSessions.map((sub: any) => (
                          <SortableSubSession 
                            key={sub.id} 
                            sub={sub} 
                            sectionId={section.id} 
                            editingSub={editingSub} 
                            editSubData={editSubData} 
                            setEditSubData={setEditSubData} 
                            setEditingSub={setEditingSub} 
                            handleSaveEditSub={handleSaveEditSub} 
                            handleDeleteSub={handleDeleteSub} 
                            handleEditSub={handleEditSub}
                            menu={menu}
                          >
                              {sub.pages && (
                                <SortableContext items={sub.pages.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                                  {sub.pages.map((page: any) => (
                                    <SortablePage key={page.id} page={page} parentId={sub.id} parentType="subsession" editingPage={editingPage} editPageData={editPageData} setEditPageData={setEditPageData} setEditingPage={setEditingPage} handleSaveEditPage={handleSaveEditPage} handleDeletePage={handleDeletePage} handleEditPage={handleEditPage} menu={menu} />
                                  ))}
                                </SortableContext>
                              )}
                              <SortableContext items={sub.subSubSessions.map((s: any) => s.id)} strategy={verticalListSortingStrategy}>
                                {sub.subSubSessions.map((subsub: any) => (
                                  <SortableSubSubSession 
                                    key={subsub.id} 
                                    subsub={subsub} 
                                    subId={sub.id} 
                                    editingSubsub={editingSubsub} 
                                    editSubsubData={editSubsubData} 
                                    setEditSubsubData={setEditSubsubData} 
                                    setEditingSubsub={setEditingSubsub} 
                                    handleSaveEditSubsub={handleSaveEditSubsub} 
                                    handleDeleteSubsub={handleDeleteSubsub} 
                                    handleEditSubsub={handleEditSubsub}
                                    menu={menu}
                                  >
                                    {subsub.pages && (
                                        <SortableContext items={subsub.pages.map((p: any) => p.id)} strategy={verticalListSortingStrategy}>
                                          {subsub.pages.map((page: any) => (
                                            <SortablePage key={page.id} page={page} parentId={subsub.id} parentType="subsubsession" editingPage={editingPage} editPageData={editPageData} setEditPageData={setEditPageData} setEditingPage={setEditingPage} handleSaveEditPage={handleSaveEditPage} handleDeletePage={handleDeletePage} handleEditPage={handleEditPage} menu={menu} />
                                          ))}
                                        </SortableContext>
                                      )}
                                  </SortableSubSubSession>
                                ))}
                              </SortableContext>
                          </SortableSubSession>
                        ))}
                      </SortableContext>
                  </SortableSection>
                ))}
              </SortableContext>
            </DndContext>
          </div>
        </div>
      )}

      {/* Confirmation Modal */}
      {confirmDialog?.isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 dark:bg-black/40 darker:bg-black/60 backdrop-blur-sm">
          <div className="bg-white/20 backdrop-blur-lg dark:bg-violet-500/10 darker:!bg-black/80 dark:backdrop-blur-lg rounded-3xl p-6 max-w-md w-full mx-4 shadow-[0_8px_32px_0_rgba(31,38,135,0.1)] dark:shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] border border-white/30 dark:border-violet-500/20 darker:!border-white/5">
            <h3 className="text-xl font-bold text-slate-800 dark:text-white mb-4">Confirmar Exclusão</h3>
            <p className="text-slate-600 dark:text-slate-300 mb-6">{confirmDialog.message}</p>
            <div className="flex justify-end gap-3">
              <button
                onClick={() => setConfirmDialog(null)}
                className="px-4 py-2 rounded-lg text-sm font-bold text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  onConfirmRef.current();
                  setConfirmDialog(null);
                }}
                className="px-4 py-2 rounded-lg text-sm font-bold bg-rose-500 text-white hover:bg-rose-600 transition-colors"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
