import React from 'react';
import { CalendarClock } from 'lucide-react';

export interface ProximoAgendamento {
  data: string;
  horario: string;
  observacao: string;
}

interface Props {
  titulo: string;
  legenda: string;
  valor: ProximoAgendamento;
  onChange: (v: ProximoAgendamento) => void;
  placeholderObs?: string;
}

/**
 * Bloco de agendamento do próximo encontro, exibido no rodapé dos modais de
 * "Realizar 1:1" e "Realizar avaliação".
 *
 * A data é opcional de propósito: ao salvar sem preencher, o agendamento atual é
 * apenas encerrado (fica sem próximo marcado). Preenchendo, o agendamento antigo
 * é substituído pelo novo — nos dois casos o compromisso da vez sai da tela.
 */
export default function AgendarProximoInline({ titulo, legenda, valor, onChange, placeholderObs }: Props) {
  const set = (patch: Partial<ProximoAgendamento>) => onChange({ ...valor, ...patch });

  return (
    <div className="rounded-2xl border border-violet-500/20 bg-violet-500/[0.06] p-4 space-y-3">
      <div className="flex items-center gap-2">
        <CalendarClock size={15} className="text-violet-500 dark:text-violet-400 shrink-0" />
        <div>
          <p className="text-[11px] font-black uppercase tracking-widest text-violet-600 dark:text-violet-400">{titulo}</p>
          <p className="text-[10px] text-slate-500 dark:text-slate-400">{legenda}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Data</label>
          <input
            type="date"
            value={valor.data}
            onChange={e => set({ data: e.target.value })}
            className="w-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
        <div>
          <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Horário</label>
          <input
            type="time"
            value={valor.horario}
            onChange={e => set({ horario: e.target.value })}
            className="w-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white focus:outline-none focus:border-violet-500 transition-colors"
          />
        </div>
      </div>

      <div>
        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1.5 block">Observação (opcional)</label>
        <input
          type="text"
          value={valor.observacao}
          onChange={e => set({ observacao: e.target.value })}
          placeholder={placeholderObs || 'Pauta ou ponto a preparar...'}
          className="w-full bg-white dark:bg-white/[0.05] border border-slate-200 dark:border-white/10 rounded-xl px-3 py-2 text-sm text-slate-800 dark:text-white placeholder-slate-400 dark:placeholder-slate-600 focus:outline-none focus:border-violet-500 transition-colors"
        />
      </div>

      {!valor.data && (
        <p className="text-[10px] text-slate-500 dark:text-slate-400 leading-snug">
          Sem data preenchida, o compromisso atual é encerrado e nenhum próximo fica marcado.
        </p>
      )}
    </div>
  );
}
