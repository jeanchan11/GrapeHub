
// Sidebar component for GrapeHub
// Last updated: 2026-04-02 21:00 UTC
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { auth } from '../firebase';
import { signOut, User as FirebaseUser } from 'firebase/auth';
import { UserData, UserRole } from '../../types';
import { iconMap } from '../lib/iconMap';
import { useMenu } from '../context/MenuContext';
import { 
  Search, Bell, Settings, X,
  ChevronRight, ChevronLeft, LogOut,
  ChevronDown, Sun, Moon, Zap, Folder, Shield
} from 'lucide-react';

interface SidebarProps {
  activePage: string;
  onPageChange: (page: string) => void;
  user: FirebaseUser;
  userData: UserData | null;
  theme: 'light' | 'dark' | 'darker';
  toggleTheme: () => void;
}

const Sidebar: React.FC<SidebarProps> = ({ activePage, onPageChange, user, userData, theme, toggleTheme }) => {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const { menu } = useMenu();

  const toggleExpand = (id: string) => {
    setExpanded(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const isPageAllowed = (pageId: string) => {
    console.log('userData:', userData);
    console.log('allowedPages:', userData?.allowedPages);
    if (userData && 'allowedPages' in userData) {
      console.log('allowedPages type:', typeof userData.allowedPages);
      console.log('allowedPages value:', userData.allowedPages);
    }
    if (userData?.role === 'superadmin' || userData?.role === 'gerente-operacional') return true;
    const allowed = userData?.allowedPages?.includes(pageId);
    console.log(`Page ${pageId} allowed:`, allowed);
    return allowed;
  };

  const hasAllowedPagesInSubSubSession = (subSubSession: any) => {
    const allowed = subSubSession.pages?.some((p: any) => isPageAllowed(p.id)) ?? false;
    return allowed;
  };

  const hasAllowedPagesInSubSession = (subSession: any) => {
    const allowedInSubSub = subSession.subSubSessions?.some((sss: any) => hasAllowedPagesInSubSubSession(sss)) ?? false;
    const allowedInPages = subSession.pages?.some((p: any) => isPageAllowed(p.id)) ?? false;
    return allowedInSubSub || allowedInPages;
  };

  const hasAllowedPagesInSection = (section: any) => {
    const allowedInSubs = section.subSessions?.some((ss: any) => hasAllowedPagesInSubSession(ss)) ?? false;
    const allowedInSectionPages = section.pages?.some((p: any) => isPageAllowed(p.id)) ?? false;
    const allowedInSectionSubSubs = section.subSubSessions?.some((sss: any) => hasAllowedPagesInSubSubSession(sss)) ?? false;
    return allowedInSubs || allowedInSectionPages || allowedInSectionSubSubs;
  };

  const bottomItems = [
    { id: 'notifications', label: 'Notificações', icon: Bell, badge: 12 },
    { id: 'settings', label: 'Configurações', icon: Settings },
  ];

  return (
    <motion.aside
      initial={false}
      animate={{ width: isCollapsed ? 80 : 280 }}
      transition={{ type: "spring", stiffness: 400, damping: 40 }}
      className="h-screen bg-white dark:bg-dark-bg/80 backdrop-blur-xl border-r border-slate-200 dark:border-white/10 flex flex-col relative z-50 shadow-2xl rounded-tr-[2.5rem] transition-colors duration-300"
    >
      {/* Header */}
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
          {isCollapsed ? (
            <ChevronRight size={16} className="group-hover:scale-110 transition-transform" />
          ) : (
            <ChevronLeft size={16} className="group-hover:scale-110 transition-transform" />
          )}
        </button>
      </div>

      {/* Search */}
      <div className={`mb-6 flex justify-center transition-all duration-300 ${isCollapsed ? 'px-0' : 'px-4'}`}>
        <motion.div layout className="relative flex items-center h-10 w-full">
          <motion.div 
            layout="position"
            className={`z-10 text-slate-500 flex items-center justify-center transition-all duration-300 ${isCollapsed ? 'w-full' : 'absolute left-3'}`}
          >
            <Search size={18} />
          </motion.div>
          <AnimatePresence mode="popLayout">
            {!isCollapsed && (
              <motion.input
                layout
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: '100%' }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ type: "spring", stiffness: 400, damping: 40 }}
                type="text"
                placeholder="Search"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-light-bg dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 pl-10 pr-4 text-sm text-light-text dark:text-white placeholder:text-slate-500 outline-none focus:ring-2 focus:ring-violet-500/20 transition-colors overflow-hidden"
              />
            )}
          </AnimatePresence>
        </motion.div>
      </div>

      {/* Navigation */}
      <motion.div layout className={`flex-1 overflow-y-auto space-y-2 scrollbar-hide py-2 transition-all duration-300 ${isCollapsed ? 'px-0' : 'px-2'}`}>
        {Array.isArray(menu) && (() => {
          const allowedSections = menu.filter(s => hasAllowedPagesInSection(s));
          return allowedSections.map((section, sectionIndex) => (
            <div key={section.id}>
              {sectionIndex > 0 && (
                <div className="mx-4 my-1 border-t border-slate-200/40 dark:border-white/5" />
              )}
              <div className="mb-2">
              {!isCollapsed && (
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
                        <motion.div animate={{ rotate: expanded[`sec-${section.id}`] === false ? -90 : 0 }}>
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
              )}

              <AnimatePresence initial={false}>
                {(expanded[`sec-${section.id}`] !== false || isCollapsed) && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    transition={{ duration: 0.2, ease: 'easeInOut' }}
                    className="overflow-hidden"
                  >
                    {/* Pages directly in Section */}
                    {Array.isArray(section.pages) && section.pages.filter(p => isPageAllowed(p.id)).map(page => {
                      const PageIcon = iconMap[page.icon];
                      const isActive = activePage === page.id;
                      return (
                        <div
                          key={page.id}
                          onClick={() => onPageChange(page.id)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            paddingLeft: '28px',
                            paddingRight: '12px',
                            paddingTop: '7px',
                            paddingBottom: '7px',
                            borderRadius: '8px',
                            margin: '1px 8px 1px 0',
                            cursor: 'pointer',
                            background: isActive ? '#7C3AED' : 'transparent',
                          }}
                          className={`w-full text-sm font-medium transition-all duration-200 ${
                            isActive 
                              ? 'text-white font-semibold' 
                              : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                          }`}
                        >
                          {PageIcon && <PageIcon size={14} color={isActive ? '#FFFFFF' : (page.icon_color || '#9CA3AF')} />}
                          {!isCollapsed && <span style={{ color: isActive ? '#FFFFFF' : 'inherit' }}>{page.label}</span>}
                        </div>
                      );
                    })}

                    {/* SubSubSessions directly in Section */}
                    {Array.isArray(section.subSubSessions) && section.subSubSessions.filter((sss: any) => hasAllowedPagesInSubSubSession(sss)).map((subSubSession: any) => {
                      const SubSubIcon = iconMap[subSubSession.icon];
                      return (
                        <div key={subSubSession.id}>
                          <div
                            onClick={(e) => { e.stopPropagation(); toggleExpand(`secsubsub-${subSubSession.id}`); }}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '8px',
                              paddingLeft: '28px', paddingRight: '12px',
                              paddingTop: '7px', paddingBottom: '7px',
                              borderRadius: '8px', margin: '1px 8px 1px 0',
                              cursor: 'pointer', background: 'transparent',
                            }}
                            className="w-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all group"
                          >
                            <div className="relative flex items-center justify-center w-4 h-4">
                              <div className="opacity-100 group-hover:opacity-0 transition-opacity">
                                {SubSubIcon && <SubSubIcon size={14} color={subSubSession.icon_color || '#9CA3AF'} />}
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {subSubSession.pages?.length > 0 ? (
                                  expanded[`secsubsub-${subSubSession.id}`]
                                    ? <ChevronDown size={14} color="#7C3AED" />
                                    : <ChevronRight size={14} color="#C4C4C4" />
                                ) : <span style={{ width: 14 }} />}
                              </div>
                            </div>
                            {!isCollapsed && <span className="text-sm">{subSubSession.label}</span>}
                          </div>
                          <AnimatePresence initial={false}>
                            {expanded[`secsubsub-${subSubSession.id}`] && !isCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                {Array.isArray(subSubSession.pages) && subSubSession.pages.filter((p: any) => isPageAllowed(p.id)).map((page: any) => {
                                  const PageIcon = iconMap[page.icon];
                                  const isActive = activePage === page.id;
                                  return (
                                    <div
                                      key={page.id}
                                      onClick={() => onPageChange(page.id)}
                                      style={{
                                        display: 'flex', alignItems: 'center', gap: '8px',
                                        paddingLeft: '40px', paddingRight: '12px',
                                        paddingTop: '7px', paddingBottom: '7px',
                                        borderRadius: '8px', margin: '1px 8px 1px 0',
                                        cursor: 'pointer',
                                        background: isActive ? '#7C3AED' : 'transparent',
                                      }}
                                      className={`w-full text-sm font-medium transition-all duration-200 ${
                                        isActive
                                          ? 'text-white font-semibold'
                                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                      }`}
                                    >
                                      {PageIcon && <PageIcon size={14} color={isActive ? '#FFFFFF' : (page.icon_color || '#9CA3AF')} />}
                                      <span style={{ color: isActive ? '#FFFFFF' : 'inherit' }}>{page.label}</span>
                                    </div>
                                  );
                                })}
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
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleExpand(`sub-${subSession.id}`);
                            }}
                            style={{
                              display: 'flex',
                              alignItems: 'center',
                              gap: '8px',
                              paddingLeft: '28px',
                              paddingRight: '12px',
                              paddingTop: '7px',
                              paddingBottom: '7px',
                              borderRadius: '8px',
                              margin: '1px 8px 1px 0',
                              cursor: 'pointer',
                              background: 'transparent',
                            }}
                            className="w-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white transition-all group"
                          >
                            <div className="relative flex items-center justify-center w-4 h-4">
                              <div className="opacity-100 group-hover:opacity-0 transition-opacity">
                                {Icon && <Icon size={14} color={subSession.icon_color || "#9CA3AF"} />}
                              </div>
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                {(subSession.subSubSessions?.length > 0 || subSession.pages?.length > 0) ? (
                                  expanded[`sub-${subSession.id}`]
                                    ? <ChevronDown size={14} color="#7C3AED" />
                                    : <ChevronRight size={14} color="#C4C4C4" />
                                ) : (
                                  <span style={{ width: 14 }} />
                                )}
                              </div>
                            </div>
                            {!isCollapsed && <span className="text-sm">{subSession.label}</span>}
                          </div>

                          <AnimatePresence initial={false}>
                            {expanded[`sub-${subSession.id}`] && !isCollapsed && (
                              <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 'auto', opacity: 1 }}
                                exit={{ height: 0, opacity: 0 }}
                                transition={{ duration: 0.2, ease: 'easeInOut' }}
                                className="overflow-hidden"
                              >
                                {/* Pages in SubSession */}
                                {Array.isArray(subSession.pages) && subSession.pages.filter(p => isPageAllowed(p.id)).map(page => {
                                  const PageIcon = iconMap[page.icon];
                                  const isActive = activePage === page.id;
                                  return (
                                    <div
                                      key={page.id}
                                      onClick={() => onPageChange(page.id)}
                                      style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px',
                                        paddingLeft: '40px',
                                        paddingRight: '12px',
                                        paddingTop: '7px',
                                        paddingBottom: '7px',
                                        borderRadius: '8px',
                                        margin: '1px 8px 1px 0',
                                        cursor: 'pointer',
                                        background: isActive ? '#7C3AED' : 'transparent',
                                      }}
                                      className={`w-full text-sm font-medium transition-all duration-200 ${
                                        isActive 
                                          ? 'text-white font-semibold' 
                                          : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                      }`}
                                    >
                                      {PageIcon && <PageIcon size={14} color={isActive ? '#FFFFFF' : (page.icon_color || '#9CA3AF')} />}
                                      <span style={{ color: isActive ? '#FFFFFF' : 'inherit' }}>{page.label}</span>
                                    </div>
                                  );
                                })}

                                {/* SubSubSessions */}
                                {Array.isArray(subSession.subSubSessions) && subSession.subSubSessions.filter(hasAllowedPagesInSubSubSession).map(subSubSession => {
                                  const SubIcon = iconMap[subSubSession.icon];
                                  return (
                                    <div key={subSubSession.id}>
                                      <div 
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          toggleExpand(`subsub-${subSubSession.id}`);
                                        }}
                                        style={{
                                          display: 'flex',
                                          alignItems: 'center',
                                          gap: '8px',
                                          paddingLeft: '40px',
                                          paddingRight: '12px',
                                          paddingTop: '7px',
                                          paddingBottom: '7px',
                                          borderRadius: '8px',
                                          margin: '1px 8px 1px 0',
                                          cursor: 'pointer',
                                          background: 'transparent',
                                        }}
                                        className="w-full text-sm font-medium text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white group"
                                      >
                                        <div className="relative flex items-center justify-center w-4 h-4">
                                          <div className="opacity-100 group-hover:opacity-0 transition-opacity">
                                            {SubIcon && <SubIcon size={14} color={subSubSession.icon_color || "#9CA3AF"} />}
                                          </div>
                                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                                            {subSubSession.pages?.length > 0 ? (
                                              expanded[`subsub-${subSubSession.id}`]
                                                ? <ChevronDown size={14} color="#7C3AED" />
                                                : <ChevronRight size={14} color="#C4C4C4" />
                                            ) : (
                                              <span style={{ width: 14 }} />
                                            )}
                                          </div>
                                        </div>
                                        {!isCollapsed && <span className="text-sm">{subSubSession.label}</span>}
                                      </div>

                                      <AnimatePresence initial={false}>
                                        {expanded[`subsub-${subSubSession.id}`] && !isCollapsed && (
                                          <motion.div
                                            initial={{ height: 0, opacity: 0 }}
                                            animate={{ height: 'auto', opacity: 1 }}
                                            exit={{ height: 0, opacity: 0 }}
                                            transition={{ duration: 0.2, ease: 'easeInOut' }}
                                            className="overflow-hidden"
                                          >
                                            {Array.isArray(subSubSession.pages) && subSubSession.pages.filter(p => isPageAllowed(p.id)).map(page => {
                                              const PageIcon = iconMap[page.icon];
                                              const isActive = activePage === page.id;
                                              return (
                                                <div
                                                  key={page.id}
                                                  onClick={() => onPageChange(page.id)}
                                                  style={{
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '8px',
                                                    paddingLeft: '52px',
                                                    paddingRight: '12px',
                                                    paddingTop: '7px',
                                                    paddingBottom: '7px',
                                                    borderRadius: '8px',
                                                    margin: '1px 8px 1px 0',
                                                    cursor: 'pointer',
                                                    background: isActive ? '#7C3AED' : 'transparent',
                                                  }}
                                                  className={`w-full text-sm font-medium transition-all duration-200 ${
                                                    isActive 
                                                      ? 'text-white font-semibold' 
                                                      : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-white'
                                                  }`}
                                                >
                                                  {PageIcon && <PageIcon size={14} color={isActive ? '#FFFFFF' : (page.icon_color || '#9CA3AF')} />}
                                                  <span style={{ color: isActive ? '#FFFFFF' : 'inherit' }}>{page.label}</span>
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

      {/* Bottom Items */}
      <div className={`border-t border-slate-200 dark:border-white/5 space-y-0.5 transition-all duration-300 ${isCollapsed ? 'py-2' : 'p-3'}`}>
        {/* Theme Toggle */}
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
                <span className="text-sm font-medium whitespace-nowrap">
                  {item.label}
                </span>
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

      {/* User Profile */}
      <div className={`mt-auto transition-all duration-300 ${isCollapsed ? 'p-2' : 'p-3'}`}>
        <div className={`flex items-center gap-3 p-2 rounded-2xl bg-dark-card/40 backdrop-blur-md border border-slate-200 dark:border-white/10 ${isCollapsed ? 'justify-center border-none bg-transparent' : ''}`}>
          <div className="relative shrink-0">
            <div className="w-9 h-9 rounded-xl bg-violet-500/20 flex items-center justify-center overflow-hidden border border-violet-500/30">
              <img 
                src={user.photoURL || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user.email}`} 
                alt="User"
                className="w-full h-full object-cover"
              />
            </div>
            <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-emerald-500 border-2 border-light-sidebar dark:border-dark-sidebar rounded-full"></div>
          </div>
          
          {!isCollapsed && (
            <div className="flex-1 min-w-0 overflow-hidden">
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
      </div>
    </motion.aside>
  );
};

export default Sidebar;
