import React, { useState, useEffect } from 'react';
import { Clock } from 'lucide-react';

interface HistoryEntry {
  id: number;
  task_id: string;
  user_id: string;
  action: string;
  old_value: string | null;
  new_value: string | null;
  created_at: string;
}

export const TaskHistory: React.FC<{ taskId: string }> = ({ taskId }) => {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchHistory = async () => {
      try {
        const res = await fetch(`/api/task-history?task_id=${taskId}`);
        if (res.ok) {
          setHistory(await res.json());
        }
      } catch (err) {
        console.error('Error fetching task history:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchHistory();
  }, [taskId]);

  if (loading) {
    return <div className="p-4 text-center text-xs text-slate-500">Carregando histórico...</div>;
  }

  if (history.length === 0) {
    return null;
  }

  return (
    <div className="p-4 bg-slate-50/30 dark:bg-black/10">
      <h5 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 flex items-center gap-1">
        <Clock size={12} />
        Histórico
      </h5>
      <div className="space-y-3">
        {history.map(entry => (
          <div key={entry.id} className="flex gap-3 text-xs">
            <div className="w-6 h-6 rounded-full bg-violet-500/20 text-violet-500 flex items-center justify-center flex-shrink-0 font-bold text-[10px]">
              {/* Fallback avatar since we don't have user details joined yet */}
              {entry.user_id ? entry.user_id.substring(0, 2).toUpperCase() : 'U'}
            </div>
            <div>
              <p className="text-slate-600 dark:text-slate-300">
                <span className="font-bold text-light-text dark:text-white mr-1">
                  {entry.user_id || 'Sistema'}
                </span>
                {entry.action}
                {entry.new_value && (
                  <span className="font-medium text-slate-500 dark:text-slate-400 ml-1">
                    "{entry.new_value}"
                  </span>
                )}
              </p>
              <p className="text-[10px] text-slate-400 mt-0.5">
                {new Intl.DateTimeFormat('pt-BR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entry.created_at))}
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
