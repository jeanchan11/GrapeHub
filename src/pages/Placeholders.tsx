import React, { useState } from 'react';
import { Bell, Settings, Shield, User, Palette, Globe, Lock, HelpCircle, Mail, MessageSquare, Zap, AlertCircle, FolderTree, ArrowRight, CheckSquare, ChevronLeft, UserPlus } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import SplitHeadline from '../components/SplitHeadline';
import { toast } from '@/src/lib/toast';

const PageHeader = ({ title, icon: Icon, description }: { title: string, icon: any, description: string }) => {
  const words = title.split(' ');
  const text = words.length > 1 ? words.slice(0, -1).join(' ') + ' ' : '';
  const highlight = words.length > 1 ? words.slice(-1)[0] : title;
  return (
    <div className="mb-10">
      <SplitHeadline
        text={text}
        highlight={highlight}
        subtitle={description}
        className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1"
      />
    </div>
  );
};

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
  const [activeSection, setActiveSection] = useState<'main' | 'categories' | 'automacoes'>('main');

  const [autoTab, setAutoTab] = useState<'automacoes' | 'logs'>('automacoes');
  const [logs, setLogs] = useState<any[]>([]);
  const [logsLoading, setLogsLoading] = useState(false);

  // ── Webhook de Alertas ──
  const [webhookOpen, setWebhookOpen] = useState(false);
  const [webhookForm, setWebhookForm] = useState({ url: '', secret: '', enabled: false });
  const [webhookLoading, setWebhookLoading] = useState(false);
  const [webhookSaving, setWebhookSaving] = useState(false);
  const [webhookMsg, setWebhookMsg] = useState<string | null>(null);
  const openWebhook = async () => {
    setWebhookOpen(true); setWebhookMsg(null); setWebhookLoading(true);
    try { const r = await fetch('/api/alert-webhook'); if (r.ok) { const d = await r.json(); setWebhookForm({ url: d.url || '', secret: d.secret || '', enabled: !!d.enabled }); } } catch { /* */ }
    finally { setWebhookLoading(false); }
  };
  const saveWebhook = async () => {
    setWebhookSaving(true); setWebhookMsg(null);
    try { const r = await fetch('/api/alert-webhook', { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(webhookForm) }); setWebhookMsg(r.ok ? 'Configuração salva.' : 'Erro ao salvar.'); }
    catch { setWebhookMsg('Falha de conexão.'); } finally { setWebhookSaving(false); setTimeout(() => setWebhookMsg(null), 4000); }
  };
  const testWebhook = async () => {
    setWebhookMsg('Enviando teste...');
    try { const r = await fetch('/api/alert-webhook/test', { method: 'POST' }); const d = await r.json(); setWebhookMsg(d.sent ? 'Teste disparado ✅ — confira no n8n / grupo.' : 'Não enviado — salve a URL e marque "Ativo" primeiro.'); }
    catch { setWebhookMsg('Falha ao testar.'); }
  };

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
    { label: 'Categorias Financeiras', description: 'Plano de contas hierárquico da empresa', icon: FolderTree, action: () => setActiveSection('categories') },
    { label: 'Automações', description: 'Automações ativas que criam tarefas no CRM', icon: Zap, action: () => setActiveSection('automacoes') },
    { label: 'Logs de Atividade', description: 'Histórico de ações no sistema' },
    ...(isSuperAdmin ? [{
      label: 'Webhook Alertas',
      description: 'Recebe erros e alertas do sistema (você envia no WhatsApp via n8n)',
      icon: Bell,
      action: () => openWebhook()
    }] : []),
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
          <SplitHeadline text="Auto" highlight="mações" subtitle="Automações ativas que criam tarefas no CRM e Onboarding." className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1" />
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

      {/* ── Popup: Webhook de Alertas ── */}
      {webhookOpen && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={e => e.target === e.currentTarget && setWebhookOpen(false)}>
          <div className="bg-light-card dark:bg-dark-card rounded-2xl border border-slate-200 dark:border-white/10 w-full max-w-lg p-6 shadow-2xl">
            <div className="flex items-center justify-between mb-1">
              <h3 className="text-lg font-bold text-light-text dark:text-white flex items-center gap-2"><Bell size={18} className="text-violet-500" /> Webhook de Alertas</h3>
              <button onClick={() => setWebhookOpen(false)} className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-slate-400 text-lg leading-none">✕</button>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mb-5">Quando o sistema detecta um erro ou alerta (conta bloqueada, saldo baixo, falha no sync do Meta), ele faz um <b>POST JSON</b> para esta URL. Use no n8n pra formatar e enviar no grupo do WhatsApp.</p>
            {webhookLoading ? <p className="text-sm text-slate-400">Carregando…</p> : (
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">URL do Webhook (n8n)</label>
                  <input value={webhookForm.url} onChange={e => setWebhookForm(f => ({ ...f, url: e.target.value }))} placeholder="https://n8n.srv.../webhook/..."
                    className="w-full bg-light-bg dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-light-text dark:text-white focus:outline-none focus:border-violet-500/50" />
                </div>
                <div>
                  <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1 block">Segredo (opcional)</label>
                  <input value={webhookForm.secret} onChange={e => setWebhookForm(f => ({ ...f, secret: e.target.value }))} placeholder="Enviado no header X-Webhook-Secret"
                    className="w-full bg-light-bg dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-light-text dark:text-white focus:outline-none focus:border-violet-500/50" />
                </div>
                <label className="flex items-center gap-2 cursor-pointer select-none">
                  <input type="checkbox" checked={webhookForm.enabled} onChange={e => setWebhookForm(f => ({ ...f, enabled: e.target.checked }))} className="w-4 h-4 accent-violet-500" />
                  <span className="text-sm text-light-text dark:text-white">Ativo — empurrar alertas para este webhook</span>
                </label>
                <div className="text-[11px] text-slate-500 dark:text-slate-400 bg-black/5 dark:bg-white/5 rounded-lg p-3 leading-relaxed">
                  <span className="font-bold">Payload enviado (JSON):</span>
                  <code className="block mt-1 text-[10px] break-all">{`{ type, severity, title, message, partner, squad, account, timestamp }`}</code>
                </div>
                {webhookMsg && <p className="text-xs font-semibold text-violet-500">{webhookMsg}</p>}
                <div className="flex gap-3 pt-1">
                  <button onClick={testWebhook} className="px-4 py-2.5 rounded-xl border border-slate-200 dark:border-white/10 text-slate-500 text-sm font-semibold hover:bg-black/5 dark:hover:bg-white/5 transition-colors">Testar</button>
                  <button onClick={saveWebhook} disabled={webhookSaving} className="flex-1 px-4 py-2.5 rounded-xl bg-violet-600 hover:bg-violet-500 text-white text-sm font-bold disabled:opacity-50 transition-colors">{webhookSaving ? 'Salvando…' : 'Salvar'}</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
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
