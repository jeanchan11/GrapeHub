import React, { useState } from 'react';
import { Bell, Settings, Shield, User, Palette, Globe, Lock, HelpCircle, Mail, MessageSquare, Zap, AlertCircle, FolderTree, ArrowRight, CheckSquare, ChevronLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useSoftphone } from '../hooks/useSoftphone';

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
  const { user } = useAuth();
  const softphone = useSoftphone();
  const [activeSection, setActiveSection] = useState<'main' | 'integrations' | 'categories' | 'automacoes'>('main');

  // Telefonia form state
  const [settingsForm, setSettingsForm] = useState({ api4com_token: '', api4com_domain: '', sip_extension: '', sip_password: '', sip_server: '' });
  const [savingSettings, setSavingSettings] = useState(false);
  const [settingsSaved, setSettingsSaved] = useState(false);
  const [testResult, setTestResult] = useState<{success: boolean, message: string} | null>(null);
  const [testingConnection, setTestingConnection] = useState(false);
  const [webhookRegistering, setWebhookRegistering] = useState(false);
  const [webhookResult, setWebhookResult] = useState<{success?: boolean; webhookUrl?: string; error?: string} | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [autoTab, setAutoTab] = useState<'automacoes' | 'logs'>('automacoes');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // Fetch Api4Com settings when integrations view opens
  React.useEffect(() => {
    if (activeSection === 'integrations' && user?.email && !loaded) {
      fetch(`/api/api4com/settings?user_id=${encodeURIComponent(user.email)}`)
        .then(r => r.json())
        .then(data => {
          if (data.configured || data.api4com_token) {
            setSettingsForm({
              api4com_token: data.api4com_token || '',
              api4com_domain: data.api4com_domain || '',
              sip_extension: data.sip_extension || '',
              sip_password: data.sip_password || '',
              sip_server: data.sip_server || ''
            });
          }
          setLoaded(true);
        })
        .catch(() => setLoaded(true));
    }
  }, [activeSection, user?.email, loaded]);

  // Fetch automation logs when logs tab is selected
  React.useEffect(() => {
    if (activeSection === 'automacoes' && autoTab === 'logs') {
      setLogsLoading(true);
      fetch('/api/automations/logs?limit=200')
        .then(r => r.json())
        .then(data => setLogs(Array.isArray(data) ? data : []))
        .catch(() => setLogs([]))
        .finally(() => setLogsLoading(false));
    }
  }, [activeSection, autoTab]);

  // Register SIP when form changes
  const prevSipKeyRef = React.useRef('');
  React.useEffect(() => {
    if (activeSection !== 'integrations') return;
    const { sip_extension, sip_password, sip_server, api4com_domain } = settingsForm;
    const key = `${sip_extension}|${sip_password}|${api4com_domain}`;
    if (sip_extension && sip_password && api4com_domain) {
      if (prevSipKeyRef.current !== key) {
        prevSipKeyRef.current = key;
        if (softphone.sipStatus === 'registered') return;
        let sipServer = sip_server
          ? (sip_server.startsWith('wss://') || sip_server.startsWith('ws://') ? sip_server : `wss://${sip_server}`)
          : `wss://${api4com_domain}:6443`;
        if (!sipServer.includes(':6443') && !sipServer.includes(':8089') && !sipServer.includes('/ws')) {
          sipServer = sipServer.replace(/\/$/, '') + ':6443';
        }
        softphone.register({ extension: sip_extension, password: sip_password, domain: api4com_domain, sipServer });
      }
    }
  }, [activeSection, settingsForm.sip_extension, settingsForm.sip_password, settingsForm.sip_server, settingsForm.api4com_domain, softphone.sipStatus]);

  const handleSaveApi4ComSettings = async () => {
    if (!user?.email) return;
    setSavingSettings(true);
    try {
      const res = await fetch('/api/api4com/settings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.email, ...settingsForm })
      });
      if (res.ok) {
        setSettingsSaved(true);
        if (settingsForm.sip_extension && settingsForm.sip_password && settingsForm.api4com_domain) {
          let sipServer = settingsForm.sip_server
            ? (settingsForm.sip_server.startsWith('wss://') || settingsForm.sip_server.startsWith('ws://') ? settingsForm.sip_server : `wss://${settingsForm.sip_server}`)
            : `wss://${settingsForm.api4com_domain}:6443`;
          if (!sipServer.includes(':6443') && !sipServer.includes(':8089') && !sipServer.includes('/ws')) {
            sipServer = sipServer.replace(/\/$/, '') + ':6443';
          }
          softphone.register({
            extension: settingsForm.sip_extension,
            password: settingsForm.sip_password,
            domain: settingsForm.api4com_domain,
            sipServer
          });
        }
        setTimeout(() => setSettingsSaved(false), 3000);
      }
    } catch {
      alert('Erro ao salvar configurações.');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleTestApi4ComConnection = async () => {
    if (!user?.email) return;
    setTestingConnection(true);
    setTestResult(null);
    try {
      const res = await fetch(`/api/api4com/test-connection?user_id=${encodeURIComponent(user.email)}`);
      const data = await res.json();
      setTestResult(data);
    } catch {
      setTestResult({ success: false, message: 'Erro de rede' });
    } finally {
      setTestingConnection(false);
    }
  };

  const handleRegisterWebhook = async () => {
    if (!user?.email) return;
    setWebhookRegistering(true);
    setWebhookResult(null);
    try {
      const res = await fetch('/api/api4com/register-webhook', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ user_id: user.email })
      });
      const data = await res.json();
      if (data.success) {
        setWebhookResult({ success: true, webhookUrl: data.webhookUrl });
      } else {
        const detail = data.detail ? ` (${JSON.stringify(data.detail).slice(0, 120)})` : '';
        setWebhookResult({ error: (data.error || 'Falha ao registrar') + detail });
      }
    } catch (e) {
      setWebhookResult({ error: `Erro de conexão: ${String(e)}` });
    } finally {
      setWebhookRegistering(false);
    }
  };

  const inputClass = "w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-900 bg-gray-50 border border-gray-200 focus:border-violet-600 focus:ring-2 focus:ring-violet-600/20 dark:text-white dark:bg-[#0d0b14] dark:border-[#2d2b3d] dark:focus:border-violet-500 dark:focus:ring-violet-500/20";

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
    { label: 'Integrações', description: 'Telefonia Api4Com e outras ferramentas', action: () => setActiveSection('integrations') },
    { label: 'Categorias Financeiras', description: 'Plano de contas hierárquico da empresa', icon: FolderTree, action: () => setActiveSection('categories') },
    { label: 'Automações', description: 'Automações ativas que criam tarefas no CRM', icon: Zap, action: () => setActiveSection('automacoes') },
    { label: 'Logs de Atividade', description: 'Histórico de ações no sistema' },
    ...(isSuperAdmin ? [{
      label: 'Painel Admin',
      description: 'Gerenciar usuários, permissões e configurações do sistema',
      icon: Shield,
      action: () => onPageChange?.('admin')
    }] : [])
  ];

  // ═══════════════════════════════════════════════════════
  // AUTOMAÇÕES SUB-VIEW
  // ═══════════════════════════════════════════════════════
  if (activeSection === 'automacoes') {
    const ACTIVE_AUTOMATIONS = [
      {
        id: 'ganho-onboarding',
        trigger: 'Negócio ganho',
        triggerColor: '#10b981',
        triggerBg: 'rgba(16,185,129,0.1)',
        name: 'Lead ganho → Onboarding Operacional',
        description: 'Quando um negócio é marcado como ganho em qualquer pipeline do CRM, cria automaticamente uma tarefa no Onboarding Operacional no status "Reunião - Briefing" com todas as subtarefas do modelo padrão.',
        actions: [
          { icon: CheckSquare, label: 'Criar tarefa no Onboarding Operacional', detail: 'Status: 🗓️ Reunião - Briefing' },
          { icon: CheckSquare, label: 'Copiar subtarefas do modelo padrão', detail: 'Baseado no Template de Onboarding' },
        ],
        status: 'Ativa',
        runs: '∞',
        trigger_event: 'lead_won',
      },
      {
        id: 'ganho-cliente-ativo',
        trigger: 'Negócio ganho',
        triggerColor: '#10b981',
        triggerBg: 'rgba(16,185,129,0.1)',
        name: 'Lead ganho → Cliente Ativo',
        description: 'Quando um negócio é marcado como ganho no CRM Comercial, cria automaticamente um cliente na lista de Clientes Ativos com status "Ativo", telefone, e-mail e localização do lead.',
        actions: [
          { icon: UserPlus, label: 'Criar cliente em Clientes Ativos', detail: 'Status: Ativo • Data início: hoje' },
        ],
        status: 'Ativa',
        runs: '∞',
        trigger_event: 'lead_won',
      },
      {
        id: 'novo-lead-pessoa',
        trigger: 'Lead criado',
        triggerColor: '#3b82f6',
        triggerBg: 'rgba(59,130,246,0.1)',
        name: 'Lead criado → Sincronizar Contato (Pessoas)',
        description: 'Sempre que um novo lead entra no CRM Comercial (via Webhook Inbound ou adição manual), cadastra ou atualiza automaticamente o contato do cliente na página de Pessoas, centralizando a agenda.',
        actions: [
          { icon: UserPlus, label: 'Sincronizar contato em Pessoas', detail: 'Sincroniza: Nome, Email, Telefone' },
        ],
        status: 'Ativa',
        runs: '∞',
        trigger_event: 'lead_created',
      },
      {
        id: 'webhook-inbound-lead',
        trigger: 'Webhook Recebido',
        triggerColor: '#8b5cf6',
        triggerBg: 'rgba(139,92,246,0.1)',
        name: 'Webhook Inbound → Criar Lead',
        description: 'Recebe os dados enviados via Webhook (formulários, landing pages, Meta Ads, etc) e cria automaticamente um novo lead no funil de Vendas do Comercial. Extrai de forma inteligente a origem (utm_platform ou utm_source).',
        actions: [
          { icon: Zap, label: 'Receber e Processar Webhook', detail: 'Identifica campos: Nome, Email, Telefone, e Origem' },
          { icon: CheckSquare, label: 'Criar lead no CRM Comercial', detail: 'Aloca na etapa: "Novos Leads"' },
        ],
        status: 'Ativa',
        runs: '∞',
        trigger_event: 'webhook_received',
      },
    ];

    return (
      <div className="p-8 max-w-5xl mx-auto">
        <div className="mb-6">
          <button onClick={() => setActiveSection('main')} className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-400 transition-colors mb-4 group">
            <ChevronLeft size={16} className="transition-transform group-hover:-translate-x-0.5" />
            Voltar para Configurações
          </button>
          <h1 className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1">
            Auto<span className="text-violet-500">mações</span>
          </h1>
          <p className="text-slate-500 text-sm">Automações ativas que criam tarefas no CRM e Onboarding.</p>
        </div>

        {/* Tabs */}
        <div className="flex gap-6 border-b border-gray-200 dark:border-white/10 mb-6">
          <button
            onClick={() => setAutoTab('automacoes')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${autoTab === 'automacoes' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            ⚡ Automações
          </button>
          <button
            onClick={() => setAutoTab('logs')}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors ${autoTab === 'logs' ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white'}`}
          >
            📋 Logs de Execução
          </button>
        </div>

        {autoTab === 'automacoes' && (
          <div className="space-y-4">
            {ACTIVE_AUTOMATIONS.map(auto => (
              <div key={auto.id} className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
                {/* Header */}
                <div className="flex items-center gap-4 px-6 py-4 border-b border-slate-100 dark:border-white/5">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0" style={{ background: auto.triggerBg }}>
                    <Zap size={18} style={{ color: auto.triggerColor }} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-bold text-light-text dark:text-white text-sm">{auto.name}</h3>
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 dark:bg-emerald-500/15 text-emerald-700 dark:text-emerald-400">
                        {auto.status}
                      </span>
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5 leading-relaxed">{auto.description}</p>
                  </div>
                </div>

                {/* Flow */}
                <div className="px-6 py-5">
                  {/* Trigger */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-6 h-6 rounded-full flex items-center justify-center shrink-0" style={{ background: auto.triggerBg }}>
                      <Zap size={11} style={{ color: auto.triggerColor }} />
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: auto.triggerColor }}>GATILHO</span>
                      <span className="text-xs font-semibold text-light-text dark:text-white">{auto.trigger}</span>
                    </div>
                  </div>

                  {/* Connector */}
                  <div className="flex items-center gap-3 mb-3">
                    <div className="flex flex-col items-center ml-[11px]">
                      <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                      <div className="w-1.5 h-1.5 rounded-full bg-slate-300 dark:bg-white/20" />
                      <div className="w-px h-4 bg-slate-200 dark:bg-white/10" />
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="space-y-2">
                    {auto.actions.map((action, i) => (
                      <div key={i} className="flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-violet-100 dark:bg-violet-500/15 flex items-center justify-center shrink-0 mt-0.5">
                          <action.icon size={11} className="text-violet-600 dark:text-violet-400" />
                        </div>
                        <div>
                          <p className="text-xs font-semibold text-light-text dark:text-white">{action.label}</p>
                          <p className="text-[11px] text-slate-500 dark:text-slate-500">{action.detail}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}

            {/* Empty state hint */}
            <p className="text-xs text-slate-400 dark:text-slate-600 text-center pt-2">
              Para criar ou editar automações, acesse <strong className="text-violet-500">CRM → Automações</strong>.
            </p>
          </div>
        )}

        {autoTab === 'logs' && (
          <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
            {logsLoading ? (
              <div className="flex items-center justify-center py-16">
                <div className="w-8 h-8 border-2 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
              </div>
            ) : logs.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-sm text-slate-500 dark:text-slate-400">Nenhum log de execução encontrado.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-gray-50 dark:bg-dark-bg/50 border-b border-gray-100 dark:border-white/5">
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Data / Hora</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Automação</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Lead</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Evento</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Ação</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Status</th>
                      <th className="px-4 py-3 text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest whitespace-nowrap">Mensagem</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100 dark:divide-white/5">
                    {logs.map((log: any) => {
                      const dt = log.executed_at ? new Date(log.executed_at).toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—';
                      const eventLabels: Record<string, string> = { lead_won: 'Negócio ganho', lead_created: 'Lead criado', lead_lost: 'Lead perdido', stage_changed: 'Mudou de etapa', lead_updated: 'Lead atualizado' };
                      const actionLabels: Record<string, string> = { create_task: 'Criar atividade', create_client: 'Criar cliente', create_lead: 'Criar negócio', create_note: 'Criar nota', add_tag: 'Adicionar tag', mark_won: 'Marcar ganho', mark_lost: 'Marcar perdido', move_stage: 'Mover etapa', clear_open_tasks: 'Limpar tarefas', start_sequence: 'Iniciar sequência', send_webhook: 'Enviar webhook' };
                      return (
                        <tr key={log.id} className="hover:bg-gray-50 dark:hover:bg-white/5 transition-colors">
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs text-gray-600 dark:text-slate-400">{dt}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs font-bold text-gray-900 dark:text-white">{log.automation_name || '—'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-xs text-gray-700 dark:text-slate-300">{log.lead_nome || log.lead_id || '—'}</span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                              {eventLabels[log.event] || log.event || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            <span className="text-[10px] font-bold text-violet-600 dark:text-violet-400 bg-violet-50 dark:bg-violet-500/10 px-2 py-0.5 rounded-full">
                              {actionLabels[log.action_type] || log.action_type || '—'}
                            </span>
                          </td>
                          <td className="px-4 py-3 whitespace-nowrap">
                            {log.status === 'success' ? (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                ✓ Sucesso
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-500/10 px-2 py-0.5 rounded-full">
                                ✗ Erro
                              </span>
                            )}
                          </td>
                          <td className="px-4 py-3">
                            <span className="text-[11px] text-gray-500 dark:text-slate-500 line-clamp-1 max-w-[300px] block" title={log.message}>
                              {log.message || '—'}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    );
  }

  // ═══════════════════════════════════════════════════════
  // CATEGORIES SUB-VIEW
  // ═══════════════════════════════════════════════════════
  if (activeSection === 'categories') {
    const FinCategories = React.lazy(() => import('./FinCategories'));
    return (
      <React.Suspense fallback={
        <div className="flex items-center justify-center py-20">
          <div className="w-8 h-8 border-3 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" />
        </div>
      }>
        <FinCategories onBack={() => setActiveSection('main')} />
      </React.Suspense>
    );
  }

  // ═══════════════════════════════════════════════════════
  // INTEGRATIONS SUB-VIEW
  // ═══════════════════════════════════════════════
  if (activeSection === 'integrations') {
    return (
      <div className="p-8 max-w-4xl mx-auto">
        {/* Back + Header */}
        <div className="mb-8">
          <button onClick={() => setActiveSection('main')} className="flex items-center gap-1.5 text-sm text-violet-500 hover:text-violet-400 transition-colors mb-4 group">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="transition-transform group-hover:-translate-x-0.5"><path d="m15 18-6-6 6-6"/></svg>
            Voltar para Configurações
          </button>
          <h1 className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1">
            <span className="text-violet-500">Integrações</span>
          </h1>
          <p className="text-slate-500 text-sm">Configure telefonia, APIs e conexões externas.</p>
        </div>

        {/* Api4Com / Telefonia */}
        <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/5 shadow-sm overflow-hidden">
          {/* Card header */}
          <div className="p-6 border-b border-slate-200 dark:border-white/5 flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 bg-violet-100 dark:bg-violet-500/10">
              <span className="text-2xl">📞</span>
            </div>
            <div className="flex-1">
              <h2 className="font-bold text-light-text dark:text-white text-lg">Api4Com — Telefonia SIP</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">Conecte seu ramal para ligar diretamente pelo CRM</p>
            </div>
            {/* SIP Status Badge */}
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-semibold" style={{
              background: softphone.sipStatus === 'registered' ? 'rgba(34,197,94,0.1)' :
                          softphone.sipStatus === 'connecting' ? 'rgba(245,158,11,0.1)' :
                          softphone.sipStatus === 'error' ? 'rgba(239,68,68,0.1)' : 'rgba(100,100,100,0.1)',
              color: softphone.sipStatus === 'registered' ? '#22c55e' :
                     softphone.sipStatus === 'connecting' ? '#f59e0b' :
                     softphone.sipStatus === 'error' ? '#ef4444' : '#6b7280'
            }}>
              <span className="w-2 h-2 rounded-full" style={{
                background: softphone.sipStatus === 'registered' ? '#22c55e' :
                            softphone.sipStatus === 'connecting' ? '#f59e0b' :
                            softphone.sipStatus === 'error' ? '#ef4444' : '#6b7280',
                boxShadow: softphone.sipStatus === 'registered' ? '0 0 6px #22c55e' :
                           softphone.sipStatus === 'connecting' ? '0 0 6px #f59e0b' : 'none'
              }} />
              {softphone.sipStatus === 'registered' ? 'Ramal ativo' :
               softphone.sipStatus === 'connecting' ? 'Conectando...' :
               softphone.sipStatus === 'error' ? 'Falha' : 'Desconectado'}
            </div>
          </div>

          {/* SIP Status Banner */}
          <div className="mx-6 mt-6 rounded-xl p-4" style={{
            background: softphone.sipStatus === 'registered' ? 'rgba(34,197,94,0.08)' :
                        softphone.sipStatus === 'connecting' ? 'rgba(245,158,11,0.08)' :
                        softphone.sipStatus === 'error' ? 'rgba(239,68,68,0.08)' : 'rgba(255,255,255,0.04)',
            border: `1px solid ${
              softphone.sipStatus === 'registered' ? 'rgba(34,197,94,0.25)' :
              softphone.sipStatus === 'connecting' ? 'rgba(245,158,11,0.25)' :
              softphone.sipStatus === 'error' ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.08)'
            }`
          }}>
            <div className="flex items-center gap-3">
              <span className="w-3 h-3 rounded-full flex-shrink-0" style={{
                background: softphone.sipStatus === 'registered' ? '#22c55e' :
                            softphone.sipStatus === 'connecting' ? '#f59e0b' :
                            softphone.sipStatus === 'error' ? '#ef4444' : '#374151',
                boxShadow: softphone.sipStatus === 'registered' ? '0 0 8px #22c55e' :
                           softphone.sipStatus === 'connecting' ? '0 0 8px #f59e0b' : 'none'
              }} />
              <div>
                <p className="text-sm font-bold" style={{
                  color: softphone.sipStatus === 'registered' ? '#22c55e' :
                         softphone.sipStatus === 'connecting' ? '#f59e0b' :
                         softphone.sipStatus === 'error' ? '#ef4444' : '#9ca3af'
                }}>
                  {softphone.sipStatus === 'registered' ? '✓ Softphone conectado — pronto para ligar' :
                   softphone.sipStatus === 'connecting' ? '⏳ Conectando ao servidor SIP...' :
                   softphone.sipStatus === 'error' ? '✗ Falha na conexão SIP' : '● Softphone desconectado'}
                </p>
                {softphone.sipStatus === 'error' && softphone.registrationError && (
                  <p className="text-xs mt-1" style={{ color: '#f87171' }}>{softphone.registrationError}</p>
                )}
                {softphone.sipStatus === 'idle' && (
                  <p className="text-xs mt-1" style={{ color: '#6b7280' }}>Salve as configurações abaixo para conectar</p>
                )}
                {softphone.sipStatus === 'registered' && (
                  <p className="text-xs mt-1" style={{ color: '#4ade80' }}>Ramal {settingsForm.sip_extension || softphone.extension} · Clique em 📞 em qualquer lead no CRM para ligar</p>
                )}
              </div>
            </div>
          </div>

          {/* Form */}
          <div className="p-6 space-y-6">
            {/* Credentials */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500 dark:text-[#6b7280]">Credenciais da Conta</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1.5 text-gray-500 dark:text-[#9ca3af]">Token de Acesso (permanente)</label>
                  <input type="password" autoComplete="off" value={settingsForm.api4com_token} onChange={e => setSettingsForm(f => ({ ...f, api4com_token: e.target.value }))} placeholder="YggyHfrLEHAWmKiUFb..."
                    className={inputClass}
                  />
                  <p className="text-xs mt-1 text-gray-500 dark:text-[#6b7280]">Token com ttl: -1 gerado na Api4Com. Nunca expira.</p>
                </div>
                <div>
                  <label className="block text-xs mb-1.5 text-gray-500 dark:text-[#9ca3af]">Domínio da empresa</label>
                  <input type="text" value={settingsForm.api4com_domain} onChange={e => setSettingsForm(f => ({ ...f, api4com_domain: e.target.value }))}
                    onBlur={e => {
                      const domain = e.target.value.trim();
                      if (domain && !settingsForm.sip_server) {
                        setSettingsForm(f => ({ ...f, sip_server: `wss://${domain}:6443` }));
                      }
                    }}
                    placeholder="seudominio.api4com.com" className={inputClass}
                  />
                  <p className="text-xs mt-1 text-gray-500 dark:text-[#6b7280]">Domínio criado no cadastro da Api4Com</p>
                </div>
              </div>
            </div>

            {/* SIP extension */}
            <div>
              <h3 className="text-xs font-bold uppercase tracking-widest mb-4 text-gray-500 dark:text-[#6b7280]">Ramal SIP do Usuário</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs mb-1.5 text-gray-500 dark:text-[#9ca3af]">Número do Ramal</label>
                  <input type="text" value={settingsForm.sip_extension} onChange={e => setSettingsForm(f => ({ ...f, sip_extension: e.target.value }))} placeholder="1000"
                    className={inputClass}
                  />
                </div>
                <div>
                  <label className="block text-xs mb-1.5 text-gray-500 dark:text-[#9ca3af]">Senha do Ramal</label>
                  <input type="password" autoComplete="new-password" value={settingsForm.sip_password} onChange={e => setSettingsForm(f => ({ ...f, sip_password: e.target.value }))} placeholder="••••••••"
                    className={inputClass}
                  />
                </div>
                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs text-gray-500 dark:text-[#9ca3af]">Servidor WSS</label>
                    {settingsForm.api4com_domain && (
                      <button onClick={() => setSettingsForm(f => ({ ...f, sip_server: `wss://${settingsForm.api4com_domain}:6443` }))}
                        className="text-xs px-2 py-0.5 rounded-md transition-all text-emerald-600 bg-emerald-100/50 border border-emerald-400 dark:bg-emerald-500/10 dark:border-emerald-500/30 dark:text-emerald-400"
                      >
                        ✓ Usar padrão Api4Com (:6443)
                      </button>
                    )}
                  </div>
                  <input type="text" value={settingsForm.sip_server} onChange={e => setSettingsForm(f => ({ ...f, sip_server: e.target.value }))}
                    placeholder={settingsForm.api4com_domain ? `wss://${settingsForm.api4com_domain}:6443` : 'wss://seudominio.api4com.com:6443'}
                    className={inputClass}
                  />
                  <p className="text-xs mt-1 text-gray-500 dark:text-[#6b7280]">
                    Api4Com usa porta <strong className="text-violet-600 dark:text-violet-400 font-mono">:6443</strong> — deixe em branco para usar automaticamente
                  </p>
                </div>
              </div>
            </div>

            {/* Test result */}
            {testResult && (
              <div className="flex items-center gap-2 text-sm px-3 py-2 rounded-lg" style={{ background: testResult.success ? 'rgba(34,197,94,0.08)' : 'rgba(239,68,68,0.08)', border: `1px solid ${testResult.success ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`, color: testResult.success ? '#22c55e' : '#ef4444' }}>
                <span>{testResult.success ? '✓' : '✗'}</span><span>{testResult.message}</span>
              </div>
            )}

            {/* Action buttons */}
            <div className="flex items-center gap-3 pt-2 flex-wrap">
              <button onClick={handleSaveApi4ComSettings} disabled={savingSettings} className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50" style={{ background: settingsSaved ? '#16a34a' : '#7c3aed' }}>
                {savingSettings ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : null}
                {settingsSaved ? '✓ Salvo!' : 'Salvar configurações'}
              </button>
              <button onClick={handleTestApi4ComConnection} disabled={testingConnection} title="Testa o token salvo no banco de dados" className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold transition-all disabled:opacity-50" style={{ border: '1px solid #22c55e', color: '#22c55e', background: 'transparent' }}>
                {testingConnection ? <span className="w-4 h-4 border-2 border-emerald-400 border-t-transparent rounded-full animate-spin" /> : <span>📞</span>}
                Testar Conexão
              </button>
            </div>

            {/* Webhook section */}
            <div className="mt-6 pt-6 border-t border-gray-200 dark:border-white/10 space-y-5">
              <div className="rounded-2xl p-5 space-y-4" style={{ background: 'rgba(124,58,237,0.07)', border: '1px solid rgba(124,58,237,0.18)' }}>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0" style={{ background: 'rgba(124,58,237,0.15)' }}>
                    <span className="text-xl">🔗</span>
                  </div>
                  <div>
                    <p className="font-bold text-gray-900 dark:text-white text-sm">Webhook Api4Com</p>
                    <p className="text-xs mt-0.5 text-gray-500 dark:text-[#9ca3af]">Recebe notificações ao final de cada chamada (duração, gravação, status)</p>
                  </div>
                </div>
                <div className="space-y-1.5">
                  <p className="text-xs font-medium text-gray-500 dark:text-[#9ca3af]">URL do Webhook (GrapeHub)</p>
                  <div className="flex items-center gap-2 rounded-lg px-3 py-2.5 bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10">
                    <code className="text-xs flex-1 break-all text-violet-600 dark:text-violet-400">{window.location.origin}/api/api4com/webhook</code>
                    <button onClick={() => navigator.clipboard.writeText(`${window.location.origin}/api/api4com/webhook`)} className="flex-shrink-0 p-1 rounded hover:bg-black/5 dark:hover:bg-white/10 transition-colors" title="Copiar URL">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" className="text-gray-500 dark:text-[#9ca3af]" strokeWidth="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
                    </button>
                  </div>
                </div>
                <div className="rounded-xl p-3 space-y-1.5 bg-white dark:bg-black/20">
                  <p className="text-xs font-semibold text-gray-700 dark:text-[#e5e7eb]">Como funciona:</p>
                  <div className="space-y-1 text-xs text-gray-500 dark:text-[#9ca3af]">
                    <p>1️⃣ Você clica em ligar → GrapeHub chama o Dialer da Api4Com</p>
                    <p>2️⃣ Api4Com realiza a chamada via SIP</p>
                    <p>3️⃣ Ao finalizar → Api4Com envia POST para esta URL</p>
                    <p>4️⃣ GrapeHub salva duração, gravação e status no histórico do lead</p>
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleRegisterWebhook} disabled={webhookRegistering}
                  className="flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-semibold text-white transition-all disabled:opacity-50"
                  style={{ background: webhookResult?.success ? '#16a34a' : '#7c3aed' }}>
                  {webhookRegistering ? <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <span>🔗</span>}
                  {webhookResult?.success ? '✓ Webhook Registrado!' : 'Registrar na Api4Com'}
                </button>
                <p className="text-xs text-gray-500 dark:text-gray-400">Atualiza o webhook na conta</p>
              </div>
              {webhookResult?.error && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.2)', color: '#fca5a5' }}>
                  ❌ {webhookResult.error}
                </div>
              )}
              {webhookResult?.success && (
                <div className="rounded-xl px-4 py-3 text-sm" style={{ background: 'rgba(16,185,129,0.1)', border: '1px solid rgba(16,185,129,0.2)', color: '#6ee7b7' }}>
                  ✅ Webhook registrado! A Api4Com vai notificar o GrapeHub após cada chamada.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ═══════════════════════════════════════════════
  // MAIN SETTINGS VIEW
  // ═══════════════════════════════════════════════
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
                id={`settings-${item.label.toLowerCase().replace(/\s+/g, '-')}`}
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
