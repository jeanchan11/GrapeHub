
// Sidebar component for GrapeHub
// Last updated: 2026-04-19
import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { UserData } from '../../types';
import { iconMap } from '../lib/iconMap';
import { useMenu } from '../context/MenuContext';
import {
  Search, Bell, Settings,
  ChevronRight, ChevronLeft, LogOut,
  ChevronDown, Sun, Moon, Zap, Folder, Camera, Phone, User as UserIcon, Save, X,
  MoreHorizontal, Shield, Loader2, Check
} from 'lucide-react';
import Cropper from 'react-easy-crop';

// ─── Page Permissions Modal ───────────────────────────────────────────────────

interface PagePermissionsModalProps {
  pageId: string;
  pageLabel: string;
  onClose: () => void;
}

const PagePermissionsModal: React.FC<PagePermissionsModalProps> = ({ pageId, pageLabel, onClose }) => {
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(true);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        if (res.ok) {
          const data = await res.json();
          setUsers(data);
        }
      } catch (err) {
        console.error('Error fetching users:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchUsers();
  }, []);

  const toggleAccess = async (user: UserData) => {
    setSavingId(user.id);
    const hasAccess = user.allowedPages?.includes(pageId);
    const newPages = hasAccess
      ? (user.allowedPages || []).filter(p => p !== pageId)
      : [...(user.allowedPages || []), pageId];
    
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: user.role,
          allowedPages: newPages,
          name: user.name,
          squad: user.squad,
          picture: user.picture
        })
      });
      if (res.ok) {
        setUsers(prev => prev.map(u =>
          u.id === user.id ? { ...u, allowedPages: newPages } : u
        ));
      }
    } catch (err) {
      console.error('Error toggling access:', err);
    } finally {
      setSavingId(null);
    }
  };

  const usersWithAccess = users.filter(u => u.role === 'superadmin' || u.allowedPages?.includes(pageId));
  const usersWithoutAccess = users.filter(u => u.role !== 'superadmin' && !u.allowedPages?.includes(pageId));

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm" onClick={onClose}>
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        transition={{ duration: 0.2 }}
        className="bg-white dark:bg-[#1e1b29] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-violet-600/20 rounded-xl">
              <Shield size={16} className="text-violet-400" />
            </div>
            <div>
              <h2 className="text-base font-bold text-light-text dark:text-white">Permissões</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">{pageLabel}</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
            <X size={18} />
          </button>
        </div>

        {/* Content */}
        <div className="max-h-[60vh] overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 size={24} className="animate-spin text-violet-500" />
            </div>
          ) : (
            <>
              {/* Users with access */}
              <div className="px-5 pt-4 pb-2">
                <p className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest mb-3">Com acesso · {usersWithAccess.length}</p>
                <div className="flex flex-col gap-1">
                  {usersWithAccess.map(user => (
                    <div key={user.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-8 h-8 rounded-full bg-violet-500/20 flex items-center justify-center text-violet-600 dark:text-violet-400 font-bold text-xs shrink-0 overflow-hidden">
                          {user.picture
                            ? <img src={user.picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                            : (user.name || user.email)[0].toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <p className="text-sm font-semibold text-light-text dark:text-white truncate">{user.name || user.email}</p>
                          {user.name && <p className="text-[10px] text-slate-500 truncate">{user.email}</p>}
                        </div>
                      </div>
                      {user.role === 'superadmin' ? (
                        <span className="text-[9px] font-bold text-rose-500 bg-rose-500/10 px-2 py-0.5 rounded-full uppercase tracking-wider shrink-0">Admin</span>
                      ) : (
                        <button
                          onClick={() => toggleAccess(user)}
                          disabled={savingId === user.id}
                          className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 hover:bg-red-500/10 hover:text-red-400 transition-all shrink-0"
                          title="Remover acesso"
                        >
                          {savingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />}
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Users without access */}
              {usersWithoutAccess.length > 0 && (
                <div className="px-5 pt-3 pb-4 border-t border-slate-100 dark:border-white/5 mt-2">
                  <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3">Sem acesso · {usersWithoutAccess.length}</p>
                  <div className="flex flex-col gap-1">
                    {usersWithoutAccess.map(user => (
                      <div key={user.id} className="flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-white/5 transition-colors group opacity-60 hover:opacity-100">
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-8 h-8 rounded-full bg-slate-500/20 flex items-center justify-center text-slate-500 font-bold text-xs shrink-0 overflow-hidden">
                            {user.picture
                              ? <img src={user.picture} alt="" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                              : (user.name || user.email)[0].toUpperCase()}
                          </div>
                          <div className="min-w-0">
                            <p className="text-sm font-semibold text-light-text dark:text-white truncate">{user.name || user.email}</p>
                            {user.name && <p className="text-[10px] text-slate-500 truncate">{user.email}</p>}
                          </div>
                        </div>
                        <button
                          onClick={() => toggleAccess(user)}
                          disabled={savingId === user.id}
                          className="p-1.5 rounded-lg bg-slate-100 dark:bg-white/5 text-slate-400 hover:bg-emerald-500/10 hover:text-emerald-500 transition-all shrink-0"
                          title="Conceder acesso"
                        >
                          {savingId === user.id ? <Loader2 size={14} className="animate-spin" /> : <Shield size={14} />}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </motion.div>
    </div>
  );
};

// ─── PageItemWithMenu (reusable page link with 3-dot menu) ────────────────────

interface PageItemProps {
  page: any;
  isActive: boolean;
  paddingLeft: string;
  onPageChange: (id: string) => void;
  canManagePermissions: boolean;
  onOpenPermissions: (pageId: string, pageLabel: string) => void;
}

const PageItemWithMenu: React.FC<PageItemProps> = ({ page, isActive, paddingLeft, onPageChange, canManagePermissions, onOpenPermissions }) => {
  const [showMenu, setShowMenu] = useState(false);
  const [menuCoords, setMenuCoords] = useState({ top: 0, right: 0 });
  const menuRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const PageIcon = iconMap[page.icon];

  useEffect(() => {
    if (!showMenu) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node) && buttonRef.current && !buttonRef.current.contains(e.target as Node)) {
        setShowMenu(false);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [showMenu]);

  const handleToggleMenu = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!showMenu && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuCoords({ top: rect.bottom + 4, right: window.innerWidth - rect.right });
      setShowMenu(true);
    } else {
      setShowMenu(false);
    }
  };

  return (
    <div
      className={`group/page relative flex items-center gap-2 pr-2 rounded-lg cursor-pointer transition-all duration-200 ${isActive ? 'text-white font-semibold' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'}`}
      style={{ paddingLeft, paddingRight: '8px', paddingTop: '7px', paddingBottom: '7px', borderRadius: '8px', margin: '1px 8px 1px 0', background: isActive ? '#7C3AED' : 'transparent' }}
    >
      <a className="flex-1 flex items-center gap-2 min-w-0 no-underline" href={`#/${page.id}`} onClick={(e) => { e.preventDefault(); onPageChange(page.id); }}>
        {PageIcon && <PageIcon size={14} color={isActive ? '#FFFFFF' : (page.icon_color || '#9CA3AF')} />}
        <span className="text-sm font-medium truncate" style={{ color: isActive ? '#FFFFFF' : 'inherit' }}>{page.label}</span>
      </a>
      {canManagePermissions && (
        <div className="relative">
          <button
            ref={buttonRef}
            onClick={handleToggleMenu}
            className={`p-1 rounded-md transition-all shrink-0 ${isActive ? 'text-white/60 hover:text-white hover:bg-white/20' : 'text-transparent group-hover/page:text-slate-400 hover:!text-slate-600 dark:hover:!text-white hover:!bg-slate-100 dark:hover:!bg-white/10'}`}
          >
            <MoreHorizontal size={14} />
          </button>
          {showMenu && createPortal(
            <div 
              ref={menuRef}
              style={{ position: 'fixed', top: menuCoords.top, right: menuCoords.right, zIndex: 999999 }}
              className="w-40 bg-white dark:bg-[#1e1b29] border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl overflow-hidden"
            >
              <button
                onClick={e => { e.stopPropagation(); setShowMenu(false); onOpenPermissions(page.id, page.label); }}
                className="w-full flex items-center gap-2.5 px-3.5 py-2.5 text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
              >
                <Shield size={13} className="text-violet-500" />
                Permissões
              </button>
            </div>,
            document.body
          )}
        </div>
      )}
    </div>
  );
};

const getCroppedImg = async (imageSrc: string, pixelCrop: any): Promise<string> => {
  const image = new Image();
  image.src = imageSrc;
  await new Promise(resolve => image.onload = resolve);
  
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  
  canvas.width = 250;
  canvas.height = 250;
  
  if (ctx) {
    ctx.drawImage(
      image,
      pixelCrop.x,
      pixelCrop.y,
      pixelCrop.width,
      pixelCrop.height,
      0,
      0,
      250,
      250
    );
  }
  
  return canvas.toDataURL('image/jpeg', 0.8);
};

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  user: FirebaseUser;
  userData: UserData | null;
  theme: 'light' | 'dark' | 'darker';
  toggleTheme: () => void;
  onCollapseChange?: (collapsed: boolean) => void;
}

type FlyoutItem = { id: string; label: string; icon: string; icon_color?: string; indent: number };

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange, user, userData, theme, toggleTheme, onCollapseChange }) => {
  const userRole = userData?.role;
  const canManagePermissionsBase = userRole === 'superadmin' || userRole === 'diretor-operacional';
  const [permissionsPage, setPermissionsPage] = useState<{ id: string; label: string } | null>(null);

  // Diretor operacional não pode gerenciar permissões de páginas do setor financeiro
  const canManageForSection = (sectionTitle: string) => {
    if (userRole === 'superadmin') return true;
    if (userRole === 'diretor-operacional') {
      return !sectionTitle.toLowerCase().includes('financeiro');
    }
    return false;
  };

  const [isCollapsed, setIsCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileData, setProfileData] = useState({ 
    picture: userData?.picture || user.photoURL || '', 
    phone: userData?.phone || '', 
    bio: userData?.bio || '' 
  });
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [cropImage, setCropImage] = useState<string | null>(null);
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<any>(null);

  const [expanded, setExpanded] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem('sidebar-expanded');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  // Persist expanded state
  useEffect(() => {
    try { localStorage.setItem('sidebar-expanded', JSON.stringify(expanded)); } catch {}
  }, [expanded]);

  // Persist collapsed state
  useEffect(() => {
    try { localStorage.setItem('sidebar-collapsed', String(isCollapsed)); } catch {}
    onCollapseChange?.(isCollapsed);
  }, [isCollapsed]);

  // Flyout state — rendered outside sidebar via fixed position
  const [flyoutSection, setFlyoutSection] = useState<string | null>(null);
  const [flyoutY, setFlyoutY] = useState(0);
  const [flyoutTitle, setFlyoutTitle] = useState('');
  const [flyoutItems, setFlyoutItems] = useState<FlyoutItem[]>([]);
  const flyoutTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const { menu } = useMenu();

  const openFlyout = (sectionId: string, title: string, items: FlyoutItem[], centerY: number) => {
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
    setFlyoutSection(sectionId);
    setFlyoutTitle(title);
    setFlyoutItems(items);
    setFlyoutY(centerY);
  };

  const closeFlyout = () => {
    flyoutTimeout.current = setTimeout(() => setFlyoutSection(null), 180);
  };

  const keepFlyout = () => {
    if (flyoutTimeout.current) clearTimeout(flyoutTimeout.current);
  };

  const handleSaveProfile = async () => {
    if (!userData) return;
    setIsSavingProfile(true);
    try {
      const response = await fetch(`/api/users/${userData.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          role: userData.role,
          allowedPages: userData.allowedPages,
          name: userData.name,
          squad: userData.squad,
          picture: profileData.picture,
          phone: profileData.phone,
          bio: profileData.bio
        })
      });
      if (response.ok) {
        setShowProfileModal(false);
        // Force reload to apply changes quickly
        window.location.reload();
      } else {
        alert('Erro ao salvar perfil.');
      }
    } catch (error) {
      console.error(error);
      alert('Erro ao salvar perfil.');
    } finally {
      setIsSavingProfile(false);
    }
  };

  const toggleExpand = (id: string) =>
    setExpanded(prev => ({ ...prev, [id]: !prev[id] }));

  const isPageAllowed = (pageId: string) => {
    if (userData?.role === 'superadmin') return true;
    return userData?.allowedPages?.includes(pageId);
  };

  const hasAllowedPagesInSubSubSession = (sss: any) =>
    sss.pages?.some((p: any) => isPageAllowed(p.id)) ?? false;

  const hasAllowedPagesInSubSession = (ss: any) =>
    (ss.subSubSessions?.some((sss: any) => hasAllowedPagesInSubSubSession(sss)) ?? false) ||
    (ss.pages?.some((p: any) => isPageAllowed(p.id)) ?? false);

  const hasAllowedPagesInSection = (section: any) =>
    (section.subSessions?.some((ss: any) => hasAllowedPagesInSubSession(ss)) ?? false) ||
    (section.pages?.some((p: any) => isPageAllowed(p.id)) ?? false) ||
    (section.subSubSessions?.some((sss: any) => hasAllowedPagesInSubSubSession(sss)) ?? false);

  const flattenSectionPages = (section: any): FlyoutItem[] => {
    const items: FlyoutItem[] = [];
    section.pages?.filter((p: any) => isPageAllowed(p.id)).forEach((p: any) =>
      items.push({ id: p.id, label: p.label, icon: p.icon, icon_color: p.icon_color, indent: 0 }));
    section.subSubSessions?.filter((sss: any) => hasAllowedPagesInSubSubSession(sss)).forEach((sss: any) =>
      sss.pages?.filter((p: any) => isPageAllowed(p.id)).forEach((p: any) =>
        items.push({ id: p.id, label: p.label, icon: p.icon, icon_color: p.icon_color, indent: 0 })));
    section.subSessions?.filter((ss: any) => hasAllowedPagesInSubSession(ss)).forEach((ss: any) => {
      ss.pages?.filter((p: any) => isPageAllowed(p.id)).forEach((p: any) =>
        items.push({ id: p.id, label: p.label, icon: p.icon, icon_color: p.icon_color, indent: 0 }));
      ss.subSubSessions?.filter((sss: any) => hasAllowedPagesInSubSubSession(sss)).forEach((sss: any) =>
        sss.pages?.filter((p: any) => isPageAllowed(p.id)).forEach((p: any) =>
          items.push({ id: p.id, label: p.label, icon: p.icon, icon_color: p.icon_color, indent: 1 })));
    });
    return items;
  };

  const bottomItems = [
    { id: 'notifications', label: 'Notificações', icon: Bell, badge: 12 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <>
      <aside
        style={{ width: isCollapsed ? 80 : 280, transition: 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)' }}
        className="fixed top-0 left-0 h-screen bg-white dark:bg-dark-bg/80 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 flex flex-col z-50 shadow-2xl rounded-tr-[2.5rem] transition-colors duration-300"
      >
        {/* ── Header ───────────────────────────────────────────── */}
        <div className="p-6 flex items-center justify-between relative min-h-[80px]">
          <AnimatePresence mode="wait">
            {!isCollapsed && (
              <motion.div
                key="logo-full"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.2 }}
                className="flex items-center gap-3"
              >
                <div className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center shrink-0 overflow-hidden">
                  <img src="logobranca.png" alt="Logo" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
                </div>
                <div className="flex items-baseline">
                  <span className="font-bold text-2xl text-[#7c3aed] tracking-tight">Grape</span>
                  <span className="font-light text-2xl text-slate-600 dark:text-violet-200/80">Hub</span>
                </div>
              </motion.div>
            )}
            {isCollapsed && (
              <motion.div
                key="logo-collapsed"
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.5 }}
                className="w-8 h-8 bg-violet-600 rounded-lg flex items-center justify-center mx-auto shrink-0 overflow-hidden"
              >
                <img src="logobranca.png" alt="Logo" className="w-5 h-5 object-contain" referrerPolicy="no-referrer" />
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="absolute -right-4 top-1/2 -translate-y-1/2 w-8 h-8 bg-white dark:bg-dark-tooltip border border-slate-200 dark:border-violet-500/20 rounded-lg flex items-center justify-center text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-white transition-all shadow-xl z-[60] group"
          >
            {isCollapsed
              ? <ChevronRight size={16} className="group-hover:scale-110 transition-transform" />
              : <ChevronLeft size={16} className="group-hover:scale-110 transition-transform" />}
          </button>
        </div>

        {/* ── Search ───────────────────────────────────────────── */}
        <div className={`mb-6 flex justify-center transition-all duration-300 ${isCollapsed ? 'px-0' : 'px-4'}`}>
          <motion.div className="relative flex items-center h-10 w-full">
            <motion.div
              className={`z-10 text-slate-500 flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-full' : 'absolute left-3'}`}
            >
              <Search size={18} />
            </motion.div>
            <AnimatePresence mode="popLayout">
              {!isCollapsed && (
                <motion.input
                  initial={{ opacity: 0, width: 0 }}
                  animate={{ opacity: 1, width: '100%' }}
                  exit={{ opacity: 0, width: 0 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 40 }}
                  type="text"
                  placeholder="Pesquisar"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-light-bg dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-light-text dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors overflow-hidden"
                />
              )}
            </AnimatePresence>
          </motion.div>
        </div>

        {/* ── Navigation ───────────────────────────────────────── */}
        <motion.div
          className={`flex-1 scrollbar-hide py-2 transition-all duration-300 px-2 ${
            isCollapsed ? 'overflow-y-auto' : 'overflow-y-auto space-y-1'
          }`}
        >
          {Array.isArray(menu) && (() => {
            const query = searchQuery.trim().toLowerCase();
            
            const filterMenuTree = (sections: any[]) => {
              if (!query) return sections;
              return sections.map(section => {
                const filteredSubSubSessions = (section.subSubSessions || []).map((sss: any) => {
                  const filteredPages = (sss.pages || []).filter((p: any) => p.label.toLowerCase().includes(query));
                  if (sss.label.toLowerCase().includes(query) || filteredPages.length > 0) {
                    return { ...sss, pages: filteredPages.length > 0 ? filteredPages : sss.pages };
                  }
                  return null;
                }).filter(Boolean);

                const filteredSubSessions = (section.subSessions || []).map((ss: any) => {
                  const filteredPages = (ss.pages || []).filter((p: any) => p.label.toLowerCase().includes(query));
                  const filteredSSSubSub = (ss.subSubSessions || []).map((sss: any) => {
                    const ssFilteredPages = (sss.pages || []).filter((p: any) => p.label.toLowerCase().includes(query));
                    if (sss.label.toLowerCase().includes(query) || ssFilteredPages.length > 0) {
                      return { ...sss, pages: ssFilteredPages.length > 0 ? ssFilteredPages : sss.pages };
                    }
                    return null;
                  }).filter(Boolean);

                  if (ss.label.toLowerCase().includes(query) || filteredPages.length > 0 || filteredSSSubSub.length > 0) {
                    return { ...ss, pages: filteredPages.length > 0 ? filteredPages : ss.pages, subSubSessions: filteredSSSubSub };
                  }
                  return null;
                }).filter(Boolean);

                const filteredPages = (section.pages || []).filter((p: any) => p.label.toLowerCase().includes(query));

                if (section.title.toLowerCase().includes(query) || filteredPages.length > 0 || filteredSubSessions.length > 0 || filteredSubSubSessions.length > 0) {
                  return { ...section, pages: filteredPages.length > 0 ? filteredPages : section.pages, subSessions: filteredSubSessions, subSubSessions: filteredSubSubSessions };
                }
                return null;
              }).filter(Boolean);
            };

            const allowedSections = filterMenuTree(menu.filter(s => hasAllowedPagesInSection(s)));

            /* ── COLLAPSED: one icon per section ──────────────── */
            if (isCollapsed) {
              return (
                <div className="flex flex-col items-center gap-0.5 w-full">
                  {allowedSections.map((section, idx) => {
                    const SectionIcon = iconMap[section.icon] || Folder;
                    const isHov = flyoutSection === section.id;

                    return (
                      <React.Fragment key={section.id}>
                        {idx > 0 && <div className="w-8 my-1.5 border-t border-white/10 self-center" />}

                        {/* Icon button — never changes appearance */}
                        <button
                          className={`w-10 h-10 flex items-center justify-center rounded-xl transition-all duration-200 ${
                            isHov
                              ? 'bg-slate-100 dark:bg-white/10'
                              : 'hover:bg-slate-100 dark:hover:bg-white/10'
                          }`}
                          onMouseEnter={(e) => {
                            const rect = e.currentTarget.getBoundingClientRect();
                            openFlyout(
                              section.id,
                              section.title,
                              flattenSectionPages(section),
                              rect.top + rect.height / 2,
                            );
                          }}
                          onMouseLeave={closeFlyout}
                        >
                          <SectionIcon size={18} color={section.icon_color || '#9CA3AF'} />
                        </button>
                      </React.Fragment>
                    );
                  })}
                </div>
              );
            }

            /* ── EXPANDED: full tree ────────────────────────────── */
            return allowedSections.map((section, sectionIndex) => (
              <div key={section.id}>
                {sectionIndex > 0 && (
                  <div className="mx-4 my-1 border-t border-slate-200/40 dark:border-white/5" />
                )}
                <div className="mb-2">
                  <button
                    onClick={(section.subSessions?.length > 0 || section.pages?.length > 0) ? () => toggleExpand(`sec-${section.id}`) : undefined}
                    className="w-full flex items-center gap-2 px-4 py-2 text-[10px] font-bold text-slate-600 dark:text-slate-500 uppercase tracking-widest hover:text-slate-900 dark:hover:text-slate-300 transition-colors group"
                  >
                    {(section.subSessions?.length > 0 || section.pages?.length > 0) ? (
                      <div className="relative flex items-center justify-center w-4 h-4">
                        <div className="opacity-100 group-hover:opacity-0 transition-opacity">
                          {React.createElement(iconMap[section.icon] || Folder, { size: 14, color: section.icon_color || '#64748b' })}
                        </div>
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                          <motion.div animate={{ rotate: (!!query || expanded[`sec-${section.id}`] !== false) ? 0 : -90 }}>
                            <ChevronDown size={14} />
                          </motion.div>
                        </div>
                      </div>
                    ) : (
                      <div className="w-4 h-4 flex items-center justify-center text-slate-500">
                        {React.createElement(iconMap[section.icon] || Folder, { size: 14, color: section.icon_color || '#64748b' })}
                      </div>
                    )}
                    <span className="text-[11px]">{section.title}</span>
                  </button>

                  <AnimatePresence initial={false}>
                    {(!!query || expanded[`sec-${section.id}`] !== false) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2, ease: 'easeInOut' }}
                        className="overflow-hidden"
                      >
                        {/* Direct pages */}
                        {Array.isArray(section.pages) && section.pages.filter(p => isPageAllowed(p.id)).map(page => (
                          <PageItemWithMenu
                            key={page.id}
                            page={page}
                            isActive={activePage === page.id}
                            paddingLeft="28px"
                            onPageChange={onPageChange}
                            canManagePermissions={canManageForSection(section.title)}
                            onOpenPermissions={(id, label) => setPermissionsPage({ id, label })}
                          />
                        ))}

                        {/* SubSubSessions directly in Section */}
                        {Array.isArray(section.subSubSessions) && section.subSubSessions.filter((sss: any) => hasAllowedPagesInSubSubSession(sss)).map((subSubSession: any) => {
                          const SubSubIcon = iconMap[subSubSession.icon];
                          return (
                            <div key={subSubSession.id}>
                              <div onClick={(e) => { e.stopPropagation(); toggleExpand(`secsubsub-${subSubSession.id}`); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '28px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', borderRadius: '8px', margin: '1px 8px 1px 0', cursor: 'pointer', background: 'transparent' }}
                                className="w-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all group"
                              >
                                <div className="relative flex items-center justify-center w-4 h-4">
                                  <div className="opacity-100 group-hover:opacity-0 transition-opacity">
                                    {SubSubIcon && <SubSubIcon size={14} color={subSubSession.icon_color || '#9CA3AF'} />}
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {subSubSession.pages?.length > 0
                                      ? (!!query || expanded[`secsubsub-${subSubSession.id}`]) ? <ChevronDown size={14} color="#7C3AED" /> : <ChevronRight size={14} color="#C4C4C4" />
                                      : <span style={{ width: 14 }} />}
                                  </div>
                                </div>
                                <span className="text-sm">{subSubSession.label}</span>
                              </div>
                              <AnimatePresence initial={false}>
                                {(!!query || expanded[`secsubsub-${subSubSession.id}`]) && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                    {Array.isArray(subSubSession.pages) && subSubSession.pages.filter((p: any) => isPageAllowed(p.id)).map((page: any) => (
                                      <PageItemWithMenu
                                        key={page.id}
                                        page={page}
                                        isActive={activePage === page.id}
                                        paddingLeft="40px"
                                        onPageChange={onPageChange}
                                        canManagePermissions={canManageForSection(section.title)}
                                        onOpenPermissions={(id, label) => setPermissionsPage({ id, label })}
                                      />
                                    ))}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}

                        {/* SubSessions */}
                        {Array.isArray(section.subSessions) && section.subSessions.filter(ss => hasAllowedPagesInSubSession(ss)).map(subSession => {
                          const Icon = iconMap[subSession.icon];
                          return (
                            <div key={subSession.id}>
                              <div onClick={(e) => { e.stopPropagation(); toggleExpand(`sub-${subSession.id}`); }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '28px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', borderRadius: '8px', margin: '1px 8px 1px 0', cursor: 'pointer', background: 'transparent' }}
                                className="w-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all group"
                              >
                                <div className="relative flex items-center justify-center w-4 h-4">
                                  <div className="opacity-100 group-hover:opacity-0 transition-opacity">
                                    {Icon && <Icon size={14} color={subSession.icon_color || '#9CA3AF'} />}
                                  </div>
                                  <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                    {(subSession.subSubSessions?.length > 0 || subSession.pages?.length > 0)
                                      ? (!!query || expanded[`sub-${subSession.id}`]) ? <ChevronDown size={14} color="#7C3AED" /> : <ChevronRight size={14} color="#C4C4C4" />
                                      : <span style={{ width: 14 }} />}
                                  </div>
                                </div>
                                <span className="text-sm">{subSession.label}</span>
                              </div>

                              <AnimatePresence initial={false}>
                                {(!!query || expanded[`sub-${subSession.id}`]) && (
                                  <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                    {Array.isArray(subSession.pages) && subSession.pages.filter(p => isPageAllowed(p.id)).map(page => (
                                      <PageItemWithMenu
                                        key={page.id}
                                        page={page}
                                        isActive={activePage === page.id}
                                        paddingLeft="40px"
                                        onPageChange={onPageChange}
                                        canManagePermissions={canManageForSection(section.title)}
                                        onOpenPermissions={(id, label) => setPermissionsPage({ id, label })}
                                      />
                                    ))}

                                    {Array.isArray(subSession.subSubSessions) && subSession.subSubSessions.filter(hasAllowedPagesInSubSubSession).map(subSubSession => {
                                      const SubIcon = iconMap[subSubSession.icon];
                                      return (
                                        <div key={subSubSession.id}>
                                          <div onClick={(e) => { e.stopPropagation(); toggleExpand(`subsub-${subSubSession.id}`); }}
                                            style={{ display: 'flex', alignItems: 'center', gap: '8px', paddingLeft: '40px', paddingRight: '12px', paddingTop: '7px', paddingBottom: '7px', borderRadius: '8px', margin: '1px 8px 1px 0', cursor: 'pointer', background: 'transparent' }}
                                            className="w-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white group"
                                          >
                                            <div className="relative flex items-center justify-center w-4 h-4">
                                              <div className="opacity-100 group-hover:opacity-0 transition-opacity">
                                                {SubIcon && <SubIcon size={14} color={subSubSession.icon_color || '#9CA3AF'} />}
                                              </div>
                                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                                {subSubSession.pages?.length > 0
                                                  ? (!!query || expanded[`subsub-${subSubSession.id}`]) ? <ChevronDown size={14} color="#7C3AED" /> : <ChevronRight size={14} color="#C4C4C4" />
                                                  : <span style={{ width: 14 }} />}
                                              </div>
                                            </div>
                                            <span className="text-sm">{subSubSession.label}</span>
                                          </div>
                                          <AnimatePresence initial={false}>
                                            {(!!query || expanded[`subsub-${subSubSession.id}`]) && (
                                              <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                                {Array.isArray(subSubSession.pages) && subSubSession.pages.filter(p => isPageAllowed(p.id)).map(page => (
                                                  <PageItemWithMenu
                                                    key={page.id}
                                                    page={page}
                                                    isActive={activePage === page.id}
                                                    paddingLeft="52px"
                                                    onPageChange={onPageChange}
                                                    canManagePermissions={canManageForSection(section.title)}
                                                    onOpenPermissions={(id, label) => setPermissionsPage({ id, label })}
                                                  />
                                                ))}
                                              </motion.div>
                                            )}
                                          </AnimatePresence>
                                        </div>
                                      );
                                    })}
                                  </motion.div>
                                )}
                              </AnimatePresence>
                            </div>
                          );
                        })}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            ));
          })()}
        </motion.div>

        {/* ── Bottom Items ─────────────────────────────────────── */}
        <div className={`border-t border-slate-200 dark:border-white/5 space-y-0.5 transition-all duration-300 ${isCollapsed ? 'py-2' : 'p-3'}`}>
          <button
            onClick={toggleTheme}
            className={`flex items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-white transition-all duration-200 group relative py-2 ${
              isCollapsed ? 'w-10 h-10 justify-center mx-auto' : 'w-full px-4 gap-3'
            }`}
          >
            <div className="shrink-0 flex items-center justify-center">
              {theme === 'light' ? <Sun size={20} /> : theme === 'dark' ? <Moon size={20} /> : <Zap size={20} />}
            </div>
            {!isCollapsed && (
              <span className="text-sm font-medium whitespace-nowrap">
                {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Escuro Profundo'}
              </span>
            )}
            {isCollapsed && (
              <div className="absolute left-full ml-4 px-3 py-2 bg-light-card dark:bg-dark-tooltip text-light-text dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-slate-200 dark:border-violet-500/10 whitespace-nowrap z-[100]">
                {theme === 'light' ? 'Claro' : theme === 'dark' ? 'Escuro' : 'Escuro Profundo'}
              </div>
            )}
          </button>

          {bottomItems.map((item) => (
            <button
              key={item.id}
              onClick={() => onPageChange(item.id)}
              className={`flex items-center rounded-xl text-slate-500 dark:text-slate-400 hover:bg-violet-500/10 hover:text-violet-600 dark:hover:text-white transition-all duration-200 group relative py-2 ${
                isCollapsed ? 'w-10 h-10 justify-center mx-auto' : 'w-full px-4 gap-3'
              } ${activePage === item.id ? 'bg-violet-500/10 text-violet-600 dark:text-white' : ''}`}
            >
              <div className="shrink-0 flex items-center justify-center">
                <item.icon size={20} />
              </div>
              {!isCollapsed && (
                <div className="flex-1 flex items-center justify-between">
                  <span className="text-sm font-medium whitespace-nowrap">{item.label}</span>
                  {item.badge && (
                    <span className="bg-violet-600 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md min-w-[18px] text-center">
                      {item.badge}
                    </span>
                  )}
                </div>
              )}
              {isCollapsed && (
                <div className="absolute left-full ml-4 px-3 py-2 bg-light-card dark:bg-dark-tooltip text-light-text dark:text-white text-xs rounded-lg opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity shadow-xl border border-slate-200 dark:border-violet-500/10 whitespace-nowrap z-[100]">
                  {item.label}
                </div>
              )}
            </button>
          ))}
        </div>

        {/* ── User Profile ─────────────────────────────────────── */}
        <div className={`mt-auto transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
          <div className={`flex items-center gap-3 p-2 rounded-2xl bg-dark-card/40 backdrop-blur-md border border-slate-200 dark:border-white/10 ${isCollapsed ? 'justify-center border-none bg-transparent' : ''}`}>
            <div className="relative shrink-0">
              <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center overflow-hidden border border-violet-500/30">
                <img
                  src={userData?.picture || user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`}
                  alt="User"
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-light-sidebar dark:border-dark-sidebar rounded-full" />
            </div>
            {!isCollapsed && (
              <div 
                className="flex-1 min-w-0 overflow-hidden cursor-pointer hover:bg-white/5 rounded-lg p-1 transition-colors"
                onClick={() => {
                  setProfileData({
                    picture: userData?.picture || user.photoURL || '',
                    phone: userData?.phone || '',
                    bio: userData?.bio || ''
                  });
                  setShowProfileModal(true);
                }}
                title="Editar perfil"
              >
                <p className="text-xs font-bold text-light-text dark:text-white truncate">{userData?.name || user.displayName || 'Usuário'}</p>
                <p className="text-[10px] text-slate-600 dark:text-slate-500 truncate">{user.email}</p>
              </div>
            )}
            {!isCollapsed && (
              <button
                onClick={() => signOut(auth)}
                className="p-2 rounded-lg hover:bg-rose-500/10 text-slate-500 dark:text-slate-400 hover:text-rose-600 dark:hover:text-rose-500 transition-colors shrink-0"
                title="Sair"
              >
                <LogOut size={16} />
              </button>
            )}
          </div>
          
          {/* ── Version Indicator ── */}
          <div className={`flex items-center gap-2 mt-4 transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-start px-2'}`}>
            <div className="w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)] shrink-0"></div>
            {!isCollapsed && (
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                {/* @ts-ignore */}
                {typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'v2.3.7'}
              </span>
            )}
          </div>
        </div>
      </aside>

      {/* ── Flyout panel (fixed, fora da sidebar) ────────────── */}
      {isCollapsed && flyoutSection && flyoutItems.length > 0 && (
        <div
          style={{
            position: 'fixed',
            left: 84,
            top: flyoutY,
            transform: 'translateY(-50%)',
            zIndex: 300,
          }}
          className="min-w-[200px] bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl shadow-2xl py-2 overflow-hidden"
          onMouseEnter={keepFlyout}
          onMouseLeave={closeFlyout}
        >
          <p className="text-[9px] font-bold text-slate-400 uppercase tracking-widest px-3 pb-1.5 pt-0.5">
            {flyoutTitle}
          </p>
          <div className="mx-3 mb-1.5 border-t border-slate-100 dark:border-white/10" />

          {flyoutItems.map(item => {
            const ItemIcon = iconMap[item.icon];
            const isActive = activePage === item.id;
            return (
              <a
                key={item.id}
                href={`#/${item.id}`}
                onClick={(e) => { e.preventDefault(); onPageChange(item.id); setFlyoutSection(null); }}
                style={{ paddingLeft: `${12 + item.indent * 16}px` }}
                className={`flex items-center gap-2.5 pr-4 py-2 mx-1 rounded-lg cursor-pointer transition-all text-xs font-medium no-underline ${
                  isActive
                    ? 'bg-violet-600 text-white'
                    : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/10 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                {ItemIcon && <ItemIcon size={13} color={isActive ? '#fff' : (item.icon_color || '#9CA3AF')} />}
                {item.label}
              </a>
            );
          })}
        </div>
      )}

      {/* ── User Profile Modal ─────────────────────────────── */}
      <AnimatePresence>
        {showProfileModal && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-white dark:bg-[#1e1b29] border border-slate-200 dark:border-white/10 rounded-2xl w-full max-w-md shadow-2xl overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-white/5 flex items-center justify-between">
                <h2 className="text-xl font-bold text-light-text dark:text-white">
                  {cropImage ? 'Ajustar Foto' : 'Editar Perfil'}
                </h2>
                <button onClick={() => {
                  if (cropImage) {
                    setCropImage(null);
                  } else {
                    setShowProfileModal(false);
                  }
                }} className="p-2 text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors rounded-lg hover:bg-slate-100 dark:hover:bg-white/5">
                  <X size={20} />
                </button>
              </div>
              
              {cropImage ? (
                <div className="p-6 flex flex-col">
                  <div className="relative w-full h-[300px] bg-black/10 dark:bg-black/40 rounded-2xl overflow-hidden mb-6">
                    <Cropper
                      image={cropImage}
                      crop={crop}
                      zoom={zoom}
                      aspect={1}
                      cropShape="round"
                      showGrid={false}
                      onCropChange={setCrop}
                      onCropComplete={(_, croppedPixels) => setCroppedAreaPixels(croppedPixels)}
                      onZoomChange={setZoom}
                    />
                  </div>
                  <div className="mb-4 px-2">
                    <label className="text-xs text-slate-500 font-bold uppercase tracking-wider mb-2 block">Zoom</label>
                    <input
                      type="range"
                      value={zoom}
                      min={1}
                      max={3}
                      step={0.1}
                      onChange={(e) => setZoom(Number(e.target.value))}
                      className="w-full accent-violet-600 cursor-pointer"
                    />
                  </div>
                  <div className="flex justify-end gap-3 mt-2 border-t border-slate-100 dark:border-white/5 pt-6">
                    <button onClick={() => setCropImage(null)} className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                      Cancelar
                    </button>
                    <button onClick={async () => {
                      if (croppedAreaPixels) {
                        const croppedImage = await getCroppedImg(cropImage, croppedAreaPixels);
                        setProfileData({...profileData, picture: croppedImage});
                        setCropImage(null);
                      }
                    }} className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold shadow-lg shadow-violet-600/20 transition-all">
                      Aplicar Foto
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  <div className="p-6 space-y-4">
                <div className="flex flex-col items-center justify-center gap-4 mb-2">
                  <div 
                    className="relative w-28 h-28 rounded-full bg-[#4285F4]/20 flex items-center justify-center overflow-hidden cursor-pointer group shadow-xl border-4 border-slate-100 dark:border-[#1e1b29]"
                    onClick={() => document.getElementById('profile-upload')?.click()}
                  >
                    {profileData.picture ? (
                      <img src={profileData.picture} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      <UserIcon size={56} className="text-[#4285F4]" />
                    )}
                    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                      <Camera size={28} className="text-white" />
                    </div>
                  </div>
                  <input 
                    id="profile-upload"
                    type="file" 
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        const reader = new FileReader();
                        reader.onload = (ev) => {
                          setCropImage(ev.target?.result as string);
                          setCrop({ x: 0, y: 0 });
                          setZoom(1);
                        };
                        reader.readAsDataURL(file);
                      }
                    }}
                  />
                  <div className="text-center flex flex-col items-center">
                    <p className="text-base font-bold text-light-text dark:text-white">Foto de Perfil</p>
                    <p className="text-xs text-slate-500 mt-1 mb-3">Clique na foto para alterar. JPG, PNG, GIF ou WebP.</p>
                    {userData?.role && (
                      <span className={`text-[10px] font-bold px-3 py-1 rounded uppercase tracking-widest ${
                        userData.role === 'superadmin' ? 'bg-rose-500/10 text-rose-600 dark:text-rose-500 border border-rose-500/20' :
                        userData.role === 'diretor-operacional' ? 'bg-amber-500/10 text-amber-600 dark:text-amber-500 border border-amber-500/20' :
                        userData.role === 'gestor-trafego' ? 'bg-violet-500/10 text-violet-600 dark:text-violet-500 border border-violet-500/20' :
                        userData.role === 'gerente-comercial' ? 'bg-orange-500/10 text-orange-600 dark:text-orange-500 border border-orange-500/20' :
                        'bg-blue-500/10 text-blue-600 dark:text-blue-500 border border-blue-500/20'
                      }`}>
                        {{
                          'superadmin': 'Superadmin',
                          'diretor-operacional': 'Diretor Operacional',
                          'gerente-operacional': 'Gerente Operacional',
                          'gerente-comercial': 'Gerente Comercial',
                          'gestor-trafego': 'Gestor de Tráfego',
                          'analista-ia': 'Analista de IA',
                          'design': 'Design',
                          'user': 'Usuário Padrão'
                        }[userData.role] || userData.role}
                      </span>
                    )}
                  </div>
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-light-text dark:text-white mb-2">
                    <Phone size={16} className="text-emerald-500" /> Telefone
                  </label>
                  <input 
                    type="text" 
                    value={profileData.phone} 
                    onChange={e => setProfileData({...profileData, phone: e.target.value})} 
                    placeholder="(00) 00000-0000" 
                    className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-light-text dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50"
                  />
                </div>
                <div>
                  <label className="flex items-center gap-2 text-sm font-bold text-light-text dark:text-white mb-2">
                    <UserIcon size={16} className="text-blue-500" /> Bio
                  </label>
                  <textarea 
                    value={profileData.bio} 
                    onChange={e => setProfileData({...profileData, bio: e.target.value})} 
                    placeholder="Conte um pouco sobre você..." 
                    rows={3}
                    className="w-full bg-slate-50 dark:bg-dark-input border border-slate-200 dark:border-white/10 rounded-xl px-4 py-3 text-sm text-light-text dark:text-white focus:outline-none focus:ring-2 focus:ring-violet-500/50 resize-none"
                  />
                </div>
                </div>
                <div className="p-6 border-t border-slate-100 dark:border-white/5 bg-slate-50 dark:bg-white/5 flex justify-end gap-3">
                  <button onClick={() => setShowProfileModal(false)} className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-slate-700 dark:hover:text-white transition-colors">
                    Cancelar
                  </button>
                  <button 
                    onClick={handleSaveProfile} 
                    disabled={isSavingProfile}
                    className="px-6 py-2 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-sm font-bold transition-all disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-violet-600/20"
                  >
                    {isSavingProfile ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Save size={16} />}
                    Salvar
                  </button>
                </div>
              </>
              )}
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* ── Page Permissions Modal ──────────────────────────── */}
      <AnimatePresence>
        {permissionsPage && (
          <PagePermissionsModal
            pageId={permissionsPage.id}
            pageLabel={permissionsPage.label}
            onClose={() => setPermissionsPage(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default Sidebar;
