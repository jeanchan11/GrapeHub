import React, { useState, useEffect, useMemo } from 'react';
import { 
  Phone, PhoneIncoming, PhoneMissed, Clock, 
  Users, Sunset, CalendarDays, Flame, ChevronDown, ChevronUp, Download, Play, Filter, LayoutDashboard, List
} from 'lucide-react';
import { 
  ResponsiveContainer, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, 
  PieChart, Pie, Cell, BarChart, Bar 
} from 'recharts';
import { useAuth } from '../contexts/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

const COLORS = ['#8B5CF6', '#F43F5E', '#10B981', '#F59E0B', '#3B82F6'];

// Types
type CallStatus = 'answered' | 'missed' | 'busy' | 'outbound';
type DateRange = 'hoje' | '7d' | '30d' | '90d' | 'todos';

interface CallRecord {
  id: string;
  call_type: string;
  hangup_cause: string;
  started_at: string;
  duration: number; // in seconds
  record_url?: string;
  to: string;
  caller_id_number: string;
  first_name?: string;
  last_name?: string;
  vendedor: string;
  extension?: string;
}

export default function CrmLigacoes() {
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'dashboard' | 'historico'>('dashboard');
  const [loading, setLoading] = useState(true);
  const [calls, setCalls] = useState<CallRecord[]>([]);
  const [dateRange, setDateRange] = useState<DateRange>('30d');
  
  // Dashboard Fetch States
  const [customStart, setCustomStart] = useState('');
  const [customEnd, setCustomEnd] = useState('');

  // History Filter States
  const [showFilters, setShowFilters] = useState(true);
  const [filterAtendente, setFilterAtendente] = useState('');
  const [filterRamal, setFilterRamal] = useState('');
  const [filterNumero, setFilterNumero] = useState('');
  const [filterTipo, setFilterTipo] = useState('');
  const [filterCausa, setFilterCausa] = useState('');
  const [filterDuracao, setFilterDuracao] = useState('');

  // Helpers
  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

  const parseISO = (dateStr: string) => {
    if (!dateStr) return new Date();
    // Handle YYYY-MM-DD HH:mm:ss formatting usually from CRM/DB
    const safeStr = dateStr.replace(' ', 'T') + (dateStr.includes('Z') ? '' : 'Z');
    return new Date(safeStr);
  };

  const getCallTypeLabel = (call: CallRecord) => {
    if (call.call_type === 'inbound') return 'Recebida';
    if (call.hangup_cause === 'NORMAL_CLEARING') return 'Atendida';
    if (call.hangup_cause === 'NO_ANSWER' || call.hangup_cause === 'ORIGINATOR_CANCEL') return 'Não atendida';
    if (call.hangup_cause === 'USER_BUSY' || call.hangup_cause === 'CALL_REJECTED') return 'Ocupado';
    return 'Chamada Ext.';
  };

  const isSuccess = (call: CallRecord) => call.hangup_cause === 'NORMAL_CLEARING' || call.duration > 0;

  // Data Fetching
  const fetchCalls = async (manualStart?: string, manualEnd?: string) => {
    if (!user?.email) return;
    setLoading(true);
    try {
      let started_after = '';
      let started_before = '';
      
      if (manualStart || manualEnd) {
        if (manualStart) started_after = new Date(manualStart).toISOString();
        if (manualEnd) {
           const end = new Date(manualEnd);
           end.setHours(23, 59, 59, 999);
           started_before = end.toISOString();
        }
      } else {
        const now = new Date();
        if (dateRange !== 'todos') {
           const days = dateRange === 'hoje' ? 1 : dateRange === '7d' ? 7 : dateRange === '30d' ? 30 : 90;
           const targetDate = new Date();
           targetDate.setDate(now.getDate() - days);
           started_after = targetDate.toISOString();
        }
      }
      
      const queryParams = new URLSearchParams({ 
        user_id: user.email,
        limit: '500' // High limit to build aggregated charts and full history
      });
      if (started_after) queryParams.append('started_after', started_after);
      if (started_before) queryParams.append('started_before', started_before);

      const res = await fetch(`/api/api4com/calls?${queryParams.toString()}`);
      if (res.ok) {
        const json = await res.json();
        const dataList = Array.isArray(json) ? json : json.data || [];
        // Map to standard internal format
        const mappedList: CallRecord[] = dataList.map((c: any) => {
          let vendedorStr = c.caller_id_number || 'Agente';
          if (c.crm_responsavel) {
            vendedorStr = c.crm_responsavel;
          } else if (c.extension) {
            vendedorStr = `Ramal ${c.extension}`;
          }
          return {
            ...c,
            vendedor: vendedorStr,
            extension: c.extension || ''
          };
        });
        setCalls(mappedList);
      }
    } catch (e) {
      console.error('Error fetching dashboard calls:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // Only fire automatic fetch if viewing dashboard logic
    fetchCalls();
  }, [user?.email, dateRange]);

  const handleApplyCustomDates = () => {
    fetchCalls(customStart, customEnd);
  };

  const handleClearCustomDates = () => {
    setCustomStart('');
    setCustomEnd('');
    setFilterAtendente('');
    setFilterRamal('');
    setFilterNumero('');
    setFilterTipo('');
    setFilterCausa('');
    setFilterDuracao('');
    fetchCalls(); // clear uses standard last 30 days
  };

  // Filtered History
  const filteredHistory = useMemo(() => {
    return calls.filter(c => {
      let match = true;
      if (filterAtendente && !c.vendedor.toLowerCase().includes(filterAtendente.toLowerCase())) match = false;
      if (filterRamal && c.extension !== filterRamal) match = false;
      if (filterNumero) {
        const targetNumber = c.to || c.caller_id_number || '';
        if (!targetNumber.includes(filterNumero)) match = false;
      }
      if (filterTipo && filterTipo !== 'ambas') {
        if (filterTipo === 'recebida' && c.call_type !== 'inbound') match = false;
        if (filterTipo === 'efetuada' && c.call_type !== 'outbound') match = false;
      }
      if (filterCausa) {
        if (filterCausa === 'atendida' && !isSuccess(c)) match = false;
        if (filterCausa === 'nao_atendida' && isSuccess(c)) match = false;
      }
      if (filterDuracao && filterDuracao !== 'todas') {
        if (filterDuracao === 'curta' && c.duration >= 60) match = false;
        if (filterDuracao === 'media' && (c.duration < 60 || c.duration > 300)) match = false;
        if (filterDuracao === 'longa' && c.duration <= 300) match = false;
      }
      return match;
    });
  }, [calls, filterAtendente, filterRamal, filterNumero, filterTipo, filterCausa, filterDuracao]);


  // Unique extensions for dropdown
  const uniqueExtensions = useMemo(() => {
    const ext = new Set<string>();
    calls.forEach(c => { if (c.extension) ext.add(c.extension); });
    return Array.from(ext).sort();
  }, [calls]);

  // Aggregations
  const metrics = useMemo(() => {
    const total = calls.length;
    const answered = calls.filter(isSuccess);
    const missed = total - answered.length;
    
    let totalSecs = 0;
    const uniquePhones = new Set();
    const hoursCount: Record<number, number> = {};
    const daysCount: Record<number, number> = {};

    calls.forEach(c => {
      totalSecs += Number(c.duration || 0);
      const phone = c.call_type === 'inbound' ? c.caller_id_number : c.to;
      if (phone) uniquePhones.add(phone);

      const d = parseISO(c.started_at);
      if (d) {
        const h = d.getHours();
        const day = d.getDay();
        hoursCount[h] = (hoursCount[h] || 0) + 1;
        daysCount[day] = (daysCount[day] || 0) + 1;
      }
    });

    const avgDuration = answered.length > 0 ? (totalSecs / answered.length) : 0;
    const peakHour = Object.keys(hoursCount).reduce((a, b) => hoursCount[a as any] > hoursCount[b as any] ? a : b, '0');
    const busiestDayInt = Object.keys(daysCount).reduce((a, b) => daysCount[a as any] > daysCount[b as any] ? a : b, '0');
    
    const dayNames = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

    return {
      total,
      answeredCount: answered.length,
      answeredPerc: total > 0 ? Math.round((answered.length / total) * 100) : 0,
      missedCount: missed,
      missedPerc: total > 0 ? Math.round((missed / total) * 100) : 0,
      avgDuration,
      uniqueContacts: uniquePhones.size,
      peakHour: `${peakHour}h`,
      busiestDay: dayNames[Number(busiestDayInt)] || '-',
      totalMinutes: Math.floor(totalSecs / 60)
    };
  }, [calls]);

  // Chart Data: Volume Trend
  const volumeData = useMemo(() => {
    const map = new Map<string, number>();
    [...calls].reverse().forEach(c => {
      const d = parseISO(c.started_at);
      if (d) {
        const key = d.toLocaleDateString('pt-BR', { month: 'short', day: 'numeric' });
        map.set(key, (map.get(key) || 0) + 1);
      }
    });
    return Array.from(map.entries()).map(([date, calls]) => ({ date, calls }));
  }, [calls]);

  // Chart Data: Status Pie
  const statusData = useMemo(() => {
    return [
      { name: 'Atendidas', value: metrics.answeredCount, color: '#10B981' },
      { name: 'Não Atendidas', value: metrics.missedCount, color: '#F43F5E' },
    ];
  }, [metrics]);

  // Chart Data: Seller Performance
  const sellerData = useMemo(() => {
    const map: Record<string, { answered: number, missed: number, total: number }> = {};
    calls.forEach(c => {
      const v = c.vendedor || 'Desconhecido';
      if (!map[v]) map[v] = { answered: 0, missed: 0, total: 0 };
      map[v].total++;
      if (isSuccess(c)) map[v].answered++; else map[v].missed++;
    });
    return Object.entries(map)
      .map(([name, data]) => ({ name, ...data }))
      .sort((a, b) => b.total - a.total).slice(0, 5); // top 5
  }, [calls]);

  // Chart Data: Hourly Distribution Bar
  const hourlyData = useMemo(() => {
    const hours = Array.from({length: 24}, (_, i) => ({ hour: `${i}h`, count: 0 }));
    calls.forEach(c => {
      const d = parseISO(c.started_at);
      if (d) {
        hours[d.getHours()].count += 1;
      }
    });
    return hours;
  }, [calls]);

  // Heatmap Data (Days x Hours)
  const heatmapData = useMemo(() => {
    const grid: number[][] = Array(7).fill(0).map(() => Array(24).fill(0));
    let max = 0;
    calls.forEach(c => {
      const d = parseISO(c.started_at);
      if (d) {
        grid[d.getDay()][d.getHours()]++;
        if (grid[d.getDay()][d.getHours()] > max) max = grid[d.getDay()][d.getHours()];
      }
    });
    return { grid, max };
  }, [calls]);

  const MetricCard = ({ icon: Icon, title, value, subValue, color }: any) => (
    <div className="bg-dark-card border border-white/10 rounded-2xl p-5 flex flex-col items-center text-center transition-colors duration-200">
      <div className="p-3 rounded-full mb-3" style={{ backgroundColor: `${color}1A`, color }}>
        <Icon size={20} strokeWidth={2.5} />
      </div>
      <h3 className="text-[10px] font-bold text-slate-500 dark:text-slate-400 tracking-widest uppercase mb-2">{title}</h3>
      <div className="text-3xl font-black text-dark-text mb-1">{value}</div>
      <p className="text-xs text-slate-500">{subValue}</p>
    </div>
  );

  return (
    <div className="min-h-full bg-dark-bg text-dark-text font-sans p-6 md:p-8 overflow-y-auto w-full transition-colors duration-300">
      
      {/* HEADER TABS & TITLE */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-dark-text">Ligações</h1>
          <p className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest mt-0.5">{viewMode === 'dashboard' ? 'Visualize e analise suas chamadas' : 'Histórico avançado de chamadas'}</p>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-4 items-center">
            {/* View Switcher */}
            <div className="flex bg-dark-card border border-white/10 p-1 rounded-xl text-sm">
              <button 
                onClick={() => setViewMode('dashboard')} 
                className={`flex items-center gap-2 px-4 py-1.5 font-bold rounded-lg transition-all ${viewMode === 'dashboard' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-dark-text'}`}
              >
                <LayoutDashboard size={16}/> Resumo
              </button>
              <button 
                onClick={() => setViewMode('historico')} 
                className={`flex items-center gap-2 px-4 py-1.5 font-bold rounded-lg transition-all ${viewMode === 'historico' ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-dark-text'}`}
              >
                <List size={16}/> Histórico
              </button>
            </div>

            {/* Dashboard Quick Date Picker */}
            {viewMode === 'dashboard' && (
              <div className="flex bg-dark-card border border-white/10 p-1.5 rounded-xl text-sm">
                 {['Hoje', '7 dias', '30 dias', '90 dias'].map((label, idx) => {
                   const key = label === 'Hoje' ? 'hoje' : label.replace(' dias', 'd') === 'Todos' ? 'todos' : label.replace(' dias', 'd');
                   const isActive = dateRange === key;
                   return (
                     <button 
                       key={idx} 
                       onClick={() => setDateRange(key as DateRange)}
                       className={`px-4 py-1.5 font-bold rounded-lg transition-all ${
                         isActive ? 'bg-violet-600 text-white shadow' : 'text-slate-500 hover:text-dark-text'
                       }`}
                     >
                       {label}
                     </button>
                   )
                 })}
              </div>
            )}
        </div>
      </div>

      {loading && calls.length === 0 ? (
        <div className="flex items-center justify-center p-20">
          <LoadingSpinner size="lg" />
        </div>
      ) : (
        <>
          {viewMode === 'dashboard' ? (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
              {/* METRICS ROW 1 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard icon={Phone} title="Total Chamadas" value={metrics.total} subValue={`${metrics.total} chamadas/dia`} color="#6366F1" />
                <MetricCard icon={PhoneIncoming} title="Atendidas" value={metrics.answeredCount} subValue={`${metrics.answeredPerc}% do total`} color="#10B981" />
                <MetricCard icon={PhoneMissed} title="Não Atendidas" value={metrics.missedCount} subValue={`${metrics.missedPerc}% do total`} color="#F43F5E" />
                <MetricCard icon={Clock} title="Duração Média" value={formatTime(metrics.avgDuration)} subValue="Tempo médio por chamada" color="#8B5CF6" />
              </div>

              {/* METRICS ROW 2 */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <MetricCard icon={Users} title="Contatos Únicos" value={metrics.uniqueContacts} subValue="Números diferentes" color="#A855F7" />
                <MetricCard icon={Sunset} title="Hora Pico" value={metrics.peakHour} subValue="Horário com maior volume" color="#F59E0B" />
                <MetricCard icon={CalendarDays} title="Dia Mais Movimentado" value={metrics.busiestDay} subValue="Dia da semana" color="#EAB308" />
                <MetricCard icon={Flame} title="Minutos Totais" value={metrics.totalMinutes} subValue={`${metrics.answeredCount} chamadas atendidas`} color="#F97316" />
              </div>

              {/* CHARTS ROW 1 */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200 lg:col-span-2">
                  <h3 className="text-sm font-bold text-dark-text mb-6">Volume de Chamadas</h3>
                  <div className="h-64">
                    {volumeData.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados no período</div> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={volumeData}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} dy={10} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} dx={-10} />
                          <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }} />
                          <Line type="monotone" dataKey="calls" stroke="#8B5CF6" strokeWidth={3} dot={{ strokeWidth: 2, r: 4, fill: '#fff' }} activeDot={{ r: 6, strokeWidth: 0, fill: '#8B5CF6' }} />
                        </LineChart>
                      </ResponsiveContainer>
                    )}
                  </div>
              </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                  <h3 className="text-sm font-bold text-dark-text mb-2">Status das Chamadas</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Distribuição de chamadas por status</p>
                  <div className="h-56 relative flex items-center justify-center">
                    {calls.length === 0 ? <div className="text-slate-400 text-sm">Sem dados</div> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={80} paddingAngle={2} dataKey="value" stroke="none">
                            {statusData.map((entry, index) => <Cell key={`cell-${index}`} fill={entry.color} />)}
                          </Pie>
                          <RechartsTooltip formatter={(value: any) => [`${value} chamadas`, '']} contentStyle={{ borderRadius: '10px', border: 'none', fontSize: '12px' }} />
                        </PieChart>
                      </ResponsiveContainer>
                    )}
                    {calls.length > 0 && (
                      <div className="absolute flex flex-col items-center justify-center text-center w-full h-full pointer-events-none">
                        <span className="text-2xl font-bold">{metrics.answeredPerc}%</span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-wider">Atendidas</span>
                      </div>
                    )}
                  </div>
                  <div className="flex justify-center gap-6 mt-2">
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-emerald-500"></div><span className="text-xs text-slate-500">Atendidas</span></div>
                    <div className="flex items-center gap-2"><div className="w-2.5 h-2.5 rounded-full bg-rose-500"></div><span className="text-xs text-slate-500">Não atendidas</span></div>
                  </div>
                </div>
              </div>

              {/* CHARTS ROW 2 */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                  <h3 className="text-sm font-bold text-dark-text mb-6">Performance por vendedor</h3>
                  <div className="h-56">
                    {sellerData.length === 0 ? <div className="h-full flex items-center justify-center text-slate-400 text-sm">Sem dados</div> : (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={sellerData} layout="vertical" margin={{ top: 0, right: 0, bottom: 0, left: 30 }}>
                          <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#E2E8F0" opacity={0.5} />
                          <XAxis type="number" axisLine={false} tickLine={false} tick={{ fontSize: 12, fill: '#94A3B8' }} />
                          <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#64748B' }} dx={-10} />
                          <RechartsTooltip cursor={{ fill: 'rgba(0,0,0,0.02)' }} contentStyle={{ borderRadius: '10px', fontSize: '12px', border: 'none' }} />
                          <Bar dataKey="answered" name="Atendidas" stackId="a" fill="#10B981" radius={[0, 0, 0, 0]} barSize={12} />
                          <Bar dataKey="missed" name="Não atendidas" stackId="a" fill="#F1F5F9" radius={[0, 4, 4, 0]} barSize={12} />
                        </BarChart>
                      </ResponsiveContainer>
                    )}
                  </div>
                </div>
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                  <h3 className="text-sm font-bold text-dark-text mb-2">Mapa de Calor por Horário</h3>
                  <p className="text-xs text-slate-500 dark:text-slate-400 mb-6">Distribuição de chamadas por hora e dia da semana</p>
                  
                  <div className="flex flex-col w-full h-[14rem] text-[10px] text-slate-400">
                    <div className="flex mb-1 pl-8 justify-between">
                      {Array.from({length: 24}, (_, i) => <div key={i} className="flex-1 text-center">{i}h</div>)}
                    </div>
                    <div className="flex-1 flex flex-col gap-1">
                      {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, dIdx) => (
                        <div key={day} className="flex-1 flex items-center gap-2">
                          <div className="w-6 text-right font-medium">{day}</div>
                          <div className="flex-1 flex gap-1 h-full">
                            {heatmapData.grid[dIdx].map((count, hIdx) => {
                              const intensity = heatmapData.max > 0 ? count / heatmapData.max : 0;
                              return (
                                <div 
                                  key={hIdx} 
                                  className="flex-1 h-full rounded-sm"
                                  style={{ 
                                    backgroundColor: intensity > 0 ? `rgba(139, 92, 246, ${Math.max(0.15, intensity)})` : 'var(--tw-colors-slate-100)',
                                  }}
                                  title={`${day} às ${hIdx}h: ${count} chamadas`}
                                />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* DISTRIBUTION BAR */}
              <div className="bg-dark-card border border-white/10 rounded-2xl p-6 transition-colors duration-200">
                <h3 className="text-sm font-bold text-dark-text mb-6">Distribuição por horário</h3>
                <div className="h-40">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={hourlyData} margin={{ top: 0, right: 0, bottom: 0, left: -20 }}>
                      <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" opacity={0.5} />
                      <XAxis dataKey="hour" axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} dy={10} />
                      <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 11, fill: '#94A3B8' }} />
                      <RechartsTooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '10px', fontSize: '12px', border: 'none' }} labelStyle={{ color: '#000' }} />
                      <Bar dataKey="count" fill="#8B5CF6" radius={[4, 4, 0, 0]} barSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-500">
               {/* HISTORY TOP BAR */}
               <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden transition-colors duration-200">
                  
                  {/* Top Tool Bar */}
                  <div className="p-4 flex flex-col md:flex-row items-center justify-between border-b border-white/10 gap-4">
                     <div className="flex items-center gap-2">
                        <input type="date" value={customStart} onChange={e => setCustomStart(e.target.value)} className="text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                        <span className="text-slate-400 text-sm">até</span>
                        <input type="date" value={customEnd} onChange={e => setCustomEnd(e.target.value)} className="text-sm bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 focus:ring-2 focus:ring-blue-500/20 outline-none" />
                        
                        <button onClick={handleApplyCustomDates} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-1.5 rounded-lg text-sm font-medium transition-colors ml-2 shadow-sm">Aplicar</button>
                        <button onClick={handleClearCustomDates} className="border border-slate-200 dark:border-white/10 hover:bg-slate-50 dark:hover:bg-white/5 text-slate-600 dark:text-slate-300 px-4 py-1.5 rounded-lg text-sm font-medium transition-colors">Limpar</button>
                     </div>
                     <div className="flex items-center gap-2">
                        <button onClick={() => setShowFilters(!showFilters)} className="text-blue-500 border border-blue-200 dark:border-blue-500/30 bg-blue-50/50 dark:bg-blue-500/5 hover:bg-blue-50 dark:hover:bg-blue-500/10 px-4 py-1.5 rounded-lg text-sm font-medium flex items-center gap-2 transition-colors">
                           <Filter size={14} /> {showFilters ? 'Ocultar Filtros' : 'Exibir Filtros'} {showFilters ? <ChevronUp size={14}/> : <ChevronDown size={14}/>}
                        </button>
                        <button className="p-1.5 text-slate-500 hover:text-slate-700 dark:hover:text-slate-300 border border-slate-200 dark:border-white/10 rounded-lg"><Download size={16} /></button>
                     </div>
                  </div>

                  {/* Advanced Filters Card */}
                  {showFilters && (
                    <div className="p-6 bg-slate-50/50 dark:bg-black/10 border-b border-slate-100 dark:border-white/5">
                       <h4 className="text-sm font-medium mb-4 text-slate-800 dark:text-slate-200">Filtros Avançados</h4>
                       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                         
                         {/* Filter: Atendente */}
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Atendente</label>
                            <input type="text" placeholder="Nome do atendente" value={filterAtendente} onChange={e => setFilterAtendente(e.target.value)} className="w-full text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-400" />
                         </div>

                         {/* Filter: Ramais */}
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Ramais</label>
                            <select value={filterRamal} onChange={e => setFilterRamal(e.target.value)} className="w-full text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-400">
                               <option value="">Selecione os ramais</option>
                               {uniqueExtensions.map(ext => <option key={ext} value={ext}>Ramal {ext}</option>)}
                            </select>
                         </div>

                         {/* Filter: Número */}
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Número Discado</label>
                            <input type="text" placeholder="Número de destino (ex: 48988...)" value={filterNumero} onChange={e => setFilterNumero(e.target.value)} className="w-full text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-400" />
                         </div>

                         {/* Filter: Tipo */}
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Tipo de Chamada</label>
                            <select value={filterTipo} onChange={e => setFilterTipo(e.target.value)} className="w-full text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-400">
                               <option value="ambas">Ambas</option>
                               <option value="recebida">Recebidas (Inbound)</option>
                               <option value="efetuada">Efetuadas (Outbound)</option>
                            </select>
                         </div>

                         {/* Filter: Causa */}
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Causas do Desligamento</label>
                            <select value={filterCausa} onChange={e => setFilterCausa(e.target.value)} className="w-full text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-400">
                               <option value="">Selecione as causas</option>
                               <option value="atendida">Normais (Atendidas)</option>
                               <option value="nao_atendida">Não Atendidas / Canceladas</option>
                            </select>
                         </div>

                         {/* Filter: Duração */}
                         <div>
                            <label className="block text-xs font-medium text-slate-500 mb-1.5">Duração da Chamada</label>
                            <select value={filterDuracao} onChange={e => setFilterDuracao(e.target.value)} className="w-full text-sm bg-white dark:bg-black/20 border border-slate-200 dark:border-white/10 rounded-lg px-3 py-2 outline-none focus:border-blue-400">
                               <option value="todas">Todas</option>
                               <option value="curta">Curta (&lt; 1 min)</option>
                               <option value="media">Média (1 - 5 min)</option>
                               <option value="longa">Longa (&gt; 5 min)</option>
                            </select>
                         </div>

                       </div>
                    </div>
                  )}

                  {/* HISTORY TABLE */}
                  <div className="p-6">
                     <div className="flex justify-between items-end mb-6">
                       <h3 className="text-sm font-bold text-dark-text">Listagem de Resultados</h3>
                       <span className="text-xs text-slate-500 dark:text-slate-400 font-medium">{filteredHistory.length} registros encontrados</span>
                     </div>

                     <div className="overflow-x-auto min-h-[400px]">
                       <table className="w-full text-left text-sm whitespace-nowrap">
                          <thead>
                            <tr className="text-[10px] font-bold text-slate-500 dark:text-slate-400 border-b border-white/10 uppercase tracking-widest pb-2">
                               <th className="font-semibold uppercase pb-3">Vendedor</th>
                               <th className="font-semibold uppercase pb-3">Telefone</th>
                               <th className="font-semibold uppercase pb-3">Tipo</th>
                               <th className="font-semibold uppercase pb-3">Status</th>
                               <th className="font-semibold uppercase pb-3">Duração</th>
                               <th className="font-semibold uppercase pb-3">Data</th>
                               <th className="font-semibold uppercase pb-3 w-48">Gravação</th>
                            </tr>
                          </thead>
                          <tbody>
                            {filteredHistory.length === 0 && (
                              <tr><td colSpan={7} className="py-12 text-center text-slate-400">Nenhuma ligação encontrada com os filtros selecionados</td></tr>
                            )}
                            {filteredHistory.slice(0, 100).map((c) => {
                              const success = isSuccess(c);
                              return (
                                <tr key={c.id} className="border-b border-slate-50 dark:border-white/5 hover:bg-slate-50/50 dark:hover:bg-white/5 transition-colors group">
                                  <td className="py-3">
                                    <div className="flex items-center gap-2">
                                      <div className="w-7 h-7 rounded-full bg-slate-100 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-slate-600 dark:text-slate-300">
                                        {c.vendedor.substring(0, 2).toUpperCase()}
                                      </div>
                                      <span className="font-medium text-slate-700 dark:text-slate-300">{c.vendedor}</span>
                                    </div>
                                  </td>
                                  <td className="py-3 font-medium text-slate-600 dark:text-slate-300">{c.to || c.caller_id_number}</td>
                                  <td className="py-3">
                                    <span className="text-xs text-slate-500 font-medium">{c.call_type === 'inbound' ? 'Recebida' : 'Efetuada'}</span>
                                  </td>
                                  <td className="py-3">
                                    <span className={`px-2.5 py-1 rounded-md text-[11px] font-semibold ${success ? 'bg-emerald-50 text-emerald-600 dark:bg-emerald-500/10' : 'bg-rose-50 text-rose-600 dark:bg-rose-500/10'}`}>
                                      {getCallTypeLabel(c)}
                                    </span>
                                  </td>
                                  <td className="py-3 text-slate-500 font-medium">{formatTime(Number(c.duration || 0))}</td>
                                  <td className="py-3 text-slate-500">
                                    {parseISO(c.started_at).toLocaleDateString()} <span className="text-slate-400 text-xs ml-1">{parseISO(c.started_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}</span>
                                  </td>
                                  <td className="py-3">
                                    {c.record_url ? (
                                      <div className="flex items-center gap-2">
                                         <audio controls src={c.record_url} className="h-8 max-w-[200px] opacity-70 group-hover:opacity-100 transition-opacity" preload="none" />
                                      </div>
                                    ) : (
                                      <span className="text-[11px] font-medium text-slate-400 bg-slate-100 dark:bg-white/5 px-2 py-1 rounded-md">Sem gravação</span>
                                    )}
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                       </table>
                     </div>
                  </div>
               </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}
