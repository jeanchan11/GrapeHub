
// App component for GrapeHub
// Last updated: 2026-04-02 21:00 UTC
import React, { useState, useEffect } from 'react';
import Sidebar from './src/components/Sidebar';
import GestorCalculator from './src/pages/GestorCalculator';
import CloserCalculator from './src/pages/CloserCalculator';
import ComercialGrape from './src/pages/ComercialGrape';
import ProjectsModule from './src/pages/ProjectsModule';
import TodoPage from './src/pages/TodoPage';
import ActiveClients from './src/pages/ActiveClients';
import CrmFinanceiro from './src/pages/CrmFinanceiro';
import CrmComercial from './src/pages/CrmComercial';
import { GestorDashboard } from './src/pages/GestorDashboard';
import FinanceiroDashboard from './src/pages/FinanceiroDashboard';
import TaskTemplates from './src/pages/TaskTemplates';
import Atividades from './src/pages/Atividades';
import CrmLigacoes from './src/pages/CrmLigacoes';
import CrmPessoas from './src/pages/CrmPessoas';
import CrmEmpresas from './src/pages/CrmEmpresas';
import CrmMetas from './src/pages/CrmMetas';
import CrmMetricas from './src/pages/CrmMetricas';
import Automacoes from './src/pages/Automacoes';
import MarketingDashboard from './src/pages/MarketingDashboard';
import MarketingAcoes from './src/pages/MarketingAcoes';
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
    return localStorage.getItem('activePage') || 'gestor';
  });
  const [theme, setTheme] = useState<'light' | 'dark' | 'darker'>(() => {
    const saved = localStorage.getItem('theme');
    return (saved as 'light' | 'dark' | 'darker') || 'dark';
  });

  useEffect(() => {
    localStorage.setItem('activePage', activePage);
  }, [activePage]);

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
    const isAdmin = userData?.role === 'superadmin' || userData?.role === 'gerente-operacional';
    const isAllowed = isAdmin || userData?.allowedPages?.includes(activePage);
    
    if (activePage === 'admin' && userData?.role === 'superadmin') {
      return <AdminPanel />;
    }
    // Block any other user from accessing admin directly
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
    
    if (!isAllowed) {
      return (
        <div className="flex items-center justify-center h-full text-slate-500">
          <div className="text-center">
            <p className="text-xl font-bold mb-2">Acesso Restrito</p>
            <p className="text-sm">Você não tem permissão para visualizar esta página.</p>
          </div>
        </div>
      );
    }

    // Find the page in the menu to get its template
    let pageTemplate = activePage;
    let foundTemplate = false;
    
    if (Array.isArray(menu)) {
      for (const section of menu) {
        if (foundTemplate) break;

        // Check pages directly under section
        if (Array.isArray(section.pages)) {
          const page = section.pages.find((p: any) => p.id === activePage);
          if (page && page.template) {
            pageTemplate = page.template;
            foundTemplate = true;
            break;
          }
        }

        // Check pages under section's direct subSubSessions
        if (Array.isArray(section.subSubSessions)) {
          for (const subSubSession of section.subSubSessions) {
            if (Array.isArray(subSubSession.pages)) {
              const page = subSubSession.pages.find((p: any) => p.id === activePage);
              if (page && page.template) {
                pageTemplate = page.template;
                foundTemplate = true;
                break;
              }
            }
          }
        }

        if (Array.isArray(section.subSessions)) {
          for (const subSession of section.subSessions) {
            if (foundTemplate) break;
            
            // Check pages directly under subSession
            if (Array.isArray(subSession.pages)) {
              const page = subSession.pages.find((p: any) => p.id === activePage);
              if (page && page.template) {
                pageTemplate = page.template;
                foundTemplate = true;
                break;
              }
            }
            
            // Check pages under subSubSessions
            if (Array.isArray(subSession.subSubSessions)) {
              for (const subSubSession of subSession.subSubSessions) {
                if (Array.isArray(subSubSession.pages)) {
                  const page = subSubSession.pages.find((p: any) => p.id === activePage);
                  if (page && page.template) {
                    pageTemplate = page.template;
                    foundTemplate = true;
                    break;
                  }
                }
              }
            }
          }
        }
      }
    }

    console.log("AppContent renderPage - activePage:", activePage, "pageTemplate:", pageTemplate);

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
        return <TodoPage key={activePage} activePage={activePage} />;
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
        return <SettingsPage onPageChange={setActivePage} isSuperAdmin={userData?.role === 'superadmin'} />;
      case 'financeiro-dashboard':
        return <FinanceiroDashboard />;
      case 'kpis-squad':
        return <div className="p-8 text-center text-slate-500">Página de KPIs do Squad em construção.</div>;
      case 'parceiros-squad':
        return <div className="p-8 text-center text-slate-500">Página de Parceiros do Squad em construção.</div>;
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
      case 'ligacoes-dashboard':
        return <CrmLigacoes />;
      case 'automacoes':
        return <Automacoes />;
      case 'marketing-dashboard':
        return <MarketingDashboard />;
      case 'marketing-acoes':
        return <MarketingAcoes key={activePage} activePage={activePage} />;
      default:
        return <GestorCalculator />;
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

  if (!user) {
    return <Login />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-light-bg dark:bg-dark-bg transition-colors duration-300">
      <Sidebar 
        activePage={activePage} 
        onPageChange={setActivePage} 
        user={user}
        userData={userData}
        theme={theme}
        toggleTheme={toggleTheme}
      />
      <main className="flex-1 overflow-y-auto scrollbar-hide rounded-tl-[2.5rem] bg-light-bg dark:bg-dark-bg transition-colors duration-300">
        {renderPage()}
      </main>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <MenuProvider>
        <AppContent />
      </MenuProvider>
    </AuthProvider>
  );
};

export default App;
