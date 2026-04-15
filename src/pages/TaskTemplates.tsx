import React, { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Save, X, ListTodo, ChevronDown, ChevronRight } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from '../components/ui/Modal';
import { designSystem } from '../design-system';

interface TemplateItem {
  id: number;
  template_id: number;
  title: string;
  parent_item_id: number | null;
  assignee: string | null;
  due_days_offset: number;
  order_index: number;
}

interface Template {
  id: number;
  name: string;
  description: string;
  created_by: string;
  items: TemplateItem[];
}

const TaskTemplates = () => {
  const { userData } = useAuth();
  const [templates, setTemplates] = useState<Template[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<Template | null>(null);
  
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [items, setItems] = useState<any[]>([]);

  const fetchTemplates = async () => {
    try {
      const res = await fetch('/api/task-templates');
      if (res.ok) {
        setTemplates(await res.json());
      }
    } catch (err) {
      console.error('Error fetching templates:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTemplates();
  }, []);

  const handleOpenModal = (template?: Template) => {
    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setDescription(template.description || '');
      setItems(template.items || []);
    } else {
      setEditingTemplate(null);
      setName('');
      setDescription('');
      setItems([]);
    }
    setIsModalOpen(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingTemplate ? `/api/task-templates/${editingTemplate.id}` : '/api/task-templates';
      const method = editingTemplate ? 'PUT' : 'POST';
      
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          created_by: userData?.id,
          items
        })
      });

      if (res.ok) {
        setIsModalOpen(false);
        fetchTemplates();
      } else {
        alert('Erro ao salvar modelo');
      }
    } catch (err) {
      console.error('Error saving template:', err);
      alert('Erro ao salvar modelo');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Tem certeza que deseja excluir este modelo?')) return;
    try {
      const res = await fetch(`/api/task-templates/${id}`, { method: 'DELETE' });
      if (res.ok) {
        fetchTemplates();
      } else {
        alert('Erro ao excluir modelo');
      }
    } catch (err) {
      console.error('Error deleting template:', err);
      alert('Erro ao excluir modelo');
    }
  };

  const handleDuplicate = async (template: Template) => {
    try {
      const res = await fetch('/api/task-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${template.name} (Cópia)`,
          description: template.description,
          created_by: userData?.id,
          items: template.items
        })
      });

      if (res.ok) {
        fetchTemplates();
      } else {
        alert('Erro ao duplicar modelo');
      }
    } catch (err) {
      console.error('Error duplicating template:', err);
      alert('Erro ao duplicar modelo');
    }
  };

  const handleAddItem = (parentId: number | null = null) => {
    const newItem = {
      id: Date.now(), // temporary ID
      title: '',
      parent_item_id: parentId,
      assignee: 'all',
      due_days_offset: 0
    };
    setItems([...items, newItem]);
  };

  const handleUpdateItem = (id: number, field: string, value: any) => {
    setItems(items.map(item => item.id === id ? { ...item, [field]: value } : item));
  };

  const handleRemoveItem = (id: number) => {
    // Remove item and its children
    setItems(items.filter(item => item.id !== id && item.parent_item_id !== id));
  };

  if (loading) {
    return <div className="p-8 text-center text-slate-500">Carregando modelos...</div>;
  }

  return (
    <div className="p-8 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-4xl font-black text-light-text dark:text-white tracking-tight mb-1">
            Modelos de <span className="text-violet-500">Tarefa</span>
          </h1>
          <p className="text-slate-500 text-sm">Crie e gerencie templates de tarefas e subtarefas para aplicar em projetos.</p>
        </div>
        <button
          onClick={() => handleOpenModal()}
          className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold flex items-center gap-2 transition-colors"
        >
          <Plus size={20} />
          Novo Modelo
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {templates.map(template => (
          <div key={template.id} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl p-6">
            <h3 className="text-lg font-bold text-light-text dark:text-white mb-2">{template.name}</h3>
            <p className="text-sm text-slate-500 mb-4 h-10 line-clamp-2">{template.description}</p>
            
            <div className="flex items-center justify-between text-sm text-slate-400 mb-6">
              <span>{template.items?.length || 0} itens</span>
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleOpenModal(template)}
                className="flex-1 py-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
              >
                <Edit2 size={16} />
                Editar
              </button>
              <button
                onClick={() => handleDuplicate(template)}
                className="p-2 bg-slate-100 dark:bg-white/5 hover:bg-slate-200 dark:hover:bg-white/10 text-slate-600 dark:text-slate-300 rounded-xl font-bold transition-colors flex items-center justify-center"
                title="Duplicar"
              >
                <Plus size={16} />
              </button>
              <button
                onClick={() => handleDelete(template.id)}
                className="p-2 bg-rose-100 dark:bg-rose-500/10 hover:bg-rose-200 dark:hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 rounded-xl font-bold transition-colors flex items-center justify-center"
                title="Excluir"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        ))}
        
        {templates.length === 0 && (
          <div className="col-span-full text-center py-20 bg-white dark:bg-dark-card border border-dashed border-slate-200 dark:border-white/10 rounded-3xl">
            <ListTodo size={48} className="mx-auto text-slate-300 mb-4" />
            <h3 className="text-xl font-bold text-light-text dark:text-white mb-2">Nenhum modelo criado</h3>
            <p className="text-slate-500 mb-6">Crie seu primeiro modelo de tarefas para padronizar processos.</p>
            <button
              onClick={() => handleOpenModal()}
              className="px-6 py-3 bg-violet-500 hover:bg-violet-600 text-white rounded-xl font-bold inline-flex items-center gap-2 transition-colors"
            >
              <Plus size={20} />
              Criar Modelo
            </button>
          </div>
        )}
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={editingTemplate ? 'Editar Modelo' : 'Novo Modelo'}
        maxWidth="max-w-3xl"
        footer={
          <>
            <button
              type="button"
              onClick={() => setIsModalOpen(false)}
              className={designSystem.button.secondary}
            >
              Cancelar
            </button>
            <button
              type="submit"
              form="template-form"
              className={designSystem.button.primary}
            >
              <Save size={18} />
              Salvar Modelo
            </button>
          </>
        }
      >
        <div className="flex flex-col h-full">
          <div className="flex-1 overflow-y-auto pr-2">
            <form id="template-form" onSubmit={handleSave} className="space-y-6">
              <div className="space-y-4">
                <div>
                  <label className={designSystem.input.label}>Nome do Modelo</label>
                  <input
                    required
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    className={designSystem.input.field}
                  />
                </div>
                <div>
                  <label className={designSystem.input.label}>Descrição</label>
                  <textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    className={`${designSystem.input.field} min-h-[100px]`}
                  />
                </div>
              </div>

              <div className="pt-6 border-t border-slate-200 dark:border-white/10">
                <div className="flex items-center justify-between mb-4">
                  <label className={designSystem.input.label}>Tarefas do Modelo</label>
                  <button
                    type="button"
                    onClick={() => handleAddItem(null)}
                    className="text-xs font-bold text-violet-500 hover:text-violet-600 flex items-center gap-1"
                  >
                    <Plus size={14} /> Adicionar Tarefa
                  </button>
                </div>

                <div className="space-y-4">
                  {items.filter(item => !item.parent_item_id).map((task, index) => (
                    <div key={task.id} className="bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/10 rounded-xl p-4">
                      <div className="flex gap-4 items-start">
                        <div className="flex-1 space-y-3">
                          <input
                            type="text"
                            placeholder="Título da tarefa..."
                            value={task.title}
                            onChange={(e) => handleUpdateItem(task.id, 'title', e.target.value)}
                            className={designSystem.input.field}
                            required
                          />
                          <div className="flex gap-3">
                            <div className="flex-1">
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Responsável Padrão</span>
                              <select
                                value={task.assignee || 'all'}
                                onChange={(e) => handleUpdateItem(task.id, 'assignee', e.target.value)}
                                className={designSystem.input.field}
                              >
                                <option value="all" className="bg-light-sidebar dark:bg-dark-sidebar">Qualquer um</option>
                                <option value="gestor" className="bg-light-sidebar dark:bg-dark-sidebar">Gestor de Tráfego</option>
                                <option value="closer" className="bg-light-sidebar dark:bg-dark-sidebar">Closer</option>
                                <option value="sdr" className="bg-light-sidebar dark:bg-dark-sidebar">SDR</option>
                              </select>
                            </div>
                            <div className="flex-1">
                              <span className="text-[10px] text-slate-500 uppercase tracking-widest mb-1 block">Prazo (Dias após criação)</span>
                              <input
                                type="number"
                                min="0"
                                value={task.due_days_offset}
                                onChange={(e) => handleUpdateItem(task.id, 'due_days_offset', parseInt(e.target.value) || 0)}
                                className={designSystem.input.field}
                              />
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(task.id)}
                          className="p-2 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>

                      {/* Subtasks */}
                      <div className="mt-4 pl-4 border-l-2 border-slate-200 dark:border-white/10 space-y-3">
                        {items.filter(item => item.parent_item_id === task.id).map(subtask => (
                          <div key={subtask.id} className="flex gap-3 items-start">
                            <div className="flex-1 flex gap-2">
                              <input
                                type="text"
                                placeholder="Título da subtarefa..."
                                value={subtask.title}
                                onChange={(e) => handleUpdateItem(subtask.id, 'title', e.target.value)}
                                className={designSystem.input.field}
                                required
                              />
                              <input
                                type="number"
                                min="0"
                                placeholder="Dias"
                                title="Dias após criação"
                                value={subtask.due_days_offset}
                                onChange={(e) => handleUpdateItem(subtask.id, 'due_days_offset', parseInt(e.target.value) || 0)}
                                className={`${designSystem.input.field} w-20`}
                              />
                            </div>
                            <button
                              type="button"
                              onClick={() => handleRemoveItem(subtask.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 rounded-lg transition-colors"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() => handleAddItem(task.id)}
                          className="text-[10px] font-bold text-slate-500 hover:text-violet-500 uppercase tracking-widest flex items-center gap-1"
                        >
                          <Plus size={12} /> Adicionar Subtarefa
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {items.filter(item => !item.parent_item_id).length === 0 && (
                    <div className="text-center py-8 text-slate-500 text-sm border border-dashed border-slate-200 dark:border-white/10 rounded-xl">
                      Nenhuma tarefa adicionada ao modelo.
                    </div>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default TaskTemplates;
