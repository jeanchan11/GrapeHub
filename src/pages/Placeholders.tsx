import React from 'react';
import { Bell, Settings, Shield, User, Palette, Globe, Lock, HelpCircle, Mail, MessageSquare, Zap, AlertCircle } from 'lucide-react';

const PageHeader = ({ title, icon: Icon, description }: { title: string, icon: any, description: string }) => (
  <div className="mb-10">
    <h1 className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1">
      {title.split(' ').length > 1 ? (
        <>
          {title.split(' ').slice(0, -1).join(' ')} <span className="text-violet-500">{title.split(' ').slice(-1)}</span>
        </>
      ) : (
        <span className="text-violet-500">{title}</span>
      )}
    </h1>
    <p className="text-slate-500 text-sm">{description}</p>
  </div>
);

export const NotificationsPage = () => {
  const notifications = [
    { id: 1, title: 'Novo Lead Qualificado', message: 'Um novo lead de alta prioridade foi atribuído a você.', time: '2 min atrás', type: 'success', icon: Zap },
    { id: 2, title: 'Relatório Pendente', message: 'O relatório semanal do projeto "Alpha" está atrasado.', time: '1 hora atrás', type: 'warning', icon: AlertCircle },
    { id: 3, title: 'Reunião Agendada', message: 'Nova reunião com "Parceiro X" amanhã às 14:00.', time: '3 horas atrás', type: 'info', icon: Bell },
    { id: 4, title: 'Meta Atingida', message: 'Parabéns! Você atingiu 100% da meta de vendas do mês.', time: '5 horas atrás', type: 'success', icon: Zap },
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader 
        title="Notificações" 
        icon={Bell} 
        description="Fique por dentro das últimas atualizações e alertas do sistema." 
      />
      
      <div className="space-y-4">
        {notifications.map((n) => (
          <div key={n.id} className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 flex items-start gap-4 hover:border-violet-500/30 transition-all shadow-sm">
            <div className={`p-3 rounded-xl ${
              n.type === 'success' ? 'bg-emerald-500/20 text-emerald-500' :
              n.type === 'warning' ? 'bg-amber-500/20 text-amber-500' :
              'bg-blue-500/20 text-blue-500'
            }`}>
              <n.icon size={20} />
            </div>
            <div className="flex-1">
              <div className="flex items-center justify-between mb-1">
                <h3 className="font-bold text-light-text dark:text-white">{n.title}</h3>
                <span className="text-[10px] text-slate-500 font-medium">{n.time}</span>
              </div>
              <p className="text-sm text-slate-500 dark:text-slate-400">{n.message}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export const SettingsPage = ({ onPageChange, isSuperAdmin }: { onPageChange?: (page: string) => void, isSuperAdmin?: boolean }) => {
  const staticSections = [
    {
      title: 'Perfil',
      icon: User,
      items: [
        { label: 'Informações Pessoais', description: 'Nome, e-mail e foto de perfil' },
        { label: 'Segurança', description: 'Senha e autenticação em duas etapas' },
      ]
    },
    {
      title: 'Preferências',
      icon: Palette,
      items: [
        { label: 'Aparência', description: 'Tema e personalização visual' },
        { label: 'Idioma', description: 'Português (Brasil)' },
      ]
    },
  ];

  const sistemaItems: { label: string; description: string; icon?: any; action?: () => void }[] = [
    { label: 'Integrações', description: 'Conectar com Neon DB e outras ferramentas' },
    { label: 'Logs de Atividade', description: 'Histórico de ações no sistema' },
    ...(isSuperAdmin ? [{
      label: 'Painel Admin',
      description: 'Gerenciar usuários, permissões e configurações do sistema',
      icon: Shield,
      action: () => onPageChange?.('admin')
    }] : [])
  ];

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <PageHeader 
        title="Configurações" 
        icon={Settings} 
        description="Gerencie sua conta, preferências e integrações do sistema." 
      />
      
      <div className="space-y-8">
        {staticSections.map((section) => (
          <div key={section.title} className="space-y-4">
            <div className="flex items-center gap-2 px-2">
              <section.icon size={18} className="text-violet-500" />
              <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">{section.title}</h2>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {section.items.map((item) => (
                <button key={item.label} className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 text-left hover:border-violet-500/30 transition-all shadow-sm group">
                  <h3 className="font-bold text-light-text dark:text-white group-hover:text-violet-500 transition-colors">{item.label}</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.description}</p>
                </button>
              ))}
            </div>
          </div>
        ))}

        {/* Sistema */}
        <div className="space-y-4">
          <div className="flex items-center gap-2 px-2">
            <Settings size={18} className="text-violet-500" />
            <h2 className="text-sm font-bold text-slate-500 uppercase tracking-widest">Sistema</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {sistemaItems.map((item) => (
              <button 
                key={item.label} 
                onClick={item.action}
                className="bg-light-card dark:bg-dark-card p-6 rounded-2xl border border-slate-200 dark:border-white/5 text-left hover:border-violet-500/30 transition-all shadow-sm group"
              >
                <div className="flex items-center gap-2 mb-1">
                  {item.icon && <item.icon size={16} className="text-violet-500" />}
                  <h3 className="font-bold text-light-text dark:text-white group-hover:text-violet-500 transition-colors">{item.label}</h3>
                </div>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{item.description}</p>
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export const SDRCalculator = () => (
  <div className="min-h-screen text-light-text dark:text-white flex items-center justify-center p-6 transition-colors duration-300">
    <div className="bg-light-card dark:bg-dark-card p-12 rounded-3xl border border-slate-200 dark:border-white/5 text-center max-w-lg shadow-2xl transition-colors duration-300">
      <h1 className="text-4xl font-bold mb-4">Calculadora SDR</h1>
      <p className="text-slate-500 dark:text-slate-400">Esta página está em desenvolvimento.</p>
    </div>
  </div>
);

export const GerenteOperacionalCalculator = () => (
  <div className="min-h-screen text-light-text dark:text-white flex items-center justify-center p-6 transition-colors duration-300">
    <div className="bg-light-card dark:bg-dark-card p-12 rounded-3xl border border-slate-200 dark:border-white/5 text-center max-w-lg shadow-2xl transition-colors duration-300">
      <h1 className="text-4xl font-bold mb-4">Calculadora Gerente Operacional</h1>
      <p className="text-slate-500 dark:text-slate-400">Esta página está em desenvolvimento.</p>
    </div>
  </div>
);

export const SquadAblePage = () => (
  <div className="min-h-screen text-light-text dark:text-white flex items-center justify-center p-6 transition-colors duration-300">
    <div className="bg-light-card dark:bg-dark-card p-12 rounded-3xl border border-slate-200 dark:border-white/5 text-center max-w-lg shadow-2xl transition-colors duration-300">
      <h1 className="text-4xl font-bold mb-4">Squad Able</h1>
      <p className="text-slate-500 dark:text-slate-400">Esta página está em desenvolvimento.</p>
    </div>
  </div>
);
