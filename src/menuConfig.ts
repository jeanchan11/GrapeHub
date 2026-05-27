import { 
  Briefcase, ListTodo, Users, Target, Calculator, TrendingUp, Shield, FileText, LayoutDashboard, CreditCard
} from 'lucide-react';

export interface Page {
  id: string;
  label: string;
  icon: any;
}

export interface SubSubSession {
  id: string;
  label: string;
  icon: any;
  pages: Page[];
}

export interface SubSession {
  id: string;
  label: string;
  icon: any;
  subSubSessions?: SubSubSession[];
  pages?: Page[];
}

export interface MenuSection {
  id: string;
  title: string;
  subSessions: SubSession[];
}

export const menuConfig: MenuSection[] = [
  {
    id: 'operacional',
    title: 'Operacional',
    subSessions: [
      {
        id: 'squad-able',
        label: 'Squad Able',
        icon: Users,
        subSubSessions: [
          {
            id: 'resumo-squad',
            label: 'Resumo do squad',
            icon: LayoutDashboard,
            pages: [
              { id: 'kpis-squad', label: 'Kpi\'s Squad', icon: TrendingUp },
              { id: 'parceiros-squad', label: 'Parceiros squad', icon: Users },
            ]
          },
          {
            id: 'gestor-trafego',
            label: 'Gestor de Tráfego',
            icon: Target,
            pages: [
              { id: 'projects', label: 'Projetos & Parceiros', icon: Briefcase },
              { id: 'todo', label: 'Tarefas', icon: Briefcase },
            ]
          },
          {
            id: 'gestor-jose',
            label: 'Gestor Jose',
            icon: Target,
            pages: [
              { id: 'gestor-calculator', label: 'Calculadora Gestor', icon: Calculator },
              { id: 'gestor-dashboard', label: 'Dashboard Gestor', icon: LayoutDashboard },
              { id: 'financeiro-dashboard', label: 'Financeiro', icon: Calculator },
            ]
          },
          {
            id: 'gestor-trafego-2',
            label: 'Gestor de Tráfego 2',
            icon: Target,
            pages: [
              { id: 'projects-2', label: 'Projetos & Parceiros 2', icon: Briefcase },
              { id: 'todo-2', label: 'Tarefas 2', icon: Briefcase },
            ]
          }
        ]
      }
    ]
  },
  {
    id: 'administracao',
    title: 'Administração',
    subSessions: [
      {
        id: 'painel-admin',
        label: 'Painel Admin',
        icon: Shield,
        subSubSessions: [
          {
            id: 'admin-geral',
            label: 'Geral',
            icon: FileText,
            pages: [
              { id: 'admin', label: 'Painel Admin', icon: Shield },
              { id: 'active-clients', label: 'Clientes Ativos', icon: Users },
              { id: 'crm-financeiro', label: 'CRM Financeiro', icon: CreditCard },
            ]
          },
          {
            id: 'configuracoes',
            label: 'Configurações',
            icon: Target,
            pages: [
              { id: 'task-templates', label: 'Modelos de Tarefa', icon: ListTodo }
            ]
          }
        ]
      }
    ]
  }
];
