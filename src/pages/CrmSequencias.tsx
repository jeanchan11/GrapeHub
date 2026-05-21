import React, { useState, useEffect } from 'react';
import { 
  ChevronLeft, Plus, Edit2, Trash2, 
  CheckSquare, Save, Play, Info,
  MessageCircle, Phone, Mail, Calendar as CalendarIcon, CheckCircle2,
  X
} from 'lucide-react';

const SEQ_TYPE_COLOR: any = {
  'WhatsApp': 'text-emerald-600 dark:text-emerald-500',
  'Ligação': 'text-blue-600 dark:text-blue-500',
  'Email': 'text-violet-600 dark:text-violet-500',
  'Reunião': 'text-orange-600 dark:text-orange-500',
  'Tarefa': 'text-slate-600 dark:text-slate-400',
};

const SEQ_TYPE_ICON: any = {
  'WhatsApp': <MessageCircle size={14} />,
  'Ligação': <Phone size={14} />,
  'Email': <Mail size={14} />,
  'Reunião': <CalendarIcon size={14} />,
  'Tarefa': <CheckCircle2 size={14} />
};

const CrmSequencias = () => {
  const [sequences, setSequences] = useState<any[]>([]);
  const [seqMode, setSeqMode] = useState<'list'|'form'>('list');
  const [seqEditId, setSeqEditId] = useState<string | null>(null);
  const [seqForm, setSeqForm] = useState({ name: '', description: '', skip_weekends: true, steps: [] as any[] });
  const [savingSequence, setSavingSequence] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);

  useEffect(() => {
    fetchSequences();
  }, []);

  const fetchSequences = async () => {
    try {
      const res = await fetch('/api/crm-comercial/sequences/all');
      if (res.ok) {
        setSequences(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveSequence = async () => {
    if (!seqForm.name) return alert('Dê um nome à sequência.');
    setSavingSequence(true);
    try {
      const url = seqEditId ? `/api/crm-comercial/sequences/${seqEditId}` : '/api/crm-comercial/sequences';
      const method = seqEditId ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(seqForm)
      });
      if (res.ok) {
        fetchSequences();
        setSeqMode('list');
        setSeqEditId(null);
        setSelectedStepIndex(null);
      } else {
        alert('Erro ao salvar sequência.');
      }
    } catch (e) {
      console.error(e);
    }
    setSavingSequence(false);
  };

  const handleDeleteSequence = async (id: string) => {
    if (!confirm('Deseja excluir esta sequência?')) return;
    try {
      await fetch(`/api/crm-comercial/sequences/${id}`, { method: 'DELETE' });
      fetchSequences();
    } catch (e) {
      console.error(e);
    }
  };

  const handleSeqAction = (index: number, field: string, value: any) => {
    const s = [...seqForm.steps];
    s[index] = { ...s[index], [field]: value };
    setSeqForm(prev => ({ ...prev, steps: s }));
  };

  const moveStep = (index: number, direction: -1 | 1) => {
    const s = [...seqForm.steps];
    if (index + direction < 0 || index + direction >= s.length) return;
    const temp = s[index];
    s[index] = s[index + direction];
    s[index + direction] = temp;
    setSeqForm(prev => ({ ...prev, steps: s }));
    
    // Adjust selection
    if (selectedStepIndex === index) {
      setSelectedStepIndex(index + direction);
    } else if (selectedStepIndex === index + direction) {
      setSelectedStepIndex(index);
    }
  };

  const addStep = (index: number) => {
    const s = [...seqForm.steps];
    s.splice(index, 0, { day_offset: 1, type: 'WhatsApp', title: 'Nova atividade', observations: '' });
    setSeqForm(prev => ({ ...prev, steps: s }));
    setSelectedStepIndex(index); // Auto select the new step
  };

  const deleteStep = (index: number) => {
    const s = [...seqForm.steps];
    s.splice(index, 1);
    setSeqForm(prev => ({ ...prev, steps: s }));
    if (selectedStepIndex === index) {
      setSelectedStepIndex(null);
    } else if (selectedStepIndex !== null && selectedStepIndex > index) {
      setSelectedStepIndex(selectedStepIndex - 1);
    }
  };

  return (
    <div className={`h-full bg-light-bg dark:bg-[#0A0A0A] ${seqMode === 'list' ? 'p-4 md:p-8 overflow-y-auto' : 'flex flex-col overflow-hidden p-4 md:p-6 pb-0'}`}>
      {/* HEADER LIST */}
      {seqMode === 'list' && (
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-white text-3xl font-bold flex items-center gap-2">
              CRM <span className="text-violet-500">Sequências</span>
            </h1>
            <p className="text-gray-400 text-sm mt-1">Modelos de atividades automáticas para follow-up.</p>
          </div>
        </div>
      )}

      {seqMode === 'list' ? (
        <div className="max-w-4xl bg-white dark:bg-[#13111a] border border-gray-200 dark:border-[#2d2b3d] rounded-2xl p-6 shadow-sm">
          {/* Header List */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h3 className="text-lg font-bold text-gray-900 dark:text-white">Sequências de Cadência</h3>
            </div>
            <button
              onClick={() => { setSeqEditId(null); setSeqForm({ name: 'Nova Sequência', description: '', skip_weekends: true, steps: [] }); setSelectedStepIndex(null); setSeqMode('form'); }}
              className="flex items-center gap-1.5 px-4 py-2.5 bg-violet-600 hover:bg-violet-700 text-white text-sm font-bold rounded-xl transition-all"
            >
              <Plus size={16} /> Nova Sequência
            </button>
          </div>

          {/* List */}
          {sequences.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-4 text-center border border-dashed border-gray-300 dark:border-white/10 rounded-2xl">
              <div className="w-16 h-16 rounded-2xl flex items-center justify-center bg-violet-500/10 border border-violet-500/20 text-violet-500">
                <span className="text-3xl">⚡</span>
              </div>
              <p className="text-gray-500 dark:text-slate-500">Nenhuma sequência criada ainda.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {sequences.map(seq => (
                <div key={seq.id} className="rounded-xl p-5 bg-gray-50 dark:bg-white/5 border border-gray-200 dark:border-white/10 hover:border-violet-500/40 transition-all flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-900 dark:text-white text-base truncate">{seq.name}</p>
                    <p className="text-sm text-gray-500 dark:text-slate-500 mt-1">{seq.steps?.length || 0} {seq.steps?.length === 1 ? 'passo' : 'passos'}</p>
                    {seq.steps?.length > 0 && (
                      <div className="flex flex-wrap gap-2 mt-3">
                        {[...new Set(seq.steps.map((s: any) => s.type))].map((type: any) => (
                          <span key={type} className={`px-2.5 py-1 rounded-full text-xs font-bold ${SEQ_TYPE_COLOR[type] ? 'bg-slate-500/10 ' + SEQ_TYPE_COLOR[type] : 'bg-slate-500/20 text-slate-600 dark:text-slate-400'}`}>
                            {type}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => { setSeqEditId(seq.id); setSeqForm({ name: seq.name, description: seq.description || '', skip_weekends: seq.skip_weekends, steps: seq.steps || [] }); setSelectedStepIndex(null); setSeqMode('form'); }}
                      className="px-4 py-2 rounded-lg text-sm font-bold text-violet-600 dark:text-violet-400 border border-violet-500/30 hover:bg-violet-500/10 transition-all flex items-center gap-2"
                    >
                      <Edit2 size={14} /> Editar
                    </button>
                    <button onClick={() => handleDeleteSequence(seq.id)} className="w-9 h-9 rounded-lg flex items-center justify-center text-gray-400 dark:text-slate-500 hover:text-red-500 hover:bg-red-500/10 transition-all">
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      ) : (
        /* ── BUILDER CANVAS ── */
        <div className="flex-1 flex flex-col lg:flex-row gap-6 min-h-0 pb-4 md:pb-6">
          
          {/* Canvas Area */}
          <div className="flex-1 flex flex-col bg-gray-50/50 dark:bg-[#0a0a0a]/50 rounded-2xl border border-gray-200 dark:border-white/10 overflow-hidden relative shadow-sm">
            {/* Toolbar */}
            <div className="flex items-center justify-between p-4 bg-white dark:bg-[#13111a] border-b border-gray-200 dark:border-white/10 shrink-0 z-20 shadow-sm">
              <div className="flex items-center gap-3">
                <button onClick={() => { setSeqMode('list'); setSeqEditId(null); setSelectedStepIndex(null); }} className="w-8 h-8 rounded-lg flex items-center justify-center text-gray-500 dark:text-slate-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-white/10 transition-all">
                  <ChevronLeft size={18} />
                </button>
                <div className="flex flex-col">
                  <p className="text-[10px] uppercase font-bold text-gray-400 tracking-widest">{seqEditId ? 'Editando Sequência' : 'Nova Sequência'}</p>
                  <p className="font-bold text-gray-900 dark:text-white text-sm truncate max-w-[200px] md:max-w-[400px]">{seqForm.name || 'Sem título'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <button onClick={handleSaveSequence} disabled={savingSequence} className="px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-xl transition-all flex items-center gap-2 shadow-sm shadow-emerald-500/20">
                  <Save size={16} /> {savingSequence ? 'Salvando...' : 'Salvar'}
                </button>
              </div>
            </div>

            {/* Flow Editor */}
            <div className="flex-1 overflow-y-auto p-8 relative flex flex-col items-center" onClick={(e) => { if (e.target === e.currentTarget) setSelectedStepIndex(null); }}>
              {/* Dots background */}
              <div className="absolute inset-0 opacity-[0.05] pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #000 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              <div className="absolute inset-0 opacity-[0.03] dark:opacity-100 hidden dark:block pointer-events-none" style={{ backgroundImage: 'radial-gradient(circle at center, #fff 1px, transparent 1px)', backgroundSize: '24px 24px' }} />
              
              {/* START NODE */}
              <div 
                onClick={(e) => { e.stopPropagation(); setSelectedStepIndex(null); }}
                className={`w-full max-w-[400px] shrink-0 bg-white dark:bg-[#13111a] border rounded-xl shadow-sm relative z-10 flex flex-col overflow-hidden cursor-pointer transition-all ${selectedStepIndex === null ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-gray-200 dark:border-white/10 hover:border-gray-300 dark:hover:border-white/20'}`}
              >
                <div className="h-1.5 bg-emerald-500 w-full" />
                <div className="px-5 py-4">
                  <p className="text-[10px] font-bold text-emerald-600 dark:text-emerald-500 uppercase tracking-widest flex items-center gap-1.5 mb-1"><Play size={10} className="fill-current" /> Iniciar</p>
                  <p className="text-sm font-bold text-gray-900 dark:text-white">Negócio adicionado à sequência</p>
                </div>
              </div>

              {/* FIRST CONNECTOR */}
              <div className="relative w-full h-16 flex justify-center z-0 shrink-0">
                <div className="w-px h-full bg-gray-300 dark:bg-white/20"></div>
                <button 
                  onClick={() => addStep(0)}
                  className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-[#13111a] border border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500 hover:scale-110 transition-all z-10 shadow-sm"
                  title="Adicionar etapa"
                >
                  <Plus size={14} />
                </button>
              </div>

              {seqForm.steps.map((step, idx) => {
                const cumDays = seqForm.steps.slice(0, idx + 1).reduce((acc, curr) => acc + (curr.day_offset || 0), 0);
                const isSelected = selectedStepIndex === idx;

                return (
                  <React.Fragment key={idx}>
                    {/* STEP CARD */}
                    <div 
                      onClick={(e) => { e.stopPropagation(); setSelectedStepIndex(idx); }}
                      className={`w-full max-w-[400px] shrink-0 bg-white dark:bg-[#13111a] border rounded-xl shadow-sm relative z-10 group flex flex-col transition-all cursor-pointer ${isSelected ? 'border-violet-500 ring-2 ring-violet-500/20' : 'border-gray-200 dark:border-white/10 hover:border-violet-500/30 hover:shadow-violet-500/5'}`}
                    >
                      
                      {/* Hover Actions (Desktop) */}
                      <div className="absolute -right-12 top-1/2 -translate-y-1/2 flex-col gap-1 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex">
                        <button onClick={(e) => { e.stopPropagation(); deleteStep(idx); }} className="w-8 h-8 rounded-lg bg-white dark:bg-[#13111a] border border-gray-200 dark:border-white/10 text-gray-400 hover:text-red-500 hover:border-red-500/30 flex items-center justify-center shadow-sm transition-colors"><Trash2 size={14} /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveStep(idx, -1); }} disabled={idx === 0} className="w-8 h-8 rounded-lg bg-white dark:bg-[#13111a] border border-gray-200 dark:border-white/10 text-gray-400 hover:text-violet-500 disabled:opacity-30 flex items-center justify-center shadow-sm transition-colors"><ChevronLeft size={14} className="rotate-90" /></button>
                        <button onClick={(e) => { e.stopPropagation(); moveStep(idx, 1); }} disabled={idx === seqForm.steps.length - 1} className="w-8 h-8 rounded-lg bg-white dark:bg-[#13111a] border border-gray-200 dark:border-white/10 text-gray-400 hover:text-violet-500 disabled:opacity-30 flex items-center justify-center shadow-sm transition-colors"><ChevronLeft size={14} className="-rotate-90" /></button>
                      </div>

                      {/* Header (DIA X | ⌛ 1 dia) */}
                      <div className="px-5 py-2.5 border-b border-gray-100 dark:border-white/5 bg-gray-50/50 dark:bg-white/[0.02] flex items-center justify-between rounded-t-xl">
                        <span className="text-[10px] font-bold text-gray-500 dark:text-slate-400 uppercase tracking-widest bg-gray-200/50 dark:bg-white/10 px-2 py-0.5 rounded">Dia {cumDays}</span>
                        <div className="flex items-center gap-1.5 text-[11px] font-semibold text-gray-500 dark:text-gray-400">
                          <span>⌛</span>
                          <span>{step.day_offset} {step.day_offset === 1 ? 'dia' : 'dias'}</span>
                        </div>
                      </div>

                      {/* Body View Mode */}
                      <div className="p-5">
                        <div className="flex items-center gap-2 mb-1 text-gray-900 dark:text-white font-bold text-sm">
                          <span className={`${SEQ_TYPE_COLOR[step.type] || 'text-gray-500'}`}>
                            {SEQ_TYPE_ICON[step.type] || <CheckSquare size={14} />}
                          </span>
                          <span>{step.type || 'Ação'}</span>
                        </div>
                        <p className="text-xs text-gray-500 dark:text-slate-400 ml-6 truncate">{step.title || 'Sem título'}</p>
                      </div>
                    </div>

                    {/* CONNECTOR */}
                    <div className="relative w-full h-16 flex justify-center z-0 shrink-0">
                      <div className="w-px h-full bg-gray-300 dark:bg-white/20"></div>
                      <button 
                        onClick={() => addStep(idx + 1)}
                        className="absolute top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white dark:bg-[#13111a] border border-gray-300 dark:border-white/20 flex items-center justify-center text-gray-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500 hover:scale-110 transition-all z-10 shadow-sm"
                        title="Adicionar etapa"
                      >
                        <Plus size={14} />
                      </button>
                    </div>
                  </React.Fragment>
                );
              })}
              
              <div className="h-24 shrink-0" />
            </div>
          </div>

          {/* Config Sidebar */}
          <div className="w-full lg:w-80 shrink-0 flex flex-col gap-4">
            
            {selectedStepIndex === null ? (
              /* GLOBAL SETTINGS SIDEBAR */
              <div className="bg-white dark:bg-[#13111a] border border-gray-200 dark:border-[#2d2b3d] rounded-2xl p-5 shadow-sm space-y-5 animate-in fade-in slide-in-from-right-4">
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-gray-500 dark:text-slate-500">Sequência Geral</h4>
                </div>

                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-slate-400 block mb-1.5">Nome da Sequência</label>
                  <input type="text" value={seqForm.name} onChange={e => setSeqForm(f => ({ ...f, name: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-sm font-bold focus:outline-none focus:border-violet-500/60"
                    placeholder="Ex: Follow-up 5 dias" />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-slate-400 block mb-2">Descrição</label>
                  <textarea value={seqForm.description} onChange={e => setSeqForm(f => ({ ...f, description: e.target.value }))}
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 text-gray-900 dark:text-white text-xs focus:outline-none focus:border-violet-500/60 resize-none h-24"
                    placeholder="Objetivo dessa sequência..." />
                </div>
                
                <div>
                  <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-slate-400 block mb-3">Dias da Semana</label>
                  <label className="flex items-center gap-3 cursor-pointer select-none group p-2 -mx-2 hover:bg-gray-50 dark:hover:bg-white/5 rounded-lg transition-colors">
                    <div className={`w-10 h-5 rounded-full relative transition-all shadow-inner ${seqForm.skip_weekends ? 'bg-violet-600' : 'bg-gray-300 dark:bg-white/10'}`}>
                      <span className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${seqForm.skip_weekends ? 'translate-x-5' : 'translate-x-0.5'}`} />
                    </div>
                    <div className="flex-1">
                      <p className="text-[13px] font-bold text-gray-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">Pular sáb/dom</p>
                      <p className="text-[10px] text-gray-500 mt-0.5 leading-tight">Pausar envios aos fins de semana</p>
                    </div>
                  </label>
                </div>

                <div className="bg-violet-50 dark:bg-violet-500/10 border border-violet-200 dark:border-violet-500/20 rounded-xl p-4 mt-6">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-violet-700 dark:text-violet-400 mb-2 flex items-center gap-1.5"><Info size={12}/> Dica</h4>
                  <p className="text-xs leading-relaxed text-violet-800/80 dark:text-violet-300/80 font-medium">
                    Para editar os detalhes de um passo específico (como WhatsApp ou Ligação), clique no card dele no centro da tela.
                  </p>
                </div>
              </div>

            ) : (

              /* STEP SETTINGS SIDEBAR */
              <div className="bg-white dark:bg-[#13111a] border border-violet-500 ring-2 ring-violet-500/20 rounded-2xl p-5 shadow-sm space-y-5 animate-in fade-in slide-in-from-right-4 relative">
                <button onClick={() => setSelectedStepIndex(null)} className="absolute top-4 right-4 w-6 h-6 flex items-center justify-center bg-gray-100 dark:bg-white/5 hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 rounded-md transition-colors">
                  <X size={14} />
                </button>
                <div className="flex items-center justify-between border-b border-gray-100 dark:border-white/10 pb-3 pr-8">
                  <h4 className="text-[11px] font-bold uppercase tracking-widest text-violet-600 dark:text-violet-400">Configuração da Etapa {selectedStepIndex + 1}</h4>
                </div>

                {seqForm.steps[selectedStepIndex] && (
                  <>
                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-[#0a0a0a] rounded-xl border border-gray-200 dark:border-white/10">
                      <span className="text-[11px] font-bold text-gray-500 uppercase tracking-widest shrink-0">Espera</span>
                      <div className="flex items-center gap-2 flex-1">
                        <input 
                          type="number" 
                          min="0" 
                          value={seqForm.steps[selectedStepIndex].day_offset} 
                          onChange={e => handleSeqAction(selectedStepIndex, 'day_offset', parseInt(e.target.value) || 0)}
                          className="w-14 bg-white dark:bg-[#13111a] border border-gray-200 dark:border-white/10 rounded-lg px-2 py-1.5 text-sm font-bold text-center text-gray-900 dark:text-white focus:outline-none focus:border-violet-500" 
                        />
                        <span className="text-xs font-semibold text-gray-500">dia(s) após o anterior</span>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-slate-400 block mb-1.5">Tipo de Atividade</label>
                      <div className="relative">
                        <select 
                          value={seqForm.steps[selectedStepIndex].type} 
                          onChange={e => handleSeqAction(selectedStepIndex, 'type', e.target.value)}
                          className={`w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-9 py-2.5 text-sm font-bold appearance-none focus:outline-none focus:border-violet-500 transition-colors cursor-pointer ${SEQ_TYPE_COLOR[seqForm.steps[selectedStepIndex].type] || 'text-gray-900 dark:text-white'}`}
                        >
                          <option value="WhatsApp">WhatsApp</option>
                          <option value="Ligação">Ligação</option>
                          <option value="Email">Email</option>
                          <option value="Reunião">Reunião</option>
                          <option value="Tarefa">Tarefa genérica</option>
                        </select>
                        <div className={`absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none ${SEQ_TYPE_COLOR[seqForm.steps[selectedStepIndex].type] || 'text-gray-500'}`}>
                          {SEQ_TYPE_ICON[seqForm.steps[selectedStepIndex].type] || <CheckSquare size={16} />}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-slate-400 block mb-1.5">Ação / Resumo</label>
                      <input 
                        type="text" 
                        value={seqForm.steps[selectedStepIndex].title} 
                        onChange={e => handleSeqAction(selectedStepIndex, 'title', e.target.value)}
                        className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-sm font-bold text-gray-900 dark:text-white focus:outline-none focus:border-violet-500 placeholder:text-gray-400 dark:placeholder:text-slate-600" 
                        placeholder="Ex: Enviar mensagem de apresentação..." 
                      />
                    </div>
                    
                    <div>
                      <label className="text-[10px] font-bold uppercase tracking-widest text-gray-600 dark:text-slate-400 block mb-1.5 flex items-center justify-between">
                        <span>Descrição / Roteiro</span>
                        <span className="text-[9px] text-gray-400 bg-gray-100 dark:bg-white/5 px-1.5 py-0.5 rounded">Opcional</span>
                      </label>
                      <textarea 
                        value={seqForm.steps[selectedStepIndex].observations || ''} 
                        onChange={e => handleSeqAction(selectedStepIndex, 'observations', e.target.value)} 
                        rows={4}
                        className="w-full bg-gray-50 dark:bg-[#0a0a0a] border border-gray-200 dark:border-white/10 rounded-xl px-3 py-2.5 text-xs text-gray-700 dark:text-gray-300 focus:outline-none focus:border-violet-500 resize-none placeholder:text-gray-400 dark:placeholder:text-slate-600" 
                        placeholder="Adicione um script, template de mensagem ou notas para quem for executar a tarefa..." 
                      />
                    </div>
                    
                    {/* Mobile Delete Button - only visible on small screens since desktop has hover delete on card */}
                    <div className="pt-4 mt-4 border-t border-gray-100 dark:border-white/10 md:hidden">
                      <button 
                        onClick={() => deleteStep(selectedStepIndex)}
                        className="w-full py-2.5 bg-red-50 dark:bg-red-500/10 text-red-500 font-bold text-sm rounded-xl hover:bg-red-100 dark:hover:bg-red-500/20 transition-colors flex items-center justify-center gap-2"
                      >
                        <Trash2 size={14} /> Excluir esta etapa
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            
          </div>
        </div>
      )}
    </div>
  );
};

export default CrmSequencias;
