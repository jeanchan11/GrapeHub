// Dados do CRM que a página de Automações usa para mostrar NOMES no lugar de ids
// (pipeline, etapa, sequência, pessoa). Um cache só para a página inteira — lista,
// construtor e painel leem daqui. Endpoints (todos GET, os mesmos do resto do app):
//   /api/crm-comercial/kanbans · /api/crm-comercial/columns?kanban_id= ·
//   /api/crm-comercial/sequences/all · /api/users
import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import type { Resolvedor } from './catalogo';

export interface Opcao { id: string; nome: string; }
export interface Sequencia { id: number; nome: string; }

interface DadosCrm {
  kanbans: Opcao[];
  kanbansProntos: boolean;
  colunas: Record<string, Opcao[]>;
  carregarColunas: (kanbanId?: string) => void;
  sequencias: Sequencia[];
  sequenciasProntas: boolean;
  carregarSequencias: () => void;
  usuarios: Opcao[];
  usuariosProntos: boolean;
  carregarUsuarios: () => void;
  nomes: Resolvedor;
}

const Ctx = createContext<DadosCrm | null>(null);

export function DadosCrmProvider({ children }: { children: React.ReactNode }) {
  const [kanbans, setKanbans] = useState<Opcao[]>([]);
  const [kanbansProntos, setKanbansProntos] = useState(false);
  const [colunas, setColunas] = useState<Record<string, Opcao[]>>({});
  const [sequencias, setSequencias] = useState<Sequencia[]>([]);
  const [sequenciasProntas, setSequenciasProntas] = useState(false);
  const [usuarios, setUsuarios] = useState<Opcao[]>([]);
  const [usuariosProntos, setUsuariosProntos] = useState(false);
  const pedidos = useRef(new Set<string>());

  useEffect(() => {
    fetch('/api/crm-comercial/kanbans')
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) setKanbans(data.map(k => ({ id: String(k.id), nome: k.name || k.title || k.nome || String(k.id) })));
      })
      .catch(() => {})
      .finally(() => setKanbansProntos(true));
  }, []);

  const carregarColunas = useCallback((kanbanId?: string) => {
    if (!kanbanId || pedidos.current.has('col:' + kanbanId)) return;
    pedidos.current.add('col:' + kanbanId);
    fetch(`/api/crm-comercial/columns?kanban_id=${kanbanId}`)
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        setColunas(prev => ({ ...prev, [kanbanId]: data.map(c => ({ id: String(c.id), nome: c.title || c.name || String(c.id) })) }));
      })
      .catch(() => { pedidos.current.delete('col:' + kanbanId); });
  }, []);

  const carregarSequencias = useCallback(() => {
    if (pedidos.current.has('seq')) return;
    pedidos.current.add('seq');
    fetch('/api/crm-comercial/sequences/all')
      .then(r => r.json())
      .then((data: any[]) => {
        if (Array.isArray(data)) setSequencias(data.map(s => ({ id: s.id, nome: s.name || `Sequência ${s.id}` })));
      })
      .catch(() => {})
      .finally(() => setSequenciasProntas(true));
  }, []);

  const carregarUsuarios = useCallback(() => {
    if (pedidos.current.has('usr')) return;
    pedidos.current.add('usr');
    fetch('/api/users')
      .then(r => r.json())
      .then((data: any[]) => {
        if (!Array.isArray(data)) return;
        setUsuarios(
          data
            .map(u => ({ id: String(u.id), nome: u.name || u.email || String(u.id) }))
            .sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR')),
        );
      })
      .catch(() => {})
      .finally(() => setUsuariosProntos(true));
  }, []);

  const nomes = useMemo<Resolvedor>(() => ({
    kanban: id => kanbans.find(k => k.id === String(id))?.nome,
    coluna: (kanbanId, colunaId) => {
      if (!colunaId) return undefined;
      if (kanbanId) return colunas[String(kanbanId)]?.find(c => c.id === String(colunaId))?.nome;
      for (const lista of Object.values(colunas)) {
        const achou = lista.find(c => c.id === String(colunaId));
        if (achou) return achou.nome;
      }
      return undefined;
    },
    sequencia: id => sequencias.find(s => String(s.id) === String(id))?.nome,
    usuario: id => usuarios.find(u => u.id === String(id))?.nome,
  }), [kanbans, colunas, sequencias, usuarios]);

  const valor = useMemo<DadosCrm>(() => ({
    kanbans, kanbansProntos, colunas, carregarColunas,
    sequencias, sequenciasProntas, carregarSequencias,
    usuarios, usuariosProntos, carregarUsuarios, nomes,
  }), [kanbans, kanbansProntos, colunas, carregarColunas, sequencias, sequenciasProntas, carregarSequencias, usuarios, usuariosProntos, carregarUsuarios, nomes]);

  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useDadosCrm(): DadosCrm {
  const v = useContext(Ctx);
  if (!v) throw new Error('useDadosCrm fora do DadosCrmProvider');
  return v;
}

/** Pede ao cache as etapas de todo pipeline citado nos passos (condições, mover, criar negócio). */
export function kanbansCitados(steps: { type: string; config: Record<string, any> }[]): string[] {
  const ids = new Set<string>();
  for (const s of steps) {
    const cfg = s.config || {};
    if (s.type === 'condition') {
      for (const r of (cfg.rules || []) as Record<string, any>[]) if (r?._kanban) ids.add(String(r._kanban));
    } else if (s.type === 'action') {
      if (cfg.action_type === 'move_stage' && cfg._kanban) ids.add(String(cfg._kanban));
      if (cfg.action_type === 'create_lead' && cfg.kanban_id) ids.add(String(cfg.kanban_id));
    }
  }
  return [...ids];
}
