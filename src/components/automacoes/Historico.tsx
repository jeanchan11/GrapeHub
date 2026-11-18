// Aba Histórico: as últimas execuções (GET /api/automations/logs?limit=100, carregado pela
// página). Só leitura: filtro por status/automação e a mensagem de cada linha expansível.
import React, { useMemo, useState } from 'react';
import { ChevronRight, History, RefreshCw } from 'lucide-react';
import { CarregandoBloco } from '../LoadingSpinner';
import { EstadoVazio } from '../ui/EstadoVazio';
import { Abas } from '../ui/Abas';
import ThemedDropdown from '../ui/ThemedDropdown';
import { haQuanto, rotuloAcao, rotuloGatilho } from './catalogo';
import { TXT_FRACO } from './ui';

type Filtro = 'todas' | 'sucesso' | 'erro';

const PilulaStatus = ({ ok }: { ok: boolean }) => (
  <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11px] font-semibold whitespace-nowrap ${
    ok ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'
  }`}>
    <span className={`w-1.5 h-1.5 rounded-full ${ok ? 'bg-emerald-500' : 'bg-rose-500'}`} />
    {ok ? 'Sucesso' : 'Erro'}
  </span>
);

export function Historico({ logs, carregando, onAtualizar }: { logs: any[]; carregando: boolean; onAtualizar: () => void }) {
  const [filtro, setFiltro] = useState<Filtro>('todas');
  const [automacao, setAutomacao] = useState('');
  const [aberto, setAberto] = useState<string | null>(null);

  const nomesAutomacao = useMemo(
    () => Array.from(new Set(logs.map(l => String(l.automation_name || '')).filter(Boolean))).sort((a, b) => a.localeCompare(b, 'pt-BR')),
    [logs],
  );
  const nErros = logs.filter(l => l.status !== 'success').length;
  const visiveis = logs.filter(l =>
    (filtro === 'todas' || (filtro === 'sucesso' ? l.status === 'success' : l.status !== 'success')) &&
    (!automacao || l.automation_name === automacao),
  );

  return (
    <div>
      <div className="flex items-center justify-between gap-3 flex-wrap mb-4">
        <div className="flex items-center gap-2 flex-wrap">
          <Abas<Filtro>
            variante="segmentado"
            abas={[
              { id: 'todas', rotulo: 'Todas', contador: logs.length },
              { id: 'sucesso', rotulo: 'Sucesso' },
              { id: 'erro', rotulo: 'Erro', contador: nErros, alerta: true },
            ]}
            ativa={filtro}
            onChange={setFiltro}
          />
          {nomesAutomacao.length > 1 && (
            <ThemedDropdown
              className="w-64"
              value={automacao}
              options={[{ value: '', label: 'Todas as automações' }, ...nomesAutomacao.map(n => ({ value: n, label: n }))]}
              onChange={setAutomacao}
            />
          )}
        </div>
        <div className="flex items-center gap-3">
          <span className={`text-xs ${TXT_FRACO}`}>Últimas 100 execuções</span>
          <button type="button" onClick={onAtualizar} title="Atualizar"
            className="w-9 h-9 rounded-xl bg-dark-card border border-black/10 dark:border-white/10 flex items-center justify-center text-slate-400 hover:text-dark-text transition-colors">
            <RefreshCw size={14} className={carregando ? 'animate-spin' : ''} />
          </button>
        </div>
      </div>

      {carregando && logs.length === 0 ? (
        <CarregandoBloco />
      ) : visiveis.length === 0 ? (
        <EstadoVazio
          Icone={History}
          titulo={logs.length === 0 ? 'Nenhuma execução ainda' : 'Nenhuma execução neste filtro'}
          descricao={logs.length === 0 ? 'Os registros aparecem aqui quando uma automação for disparada.' : undefined}
        />
      ) : (
        <div className="bg-dark-card border border-black/10 dark:border-white/10 rounded-2xl overflow-x-auto">
          <table className="w-full text-sm min-w-[680px]">
            <thead>
              <tr className={`text-left text-[11px] uppercase tracking-wider ${TXT_FRACO} border-b border-black/5 dark:border-white/5`}>
                <th className="font-semibold px-4 py-3 w-8" />
                <th className="font-semibold px-2 py-3">Status</th>
                <th className="font-semibold px-3 py-3">Automação</th>
                <th className="font-semibold px-3 py-3">Ação</th>
                <th className="font-semibold px-3 py-3">Negócio</th>
                <th className="font-semibold px-4 py-3 text-right">Quando</th>
              </tr>
            </thead>
            <tbody>
              {visiveis.map(log => {
                const id = String(log.id);
                const ok = log.status === 'success';
                const exp = aberto === id;
                const data = log.executed_at ? new Date(log.executed_at) : null;
                return (
                  <React.Fragment key={id}>
                    <tr
                      onClick={() => setAberto(exp ? null : id)}
                      className={`cursor-pointer border-b border-black/5 dark:border-white/5 last:border-0 transition-colors hover:bg-black/[0.02] dark:hover:bg-white/[0.03] ${exp ? 'bg-black/[0.02] dark:bg-white/[0.03]' : ''}`}
                    >
                      <td className="pl-4 py-3 text-slate-400"><ChevronRight size={14} className={`transition-transform ${exp ? 'rotate-90' : ''}`} /></td>
                      <td className="px-2 py-3"><PilulaStatus ok={ok} /></td>
                      <td className="px-3 py-3 font-medium text-dark-text max-w-[240px] truncate" title={log.automation_name}>{log.automation_name || '—'}</td>
                      <td className={`px-3 py-3 ${TXT_FRACO}`}>{rotuloAcao(log.action_type)}</td>
                      <td className="px-3 py-3 text-dark-text max-w-[200px] truncate">{log.lead_nome || log.lead_id || '—'}</td>
                      <td className={`px-4 py-3 text-right whitespace-nowrap ${TXT_FRACO}`}
                        title={data ? data.toLocaleString('pt-BR') : undefined}>
                        {data ? data.toLocaleString('pt-BR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
                        {data && <span className="block text-[11px] opacity-70">{haQuanto(log.executed_at)}</span>}
                      </td>
                    </tr>
                    {exp && (
                      <tr className="border-b border-black/5 dark:border-white/5">
                        <td />
                        <td colSpan={5} className="px-2 pb-4 pt-1">
                          <div className={`rounded-xl px-3 py-2.5 text-xs space-y-1 ${ok ? 'bg-black/[0.03] dark:bg-white/5' : 'bg-rose-500/[0.07] border border-rose-500/20'}`}>
                            <p className={ok ? 'text-dark-text' : 'text-rose-600 dark:text-rose-400 font-medium'}>{log.message || 'Sem mensagem.'}</p>
                            <p className={TXT_FRACO}>
                              Gatilho: {rotuloGatilho(log.event)} · Ação: <span className="font-mono">{log.action_type || '—'}</span>
                              {log.lead_id && <> · Negócio: <span className="font-mono">{log.lead_id}</span></>}
                            </p>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default Historico;
