import React, { useState, useEffect, useMemo, useRef } from 'react';
import { motion, animate, AnimatePresence } from 'framer-motion';
import { Plus, Edit2, Trash2, Book, Activity, Wrench, Brain, Target, X, Check, Calendar, AlertCircle, ChevronDown, ChevronUp } from 'lucide-react';
import LoadingSpinner from '../../components/LoadingSpinner';
import SplitHeadline from '../../components/SplitHeadline';
import OptionPicker from '../../components/ui/OptionPicker';

interface PdiEtapa {
  id?: number;
  titulo: string;
  concluida: boolean;
}

interface PdiItem {
  id: number;
  collaborator_id: number;
  titulo: string;
  descricao: string;
  tipo: 'Curso' | 'Prática' | 'Técnico' | 'Comportamental';
  progresso: number;
  prazo: string;
  status: 'Em andamento' | 'Concluído' | 'Pausado';
  etapas: PdiEtapa[];
  criado_em: string;
  atualizado_em: string;
}

interface PdiTabProps {
  collaboratorId: string;
  isAdmin: boolean;
}

const AnimatedNumber = ({ value, suffix = '' }: { value: number, suffix?: string }) => {
  const nodeRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const node = nodeRef.current;
    if (node) {
      const controls = animate(0, value, {
        duration: 1.5,
        ease: "easeOut",
        onUpdate(v) {
          node.textContent = Math.floor(v) + suffix;
        }
      });
      return () => controls.stop();
    }
  }, [value, suffix]);

  return <span ref={nodeRef}>0{suffix}</span>;
};

export default function PdiTab({ collaboratorId, isAdmin }: PdiTabProps) {
  const [items, setItems] = useState<PdiItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<Partial<PdiItem> | null>(null);
  const [filter, setFilter] = useState<'Todos' | 'Em andamento' | 'Concluído' | 'Pausado'>('Todos');
  const [expandedIds, setExpandedIds] = useState<number[]>([]);

  const toggleExpand = (id: number) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]);
  };

  useEffect(() => {
    fetchItems();
  }, [collaboratorId]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}/pdi`);
      if (res.ok) setItems(await res.json());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem?.titulo || !editingItem?.tipo) return alert('Título e Tipo são obrigatórios.');

    const isEditing = !!editingItem.id;
    const url = isEditing 
      ? `/api/collaborators/${collaboratorId}/pdi/${editingItem.id}` 
      : `/api/collaborators/${collaboratorId}/pdi`;

    try {
      const res = await fetch(url, {
        method: isEditing ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editingItem)
      });
      if (res.ok) {
        setModalOpen(false);
        fetchItems();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Deseja realmente excluir esta ação?')) return;
    try {
      const res = await fetch(`/api/collaborators/${collaboratorId}/pdi/${id}`, { method: 'DELETE' });
      if (res.ok) {
        setItems(items.filter(i => i.id !== id));
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleToggleEtapa = async (pdiId: number, etapaId: number, currentConcluida: boolean) => {
    if (!etapaId) return; // Cannot toggle an unsaved step
    try {
      const res = await fetch(`/api/pdi/etapas/${etapaId}/toggle`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ concluida: !currentConcluida })
      });
      if (res.ok) {
        const { progresso, status } = await res.json();
        // Update local state directly to be fast
        setItems(items.map(pdi => {
          if (pdi.id === pdiId) {
            const novasEtapas = pdi.etapas.map(e => e.id === etapaId ? { ...e, concluida: !currentConcluida } : e);
            return { ...pdi, etapas: novasEtapas, progresso, status };
          }
          return pdi;
        }));
      }
    } catch (e) {
      console.error(e);
    }
  };

  // Metrics
  const totalAcoes = items.length;
  const progressoGeral = items.length > 0 ? Math.round(items.reduce((acc, curr) => acc + curr.progresso, 0) / items.length) : 0;
  
  const proximoPrazo = useMemo(() => {
    const pendentes = items.filter(i => i.status !== 'Concluído' && i.prazo);
    if (pendentes.length === 0) return null;
    return pendentes.sort((a, b) => new Date(a.prazo).getTime() - new Date(b.prazo).getTime())[0];
  }, [items]);

  const filteredItems = items.filter(i => filter === 'Todos' || i.status === filter);

  // Helper functions
  const getTypeColor = (tipo: string) => {
    switch (tipo) {
      case 'Técnico': return '#7F77DD';
      case 'Prática': return '#F0997B';
      case 'Curso': return '#5DCAA5';
      case 'Comportamental': return '#85B7EB';
      default: return '#7F77DD';
    }
  };

  const getTypeIcon = (tipo: string) => {
    const color = getTypeColor(tipo);
    switch (tipo) {
      case 'Curso': return <Book size={18} color={color} />;
      case 'Prática': return <Activity size={18} color={color} />;
      case 'Técnico': return <Wrench size={18} color={color} />;
      case 'Comportamental': return <Brain size={18} color={color} />;
      default: return <Target size={18} color={color} />;
    }
  };

  const getProgressBarColor = (progresso: number) => {
    if (progresso < 40) return 'bg-[#7F77DD]';
    if (progresso < 80) return 'bg-amber-500';
    return 'bg-emerald-500';
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'Concluído': return 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20';
      case 'Pausado': return 'bg-rose-500/10 text-rose-500 border-rose-500/20';
      default: return 'bg-violet-500/10 text-violet-500 border-violet-500/20';
    }
  };

  const checkUrgency = (prazoStr: string, status: string) => {
    if (!prazoStr || status === 'Concluído') return false;
    const prazo = new Date(prazoStr);
    const hoje = new Date();
    const diffTime = prazo.getTime() - hoje.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays <= 30;
  };

  if (loading) return <div className="flex justify-center p-8"><LoadingSpinner /></div>;

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
      
      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div>
          <SplitHeadline text="Plano de " highlight="Desenvolvimento" className="text-xl font-black text-slate-800 dark:text-white" />
          <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mt-0.5">
            Acompanhamento de Evolução e PDI
          </p>
        </div>
        {isAdmin && (
          <button 
            onClick={() => { setEditingItem({ tipo: 'Técnico', status: 'Em andamento', progresso: 0, etapas: [] }); setModalOpen(true); }}
            className="flex items-center gap-2 bg-violet-600 hover:bg-violet-700 text-white px-4 py-2 rounded-xl text-sm font-bold transition-colors shrink-0"
          >
            <Plus size={15} /> Nova Ação
          </button>
        )}
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        
        {/* Card 1 */}
        <div className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200 hover:border-[#7F77DD]/30 dark:hover:border-[#7F77DD]/30 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Total de Ações</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#7F77DD]/10 text-[#7F77DD]">
              <Target size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 dark:text-white mb-0.5">
              <AnimatedNumber value={totalAcoes} />
            </div>
          </div>
        </div>

        {/* Card 2 */}
        <div className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200 hover:border-[#5DCAA5]/30 dark:hover:border-[#5DCAA5]/30 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Progresso Geral</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#5DCAA5]/10 text-[#5DCAA5]">
              <Activity size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 dark:text-white mb-0.5">
              <AnimatedNumber value={progressoGeral} suffix="%" />
            </div>
          </div>
        </div>

        {/* Card 3 */}
        <div className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl p-5 flex flex-col gap-2 min-w-0 transition-colors duration-200 hover:border-[#F0997B]/30 dark:hover:border-[#F0997B]/30 hover:shadow-sm">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-widest">Próximo Prazo</span>
            <div className="w-9 h-9 rounded-xl flex items-center justify-center bg-[#F0997B]/10 text-[#F0997B]">
              <Calendar size={16} />
            </div>
          </div>
          <div>
            <div className="text-xl font-black text-slate-800 dark:text-white mb-0.5">
              {proximoPrazo ? new Date(proximoPrazo.prazo).toLocaleDateString('pt-BR') : 'Nenhum'}
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="flex gap-2 p-1 bg-white dark:bg-dark-card rounded-xl border border-slate-200 dark:border-white/10 overflow-x-auto w-full sm:w-auto">
        {['Todos', 'Em andamento', 'Concluído', 'Pausado'].map(f => (
          <button
            key={f}
            onClick={() => setFilter(f as any)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${filter === f ? 'bg-[#7F77DD] text-white dark:text-dark-text shadow-sm' : 'text-slate-500 dark:text-slate-400 hover:text-dark-text hover:bg-slate-100 dark:hover:bg-white/5'}`}
          >
            {f}
          </button>
        ))}
      </div>

      {/* Cards List */}
      {filteredItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-slate-500 dark:text-slate-400 bg-white dark:bg-dark-card/50 rounded-xl border border-slate-200 dark:border-white/10">
          <Target size={48} className="mb-4 opacity-50 text-[#7F77DD]" />
          <p className="text-base font-semibold">Nenhuma ação encontrada para este filtro.</p>
        </div>
      ) : (
        <motion.div 
          initial="hidden" 
          animate="visible" 
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.1 } }
          }}
          className="grid grid-cols-1 lg:grid-cols-2 gap-5"
        >
          {filteredItems.map(item => {
            const isUrgent = checkUrgency(item.prazo, item.status);
            
            return (
              <motion.div 
                variants={{ hidden: { opacity: 0, y: 20 }, visible: { opacity: 1, y: 0 } }}
                key={item.id} 
                className="bg-white dark:bg-dark-bg border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden flex flex-col group relative"
              >
                <div className="p-5 flex-1">
                  {/* Top: Icon + Titles */}
                  <div 
                    className="flex items-center gap-3 cursor-pointer select-none"
                    onClick={() => toggleExpand(item.id)}
                  >
                    <div className="w-10 h-10 shrink-0 rounded-xl bg-slate-100 dark:bg-white/[0.03] flex items-center justify-center border border-slate-200 dark:border-white/5">
                      {getTypeIcon(item.tipo)}
                    </div>
                    <div className="flex-1 flex justify-between items-center min-w-0">
                      <h4 className="font-bold text-dark-text text-base leading-tight truncate">{item.titulo}</h4>
                      <div className="flex items-center gap-3 shrink-0 ml-3">
                        <div className="hidden sm:block w-32 bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                          <motion.div 
                            initial={{ width: 0 }}
                            animate={{ width: `${item.progresso}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full rounded-full ${getProgressBarColor(item.progresso)}`}
                          />
                        </div>
                        <span className="text-sm font-bold text-slate-500 dark:text-slate-400 w-8 text-right">{item.progresso}%</span>
                        <div className="text-slate-400 dark:text-slate-500 ml-1">
                          {expandedIds.includes(item.id) ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                        </div>
                      </div>
                    </div>
                  </div>

                  <AnimatePresence initial={false}>
                    {expandedIds.includes(item.id) && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: "easeInOut" }}
                        className="overflow-hidden"
                      >
                        <div className="pt-4">
                          <div className="flex flex-wrap items-center gap-2 mb-4">
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-[20px] bg-slate-800 text-slate-300 border border-slate-700">
                              {item.tipo}
                            </span>
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[20px] border ${getStatusBadge(item.status)}`}>
                              {item.status}
                            </span>
                            {item.prazo && (
                              <span className={`text-[10px] font-bold px-2 py-0.5 rounded-[20px] border flex items-center gap-1 ${isUrgent ? 'bg-orange-500/10 text-orange-500 border-orange-500/30' : 'bg-slate-800 text-slate-400 border-slate-700'}`}>
                                <Calendar size={10} />
                                {new Date(item.prazo).toLocaleDateString('pt-BR')}
                                {isUrgent && <AlertCircle size={10} className="ml-0.5" />}
                              </span>
                            )}
                          </div>
                          
                          {item.descricao && (
                            <p className="text-sm text-slate-500 dark:text-slate-400 mb-5 line-clamp-2">{item.descricao}</p>
                          )}

                          {/* Progress Bar and Checklist */}
                          <div className="bg-slate-50 dark:bg-white/[0.02] rounded-xl p-4 border border-slate-200 dark:border-white/5 mb-2">
                            
                            {/* Animated Progress Bar */}
                            <div className="mb-4">
                              <div className="flex items-center justify-between mb-1.5">
                                <span className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Progresso</span>
                                <span className="text-xs font-bold text-slate-900 dark:text-dark-text">{item.progresso}%</span>
                              </div>
                              <div className="w-full bg-slate-200 dark:bg-white/10 rounded-full h-1.5 overflow-hidden">
                                <motion.div 
                                  initial={{ width: 0 }}
                                  animate={{ width: `${item.progresso}%` }}
                                  transition={{ duration: 1, ease: "easeOut" }}
                                  className={`h-full rounded-full ${getProgressBarColor(item.progresso)}`}
                                ></motion.div>
                              </div>
                            </div>

                            <div className="flex items-center justify-between mb-3 pt-2 border-t border-slate-200 dark:border-white/10">
                              <h5 className="text-xs font-bold text-dark-text uppercase tracking-wider">Etapas ({item.etapas.filter(e => e.concluida).length}/{item.etapas.length})</h5>
                            </div>
                            
                            {item.etapas.length > 0 ? (
                              <div className="space-y-2">
                                {item.etapas.map((etapa, idx) => (
                                  <label key={etapa.id || idx} className="flex items-start gap-3 p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-lg cursor-pointer transition-colors group/chk">
                                    <div className="relative flex items-center justify-center w-5 h-5 mt-0.5 shrink-0">
                                      <input 
                                        type="checkbox"
                                        checked={etapa.concluida}
                                        onChange={() => etapa.id && handleToggleEtapa(item.id, etapa.id, etapa.concluida)}
                                        className="peer appearance-none w-5 h-5 border-2 border-[#555] rounded hover:border-[#7F77DD] checked:bg-[#7F77DD] checked:border-[#7F77DD] transition-all cursor-pointer"
                                      />
                                      <Check size={12} className="absolute text-white dark:text-dark-text opacity-0 peer-checked:opacity-100 pointer-events-none" />
                                    </div>
                                    <span className={`text-sm select-none transition-colors ${etapa.concluida ? 'text-slate-400 dark:text-slate-500 line-through' : 'text-dark-text group-hover/chk:text-slate-900 dark:group-hover/chk:text-white'}`}>
                                      {etapa.titulo}
                                    </span>
                                  </label>
                                ))}
                              </div>
                            ) : (
                              <p className="text-xs text-slate-400 dark:text-slate-500 italic">Nenhuma etapa cadastrada.</p>
                            )}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Footer */}
                <div className="px-5 py-3 border-t border-slate-200 dark:border-white/5 bg-slate-50 dark:bg-white/[0.01] flex items-center justify-between">
                  <span className="text-[10px] font-semibold text-slate-400 dark:text-slate-500">
                    Criado em: {new Date(item.criado_em).toLocaleDateString('pt-BR')}
                  </span>
                  
                  {isAdmin && (
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button onClick={() => { setEditingItem(item); setModalOpen(true); }} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-[#7F77DD] hover:bg-[#7F77DD]/10 rounded-lg transition-colors"><Edit2 size={14} /></button>
                      <button onClick={() => handleDelete(item.id)} className="p-1.5 text-slate-500 dark:text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"><Trash2 size={14} /></button>
                    </div>
                  )}
                </div>
              </motion.div>
            );
          })}
        </motion.div>
      )}

      {/* Modal */}
      {modalOpen && editingItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 dark:bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
          <div className="bg-slate-50 dark:bg-dark-bg w-full max-w-xl rounded-2xl shadow-2xl flex flex-col border border-slate-200 dark:border-white/10 overflow-hidden max-h-[90vh] animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-200 dark:border-white/10">
              <h2 className="text-lg font-bold text-white dark:text-dark-text">
                {editingItem.id ? 'Editar Ação de PDI' : 'Nova Ação de PDI'}
              </h2>
              <button onClick={() => setModalOpen(false)} className="p-2 hover:bg-slate-100 dark:hover:bg-white/5 rounded-xl text-slate-500 dark:text-slate-400 hover:text-dark-text transition-colors">
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSave} className="p-6 space-y-5 overflow-y-auto custom-scrollbar">
              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Título *</label>
                <input 
                  autoFocus required
                  value={editingItem.titulo || ''} 
                  onChange={e => setEditingItem({...editingItem, titulo: e.target.value})}
                  className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-white dark:text-dark-text focus:outline-none focus:border-[#7F77DD]"
                  placeholder="Ex: Curso de Liderança"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Tipo *</label>
                  <OptionPicker
                    value={editingItem.tipo || 'Técnico'}
                    onChange={(val) => setEditingItem({...editingItem, tipo: (val || 'Técnico') as any})}
                    options={[
                      { label: 'Curso' },
                      { label: 'Prática' },
                      { label: 'Técnico' },
                      { label: 'Comportamental' },
                    ]}
                    placeholder="Tipo"
                    className="w-full"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Prazo</label>
                  <input 
                    type="date"
                    value={editingItem.prazo ? editingItem.prazo.split('T')[0] : ''} 
                    onChange={e => setEditingItem({...editingItem, prazo: e.target.value})}
                    className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-white dark:text-dark-text focus:outline-none focus:border-[#7F77DD]"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Descrição</label>
                <textarea 
                  value={editingItem.descricao || ''} 
                  onChange={e => setEditingItem({...editingItem, descricao: e.target.value})}
                  rows={2}
                  className="w-full bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-xl px-4 py-2.5 text-sm text-white dark:text-dark-text focus:outline-none focus:border-[#7F77DD]"
                  placeholder="Detalhes sobre a ação..."
                />
              </div>

              {/* Checklist Section */}
              <div className="pt-2 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 uppercase">Etapas do Checklist</label>
                  <button 
                    type="button" 
                    onClick={() => {
                      const novasEtapas = [...(editingItem.etapas || []), { titulo: '', concluida: false }];
                      setEditingItem({...editingItem, etapas: novasEtapas});
                    }}
                    className="text-xs font-bold text-[#7F77DD] hover:text-[#9b94ee] flex items-center gap-1"
                  >
                    <Plus size={12} /> Adicionar Etapa
                  </button>
                </div>
                
                <div className="space-y-2">
                  {(editingItem.etapas || []).map((etapa, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <div className="w-5 h-5 flex items-center justify-center shrink-0">
                        {etapa.concluida ? <Check size={14} className="text-[#5DCAA5]" /> : <div className="w-1.5 h-1.5 rounded-full bg-[#555]"></div>}
                      </div>
                      <input 
                        required
                        value={etapa.titulo}
                        onChange={(e) => {
                          const novasEtapas = [...(editingItem.etapas || [])];
                          novasEtapas[idx].titulo = e.target.value;
                          setEditingItem({...editingItem, etapas: novasEtapas});
                        }}
                        className="flex-1 bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-lg px-3 py-1.5 text-sm text-white dark:text-dark-text focus:outline-none focus:border-[#7F77DD]"
                        placeholder="Nome da etapa..."
                      />
                      <button 
                        type="button"
                        onClick={() => {
                          const novasEtapas = [...(editingItem.etapas || [])];
                          novasEtapas.splice(idx, 1);
                          setEditingItem({...editingItem, etapas: novasEtapas});
                        }}
                        className="p-1.5 text-slate-400 dark:text-slate-500 hover:text-rose-500 rounded-md transition-colors"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                  {(!editingItem.etapas || editingItem.etapas.length === 0) && (
                    <p className="text-xs text-slate-400 dark:text-slate-500 py-2 text-center border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                      Nenhuma etapa adicionada. O card ficará sem checklist.
                    </p>
                  )}
                </div>
              </div>

              {editingItem.id && (
                <div>
                  <label className="block text-xs font-bold text-slate-500 dark:text-slate-400 mb-1.5 uppercase">Status</label>
                  <OptionPicker
                    value={editingItem.status || 'Em andamento'}
                    onChange={(val) => setEditingItem({...editingItem, status: (val || 'Em andamento') as any})}
                    options={[
                      { label: 'Em andamento', color: '#f59e0b' },
                      { label: 'Concluído', color: '#22c55e' },
                      { label: 'Pausado', color: '#94a3b8' },
                    ]}
                    placeholder="Status"
                    className="w-full"
                  />
                  <p className="text-[10px] text-slate-400 dark:text-slate-500 mt-1">* O status pode ser atualizado automaticamente caso todas as etapas sejam concluídas.</p>
                </div>
              )}

              <div className="pt-4 flex justify-end gap-3 border-t border-slate-200 dark:border-white/10">
                <button type="button" onClick={() => setModalOpen(false)} className="px-4 py-2 text-sm font-bold text-slate-500 dark:text-slate-400 hover:text-dark-text transition-colors">
                  Cancelar
                </button>
                <button type="submit" className="bg-[#7F77DD] hover:bg-[#6b64c4] text-white dark:text-dark-text px-6 py-2 rounded-xl text-sm font-bold flex items-center gap-2 transition-colors">
                  <Check size={16} /> Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
