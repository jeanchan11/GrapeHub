import React, { useState } from 'react';
import { RefreshCw } from 'lucide-react';
import { toast } from '@/src/lib/toast';

/**
 * Botão "Sincronizar" das telas do Financeiro.
 *
 * Puxa faturas, assinaturas e clientes do Asaas (`POST /api/fin/sync/run`).
 * O sync roda em BACKGROUND no servidor: a resposta volta na hora, sem os dados
 * prontos. Por isso a espera fixa antes de recarregar a tela — sem ela, a página
 * se atualiza com o estado anterior e parece que o botão não fez nada.
 *
 * Cada página passa o próprio `onDone` para recarregar o que ela mostra; o botão
 * não sabe (nem precisa saber) o que cada tela exibe.
 */
const ESPERA_DO_SYNC_MS = 4000;

const BotaoSincronizar: React.FC<{ onDone?: () => void | Promise<void>; className?: string }> = ({ onDone, className = '' }) => {
  const [sincronizando, setSincronizando] = useState(false);

  const sincronizar = async () => {
    setSincronizando(true);
    try {
      const r = await fetch('/api/fin/sync/run', { method: 'POST' });
      if (!r.ok) throw new Error('O servidor recusou a sincronização.');
      await new Promise(res => setTimeout(res, ESPERA_DO_SYNC_MS));
      await onDone?.();
    } catch (e: any) {
      toast.error(e?.message || 'Falha ao sincronizar com o Asaas.');
    } finally {
      setSincronizando(false);
    }
  };

  return (
    <button
      onClick={sincronizar}
      disabled={sincronizando}
      title="Sincroniza faturas, assinaturas e clientes do Asaas"
      className={`flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 rounded-lg text-xs font-medium text-emerald-700 dark:text-emerald-400 hover:bg-emerald-100 dark:hover:bg-emerald-500/20 disabled:opacity-50 transition-colors shrink-0 ${className}`}
    >
      <RefreshCw size={13} className={sincronizando ? 'animate-spin' : ''} />
      {sincronizando ? 'Sincronizando...' : 'Sincronizar'}
    </button>
  );
};

export default BotaoSincronizar;
