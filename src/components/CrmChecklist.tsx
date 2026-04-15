import React, { useState, useEffect } from 'react';
import { CheckCircle2, Circle, Plus, Trash2, Check } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

interface ChecklistItem {
  id: number;
  client_id: string;
  item: string;
  completed: boolean;
  completed_by?: string;
  completed_at?: string;
}

interface CrmChecklistProps {
  clientId: string;
  onCompleteExit: () => void;
}

const DEFAULT_ITEMS = [
  "COBRANÇA – Informar a Marvee para retirar do Asaas e Plataforma Marvee",
  "RETIRAR – Planilha Marvee Parceiros Ativos",
  "RETIRAR – Parceiros Ativos",
  "RETIRAR – Painel Gestor",
  "ARQUIVAR – Pasta Google Drive (Dentro de Operacional → Parceiros)",
  "ARQUIVAR – Pasta Google Data Studio",
  "ARQUIVAR – Contrato Authentique",
  "PAUSAR – Campanhas gerenciadas pela Grape Mídia",
  "SAIR – BM Facebook Ads (Pessoas e Parceiro All Grape Mídia) + Conta Google Ads",
  "DESATIVAR – LP dentro do WordPress",
  "DESATIVAR – CRM Padrão Grape",
  "RETIRAR – Planilha Acesso CRM",
  "RELATÓRIO DE SAÍDA (Motivos da Saída)",
  "FINALIZAR GRUPO"
];

const CrmChecklist: React.FC<CrmChecklistProps> = ({ clientId, onCompleteExit }) => {
  const { user } = useAuth();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [newItemText, setNewItemText] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);

  const fetchItems = async () => {
    try {
      const res = await fetch(`/api/crm-checklist?client_id=${clientId}`);
      if (res.ok) {
        const data: ChecklistItem[] = await res.json();
        
        // If no items exist for this client, create the default ones
        if (data.length === 0) {
          await createDefaultItems();
        } else {
          setItems(data);
          setIsLoading(false);
        }
      }
    } catch (err) {
      console.error("Error fetching checklist items:", err);
      setIsLoading(false);
    }
  };

  const createDefaultItems = async () => {
    try {
      const newItems = [];
      for (const itemText of DEFAULT_ITEMS) {
        const res = await fetch('/api/crm-checklist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ client_id: clientId, item: itemText })
        });
        if (res.ok) {
          newItems.push(await res.json());
        }
      }
      setItems(newItems);
    } catch (err) {
      console.error("Error creating default checklist items:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (clientId) {
      fetchItems();
    }
  }, [clientId]);

  const handleToggleItem = async (item: ChecklistItem) => {
    if (!user) return;
    
    const newCompletedState = !item.completed;
    const completedBy = newCompletedState ? (user.displayName || user.email) : null;
    const completedAt = newCompletedState ? new Date().toISOString() : null;

    // Optimistic update
    setItems(prev => prev.map(i => 
      i.id === item.id 
        ? { ...i, completed: newCompletedState, completed_by: completedBy || undefined, completed_at: completedAt || undefined } 
        : i
    ));

    try {
      await fetch(`/api/crm-checklist/${item.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          completed: newCompletedState,
          completed_by: completedBy,
          completed_at: completedAt
        })
      });
    } catch (err) {
      console.error("Error toggling checklist item:", err);
      // Revert on error
      fetchItems();
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemText.trim()) return;

    setIsAdding(true);
    try {
      const res = await fetch('/api/crm-checklist', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ client_id: clientId, item: newItemText.trim() })
      });
      
      if (res.ok) {
        const newItem = await res.json();
        setItems(prev => [...prev, newItem]);
        setNewItemText('');
      }
    } catch (err) {
      console.error("Error adding checklist item:", err);
    } finally {
      setIsAdding(false);
    }
  };

  const completedCount = items.filter(i => i.completed).length;
  const totalCount = items.length;
  const progressPercentage = totalCount === 0 ? 0 : Math.round((completedCount / totalCount) * 100);
  const isAllCompleted = totalCount > 0 && completedCount === totalCount;

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-4 border-violet-500/20 border-t-violet-500 rounded-full animate-spin"></div>
        <p className="text-slate-500 text-sm font-medium">Carregando checklist...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Progress Bar */}
      <div className="bg-white dark:bg-white/5 p-4 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm">
        <div className="flex items-center justify-between mb-2">
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Progresso da Saída</span>
          <span className="text-sm font-bold text-violet-600 dark:text-violet-400">{completedCount} de {totalCount} concluídos</span>
        </div>
        <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
          <div 
            className="h-full bg-violet-500 transition-all duration-500 ease-out"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="bg-white dark:bg-white/5 rounded-2xl border border-slate-200 dark:border-white/10 shadow-sm overflow-hidden">
        <div className="divide-y divide-slate-100 dark:divide-white/5">
          {items.map(item => (
            <div 
              key={item.id} 
              className={`p-4 flex items-start gap-3 transition-colors ${item.completed ? 'bg-slate-50/50 dark:bg-white/[0.02]' : 'hover:bg-slate-50 dark:hover:bg-white/[0.02]'}`}
            >
              <button 
                onClick={() => handleToggleItem(item)}
                className="mt-0.5 shrink-0 text-slate-400 hover:text-violet-500 transition-colors focus:outline-none"
              >
                {item.completed ? (
                  <CheckCircle2 size={20} className="text-emerald-500" />
                ) : (
                  <Circle size={20} />
                )}
              </button>
              <div className="flex-1 min-w-0">
                <p className={`text-sm font-medium transition-all ${item.completed ? 'text-slate-400 line-through' : 'text-light-text dark:text-white'}`}>
                  {item.item}
                </p>
                {item.completed && item.completed_by && item.completed_at && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Concluído por {item.completed_by} em {new Date(item.completed_at).toLocaleDateString('pt-BR')}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
        
        {/* Add new item form */}
        <div className="p-4 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-white/10">
          <form onSubmit={handleAddItem} className="flex items-center gap-2">
            <input
              type="text"
              value={newItemText}
              onChange={(e) => setNewItemText(e.target.value)}
              placeholder="+ Adicionar item personalizado..."
              className="flex-1 bg-transparent border-none text-sm text-light-text dark:text-white placeholder:text-slate-400 outline-none focus:ring-0"
            />
            <button
              type="submit"
              disabled={!newItemText.trim() || isAdding}
              className="p-2 text-violet-600 hover:bg-violet-500/10 rounded-lg transition-colors disabled:opacity-50"
            >
              <Plus size={18} />
            </button>
          </form>
        </div>
      </div>

      {/* Complete Exit Button */}
      {isAllCompleted && (
        <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
          <button
            onClick={onCompleteExit}
            className="w-full py-4 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl font-bold uppercase tracking-widest text-sm transition-colors flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
          >
            <Check size={18} />
            Concluir Saída
          </button>
        </div>
      )}
    </div>
  );
};

export default CrmChecklist;
