
// App component for GrapeHub
// Last updated: 2026-04-02 21:00 UTC
import React, { useState, useEffect, useMemo } from 'react';

import Sidebar from './src/components/Sidebar';
import PageTransition from './src/components/PageTransition';
import GestorCalculator from './src/pages/GestorCalculator';
import CloserCalculator from './src/pages/CloserCalculator';
import ComercialGrape from './src/pages/ComercialGrape';
import ProjectsModule from './src/pages/ProjectsModule';
import TodoPage from './src/pages/TodoPage';
import ActiveClients from './src/pages/ActiveClients';
import WelcomePage from './src/pages/WelcomePage';
import CrmFinanceiro from './src/pages/CrmFinanceiro';
import CrmComercial from './src/pages/CrmComercial';
import { GestorDashboard } from './src/pages/GestorDashboard';
import FinanceiroDashboard from './src/pages/FinanceiroDashboard';
import Extrato from './src/pages/Extrato';
import TaskTemplates from './src/pages/TaskTemplates';
import Atividades from './src/pages/Atividades';
import CrmLigacoes from './src/pages/CrmLigacoes';
import CrmPessoas from './src/pages/CrmPessoas';
import CrmEmpresas from './src/pages/CrmEmpresas';
import CrmMetas from './src/pages/CrmMetas';
import CrmMetricas from './src/pages/CrmMetricas';
import Automacoes from './src/pages/Automacoes';
import CrmSequencias from './src/pages/CrmSequencias';
import MarketingDashboard from './src/pages/MarketingDashboard';
import MarketingAcoes from './src/pages/MarketingAcoes';
import PlaybookAcoes from './src/pages/PlaybookAcoes';
import DashboardOperacional from './src/pages/DashboardOperacional';
import ParceirosSquad from './src/pages/ParceirosSquad';
import TodoStaff from './src/pages/TodoStaff';
import ChamadosGrapehub from './src/pages/ChamadosGrapehub';
import OnboardingOperacional from './src/pages/OnboardingOperacional';
import ImplementacaoIA from './src/pages/ImplementacaoIA';
import VisualHub from './src/pages/VisualHub';
import ChecklistIntegracao from './src/pages/ChecklistIntegracao';
import ChecklistSaida from './src/pages/ChecklistSaida';
import ContratacaoPage from './src/pages/ContratacaoPage';
import ContasAPagar from './src/pages/ContasAPagar';
import ContasAReceber from './src/pages/ContasAReceber';
import ColaboradoresPage from './src/pages/ColaboradoresPage';

import MeetingNotes from './src/pages/MeetingNotes';
import PlanejamentoCrescimento from './src/pages/PlanejamentoCrescimento';
import CandidateApplicationForm from './src/pages/CandidateApplicationForm';
import CollaboratorOnboardingForm from './src/pages/CollaboratorOnboardingForm';
import BriefingForm from './src/pages/BriefingForm';
import SaboteurTestPage from './src/pages/SaboteurTestPage';
import DiscTestPage from './src/pages/DiscTestPage';
import SenhasPage from './src/pages/SenhasPage';
import PlanosDeCarreira from './src/pages/PlanosDeCarreira';
import Login from './src/components/LoginView';
import AdminPanel from './src/components/AdminPanel';
import LoadingSpinner from './src/components/LoadingSpinner';
import { auth, db, handleFirestoreError, OperationType, isFirebaseConfigValid } from './src/firebase';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, setDoc, onSnapshot } from 'firebase/firestore';
import { UserData, UserRole } from './types';
import { 
  SDRCalculator, 
  GerenteOperacionalCalculator,
  NotificationsPage,
  SettingsPage,
  SquadAblePage
} from './src/pages/Placeholders';

import { AuthProvider, useAuth } from './src/contexts/AuthContext';
import { MenuProvider, useMenu } from './src/context/MenuContext';

const AppContent: React.FC = () => {
  const { user, userData, loading } = useAuth();
  const { menu } = useMenu();
  console.log('AppContent userData:', userData);
  const [activePage, setActivePage] = useState(() => {
    // Read from URL hash first (e.g. /#/chamados-grapehub)
    const hash = window.location.hash.replace(/^#\/?/, '');
    if (hash) return hash;
    // Fallback to localStorage for backward compatibility
    return localStorage.getItem('activePage') || 'welcome';
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'darker'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark' | 'darker') || 'dark';
  });
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar-collapsed') === 'true'; } catch { return false; }
  });

  // Sync URL hash when activePage changes
  useEffect(() => {
    const currentHash = window.location.hash.replace(/^#\/?/, '');
    if (currentHash !== activePage) {
      window.history.replaceState(null, '', `#/${activePage}`);
    }
    localStorage.setItem('activePage', activePage);
  }, [activePage]);

  // Navigate to page with browser history support
  const navigateTo = (pageId: string) => {
    if (pageId !== activePage) {
      window.history.pushState(null, '', `#/${pageId}`);
      setActivePage(pageId);
    }
  };

  // Listen for browser back/forward navigation
  useEffect(() => {
    const handlePopState = () => {
      const hash = window.location.hash.replace(/^#\/?/, '');
      if (hash && hash !== activePage) {
        setActivePage(hash);
      }
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, [activePage]);

  // Resolve o template da página ativa (necessário para detectar páginas financeiras no AIChat)
  const pageTemplate = useMemo(() => {
    if (!Array.isArray(menu)) return activePage;
    let resolved = activePage;
    let found = false;
    for (const section of menu) {
      if (found) break;
      if (Array.isArray(section.pages)) {
        const page = section.pages.find((p: any) => p.id === activePage);
        if (page?.template) { resolved = page.template; found = true; break; }
      }
      if (Array.isArray(section.subSubSessions)) {
        for (const sss of section.subSubSessions) {
          if (Array.isArray(sss.pages)) {
            const page = sss.pages.find((p: any) => p.id === activePage);
            if (page?.template) { resolved = page.template; found = true; break; }
          }
        }
      }
      if (found) break;
      if (Array.isArray(section.subSessions)) {
        for (const ss of section.subSessions) {
          if (found) break;
          if (Array.isArray(ss.pages)) {
            const page = ss.pages.find((p: any) => p.id === activePage);
            if (page?.template) { resolved = page.template; found = true; break; }
          }
          if (Array.isArray(ss.subSubSessions)) {
            for (const sss of ss.subSubSessions) {
              if (Array.isArray(sss.pages)) {
                const page = sss.pages.find((p: any) => p.id === activePage);
                if (page?.template) { resolved = page.template; found = true; break; }
              }
            }
          }
        }
      }
    }
    return resolved;
  }, [activePage, menu]);

  // Resolve o subsessionId da página ativa — usado pelo dashboard de squad
  const activeSubsessionId = useMemo(() => {
    if (!Array.isArray(menu)) return null;
    for (const section of menu) {
      if (Array.isArray(section.subSessions)) {
        for (const ss of section.subSessions) {
          // Page directly in subsession
          if (Array.isArray(ss.pages)) {
            if (ss.pages.some((p: any) => p.id === activePage)) return ss.id;
          }
          // Page inside a subsubsession of this subsession
          if (Array.isArray(ss.subSubSessions)) {
            for (const sss of ss.subSubSessions) {
              if (Array.isArray(sss.pages)) {
                if (sss.pages.some((p: any) => p.id === activePage)) return ss.id;
              }
            }
          }
        }
      }
    }
    return null;
  }, [activePage, menu]);

  if (!isFirebaseConfigValid && import.meta.env.PROD) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white p-10 text-center font-sans">
        <div>
          <h1 className="text-2xl font-bold text-red-600 mb-4">Configuração Incompleta</h1>
          <p className="text-slate-600 mb-6">As variáveis de ambiente do Firebase não foram encontradas.</p>
          <div className="bg-slate-100 p-4 rounded-lg text-left text-xs font-mono mb-6">
            <p>VITE_FIREBASE_API_KEY</p>
            <p>VITE_FIREBASE_PROJECT_ID</p>
            <p>VITE_FIREBASE_AUTH_DOMAIN</p>
            <p>VITE_FIREBASE_APP_ID</p>
          </div>
          <p className="text-sm text-slate-500">Configure estas variáveis no painel da Hostinger ou GitHub Secrets.</p>
        </div>
      </div>
    );
  }

  useEffect(() => {
    document.documentElement.classList.remove('light', 'dark', 'darker');
    if (theme === 'darker') {
      document.documentElement.classList.add('dark', 'darker');
    } else {
      document.documentElement.classList.add(theme);
    }
    localStorage.setItem('theme', theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prev => prev === 'dark' ? 'darker' : prev === 'darker' ? 'light' : 'dark');
  };

  const renderPage = () => {
    // Guard: if user is logged in but userData hasn't loaded yet, show spinner
    // This prevents the "Acesso Restrito" flash during token refresh or slow API
    if (user && !userData) {
      return (
        <div className="flex items-center justify-center h-full">
          <LoadingSpinner size="lg" />
        </div>
      );
    }

    const isAdmin = userData?.role === 'superadmin' || userData?.role === 'gerente-operacional';
    const isAllowed = isAdmin || userData?.allowedPages?.includes(activePage);
    
    // Admin panel — superadmin only
    if (activePage === 'admin' && userData?.role === 'superadmin') {
      return <AdminPanel />;
    }
    if (activePage === 'admin') {
      return (
        <div className="flex items-center justify-center h-full text-slate-500">
          <div className="text-center">
            <p className="text-xl font-bold mb-2">Acesso Restrito</p>
            <p className="text-sm">Apenas o super administrador pode acessar esta área.</p>
          </div>
        </div>
      );
    }
    // Settings and notifications — accessible to ALL logged-in users
    if (activePage === 'settings' || activePage === 'notifications') {
      // fall through to switch below
    } else if (!isAllowed) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500">
          <div className="text-center">
            <p className="text-xl font-bold mb-2">Acesso Restrito</p>
            <p className="text-sm">Você não tem permissão para visualizar esta página.</p>
          </div>
        </div>
      );
    }

    console.log('AppContent renderPage - activePage:', activePage, 'pageTemplate:', pageTemplate);

    switch (pageTemplate) {
      case 'admin':
        return <AdminPanel />;
      case 'active-clients':
        return <ActiveClients />;
      case 'crm-financeiro':
        return <CrmFinanceiro />;
      case 'crm-comercial':
        return <CrmComercial />;
      case 'comercial-grape':
        return <ComercialGrape />;
      case 'projects':
        console.log("AppContent: Rendering ProjectsModule with activePage:", activePage);
        return <ProjectsModule key={activePage} activePage={activePage} />;
      case 'todo':
        return <TodoPage key={activePage} activePage={activePage} onPageChange={navigateTo} />;
      case 'gestor-dashboard':
        return <GestorDashboard />;
      case 'closer':
        return <CloserCalculator />;
      case 'gestor':
        return <GestorCalculator />;
      case 'sdr':
        return <SDRCalculator />;
      case 'gerente-operacional':
        return <GerenteOperacionalCalculator />;
      case 'squad-able':
        return <SquadAblePage />;
      case 'notifications':
        return <NotificationsPage />;
      case 'settings':
        return <SettingsPage onPageChange={navigateTo} isSuperAdmin={userData?.role === 'superadmin'} />;
      case 'financeiro-dashboard':
        return <FinanceiroDashboard />;
      case 'fin-extrato':
        return <Extrato />;
      case 'kpis-squad':
        return <DashboardOperacional key={activePage} activePage={activePage} subsessionId={activeSubsessionId} />;
      case 'parceiros-squad':
        return <ParceirosSquad activePage={activePage} onPageChange={navigateTo} />;
      case 'blank':
        return <div className="p-8 text-center text-slate-500">Esta é uma página em branco.</div>;
      case 'task-templates':
        return <TaskTemplates />;
      case 'crm-atividades':
        return <Atividades />;
      case 'crm-pessoas':
        return <CrmPessoas />;
      case 'crm-empresas':
        return <CrmEmpresas />;
      case 'crm-metas':
        return <CrmMetas />;
      case 'crm-metricas':
        return <CrmMetricas />;
      case 'crm-sequencias':
        return <CrmSequencias />;
      case 'ligacoes-dashboard':
        return <CrmLigacoes />;
      case 'automacoes':
        return <Automacoes />;
      case 'marketing-dashboard':
        return <MarketingDashboard />;
      case 'marketing-acoes':
        return <MarketingAcoes key={activePage} activePage={activePage} />;
      case 'playbook-acoes':
        return <PlaybookAcoes />;
      case 'dashboard-operacional':
        return <DashboardOperacional activePage={activePage} />;
      case 'todo-staff':
        return <TodoStaff key={activePage} activePage={activePage} />;
      case 'chamados-grapehub':
        return <ChamadosGrapehub key={activePage} activePage={activePage} />;
      case 'onboarding-operacional':
        return <OnboardingOperacional />;
      case 'implementacao-ia':
        return <ImplementacaoIA />;
      case 'visual-hub':
        return <VisualHub />;
      case 'checklist-integracao':
        return <ChecklistIntegracao />;
      case 'checklist-saida':
        return <ChecklistSaida />;
      case 'contratacao':
        return <ContratacaoPage />;
      case 'contas-a-pagar':
        return <ContasAPagar />;
      case 'contas-a-receber':
        return <ContasAReceber />;
      case 'colaboradores':
        return <ColaboradoresPage />;
      case 'planejamento-crescimento':
        return <PlanejamentoCrescimento />;
      case 'senhas':
        return <SenhasPage activePage={activePage} />;
      case 'planos-de-carreira':
        return <PlanosDeCarreira key={activePage} activePage={activePage} />;

      case 'meeting-notes': {
        // Find the page label from menu for the title
        let pageLabel = '';
        if (Array.isArray(menu)) {
          outer: for (const sec of menu) {
            for (const ss of sec.subSessions || []) {
              for (const p of ss.pages || []) { if (p.id === activePage) { pageLabel = p.label; break outer; } }
              for (const sss of ss.subSubSessions || []) {
                for (const p of sss.pages || []) { if (p.id === activePage) { pageLabel = p.label; break outer; } }
              }
            }
            for (const p of sec.pages || []) { if (p.id === activePage) { pageLabel = p.label; break outer; } }
          }
        }
        return <MeetingNotes key={activePage} activePage={activePage} pageLabel={pageLabel} />;
      }
      case 'welcome':
      default:
        return <WelcomePage />;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-light-bg dark:bg-dark-bg">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  // Bypass Auth for Public Forms
  if (window.location.pathname.startsWith('/f/')) {
    const leadId = window.location.pathname.split('/').pop() || '';
    // Import dynamically or inline
    const PublicFormModule = React.lazy(() => import('./src/pages/PublicForm'));
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-slate-950 flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
        <PublicFormModule leadId={leadId} />
      </React.Suspense>
    );
  }

  // Bypass Auth for NPS Form
  if (window.location.pathname.startsWith('/nps/')) {
    const projectId = window.location.pathname.split('/').pop() || '';
    const NpsFormModule = React.lazy(() => import('./src/pages/NpsForm'));
    return (
      <React.Suspense fallback={<div className="min-h-screen bg-black flex items-center justify-center"><LoadingSpinner size="lg" /></div>}>
        <NpsFormModule projectId={projectId} />
      </React.Suspense>
    );
  }

  if (!user) {
    return <Login />;
  }

  return (
    <div className="h-screen overflow-hidden bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <Sidebar 
        activePage={activePage} 
        onPageChange={navigateTo} 
        user={user}
        userData={userData}
        theme={theme}
        toggleTheme={toggleTheme}
        onCollapseChange={setSidebarCollapsed}
      />
      <main 
        className="h-screen overflow-y-auto scrollbar-hide rounded-tl-[2.5rem] bg-light-bg dark:bg-dark-bg"
        style={{ 
          marginLeft: sidebarCollapsed ? 80 : 280, 
          transition: 'margin-left 0.3s cubic-bezier(0.4, 0, 0.2, 1), background-color 0.3s',
          willChange: 'margin-left',
        }}
      >
        <PageTransition pageKey={activePage}>
          {renderPage()}
        </PageTransition>
      </main>
    </div>
  );
};

const App: React.FC = () => {
  if (window.location.search.includes('?disc-test=')) {
    return <DiscTestPage />;
  }

  if (window.location.search.includes('?saboteur-test=')) {
    return <SaboteurTestPage />;
  }

  if (window.location.search.includes('?apply=')) {
    return <CandidateApplicationForm />;
  }

  if (window.location.search.includes('?onboarding=')) {
    return <CollaboratorOnboardingForm />;
  }

  if (window.location.search.includes('?briefing=')) {
    return <BriefingForm />;
  }

  return (
    <AuthProvider>
      <MenuProvider>
        <AppContent />
      </MenuProvider>
    </AuthProvider>
  );
};

export default App;
