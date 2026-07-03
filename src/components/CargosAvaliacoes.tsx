import React, { useState, useEffect, useMemo } from 'react';
import {
  Loader2, Plus, Edit3, Trash2, ChevronDown, ChevronRight, X, Check, Users, ClipboardList,
} from 'lucide-react';
import { ICON_NAMES, iconOf, COLORS, chipOf } from './performanceCriteria';

interface Cargo { cargo: string; total_colaboradores: number; }
interface Criterio {
  id: number; cargo: string; label: string; descricao: string | null;
  icon: string; cor: string; ordem: number; ativo: boolean;
}

// ── Modal de criar/editar critério ────────────────────────────────────────────
const CriterioModal: React.FC<{
  cargo: string;
  editing: Criterio | null;
  onClose: () => void;
  onSaved: () => void;
}> = ({ cargo, editing, onClose, onSaved }) => {
  const [label, setLabel] = useState(editing?.label || '');
  const [descricao, setDescricao] = useState(editing?.descricao || '');
  const [icon, setIcon] = useState(editing?.icon || 'Star');
  const [cor, setCor] = useState(editing?.cor || 'violet');
  const [saving, setSaving] = useState(false);

  const save = async () => {
    if (!label.trim()) return;
    setSaving(true);
    try {
      const body = { cargo, label: label.trim(), descricao: descricao.trim() || null, icon, cor };
      const url = editing ? `/api/admin/performance-criteria/${editing.id}` : '/api/admin/performance-criteria';
      const method = editing ? 'PUT' : 'POST';
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Falha ao salvar');
      onSaved();
      onClose();
    } catch (e) {
      alert('Erro ao salvar critério.');
    } finally {
      setSaving(false);
    }
  };

  const SelectedIcon = iconOf(icon);

  return (
    <div className="fixed inset-0 z-[300] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="w-full max-w-md bg-white dark:bg-[#1A1625] border border-slate-200 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-center gap-3 p-5 border-b border-slate-200 dark:border-white/10">
          <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${chipOf(cor)}`}>
            <SelectedIcon size={18} />
          </div>
          <div className="flex-1 min-w-0">
            <h3 className="text-base font-bold text-slate-900 dark:text-white">
              {editing ? 'Editar critério' : 'Novo critério'}
            </h3>
            <p className="text-[11px] uppercase tracking-widest text-slate-400 font-semibold truncate">{cargo}</p>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 dark:hover:text-white transition-colors">
            <X size={20} />
          </button>
        </div>

        <div className="p-5 space-y-4">
          <div>
            <label className="block text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Nome do critério</label>
            <input
              autoFocus
              value={label}
              onChange={e => setLabel(e.target.value)}
              placeholder="Ex: Fechamento no prazo"
              className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Descrição (opcional)</label>
            <input
              value={descricao}
              onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Follow-up ativo e organização"
              className="w-full bg-slate-100 dark:bg-dark-input border border-slate-200 dark:border-white/5 rounded-xl py-2.5 px-3 text-sm text-slate-900 dark:text-white outline-none focus:ring-2 focus:ring-violet-500/20"
            />
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Cor</label>
            <div className="flex flex-wrap gap-2">
              {COLORS.map(c => (
                <button
                  key={c.key}
                  onClick={() => setCor(c.key)}
                  className={`w-7 h-7 rounded-full ${c.dot} transition-all ${cor === c.key ? 'ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#1A1625] ring-slate-400' : 'opacity-70 hover:opacity-100'}`}
                  title={c.key}
                />
              ))}
            </div>
          </div>

          <div>
            <label className="block text-[11px] uppercase tracking-widest text-slate-400 font-semibold mb-1.5">Ícone</label>
            <div className="grid grid-cols-8 gap-1.5 max-h-32 overflow-y-auto pr-1">
              {ICON_NAMES.map(name => {
                const Ico = iconOf(name);
                const active = icon === name;
                return (
                  <button
                    key={name}
                    onClick={() => setIcon(name)}
                    className={`aspect-square rounded-lg flex items-center justify-center transition-all ${
                      active ? chipOf(cor) : 'bg-slate-100 dark:bg-white/5 text-slate-400 hover:text-slate-600 dark:hover:text-white'
                    }`}
                    title={name}
                  >
                    <Ico size={16} />
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 p-5 border-t border-slate-200 dark:border-white/10">
          <button onClick={onClose} className="px-4 py-2 rounded-xl text-sm font-bold text-slate-500 hover:text-slate-700 dark:hover:text-white transition-colors">
            Cancelar
          </button>
          <button
            onClick={save}
            disabled={saving || !label.trim()}
            className="px-4 py-2 rounded-xl text-sm font-bold bg-violet-600 hover:bg-violet-700 disabled:opacity-50 text-white transition-colors flex items-center gap-2"
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Salvar critério
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Aba principal ─────────────────────────────────────────────────────────────
export const CargosAvaliacoes: React.FC = () => {
  const [cargos, setCargos] = useState<Cargo[]>([]);
  const [criteria, setCriteria] = useState<Criterio[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [modal, setModal] = useState<{ cargo: string; editing: Criterio | null } | null>(null);

  const load = async () => {
    try {
      const [cRes, critRes] = await Promise.all([
        fetch('/api/admin/cargos'),
        fetch('/api/admin/performance-criteria'),
      ]);
      const cargosData = cRes.ok ? await cRes.json() : [];
      const critData = critRes.ok ? await critRes.json() : [];
      setCargos(cargosData);
      setCriteria(critData);
      // Expande tudo por padrão na primeira carga
      setExpanded(new Set(cargosData.map((c: Cargo) => c.cargo)));
    } catch (e) {
      console.error('Erro ao carregar cargos/critérios', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const criteriaByCargo = useMemo(() => {
    const m: Record<string, Criterio[]> = {};
    criteria.forEach(c => { (m[c.cargo] ||= []).push(c); });
    return m;
  }, [criteria]);

  const toggle = (cargo: string) => {
    setExpanded(prev => {
      const next = new Set(prev);
      next.has(cargo) ? next.delete(cargo) : next.add(cargo);
      return next;
    });
  };

  const removeCriterio = async (id: number) => {
    if (!confirm('Excluir este critério de avaliação?')) return;
    try {
      const res = await fetch(`/api/admin/performance-criteria/${id}`, { method: 'DELETE' });
      if (res.ok) setCriteria(prev => prev.filter(c => c.id !== id));
    } catch (e) {
      alert('Erro ao excluir critério.');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20 text-slate-400">
        <Loader2 size={24} className="animate-spin" />
      </div>
    );
  }

  return (
    <div>
      <p className="text-slate-500 text-sm mb-6">
        Defina os critérios de avaliação de desempenho de cada cargo. Os cargos são detectados a partir da função dos colaboradores.
      </p>

      {cargos.length === 0 ? (
        <div className="text-center py-16 text-slate-400">
          <ClipboardList size={40} className="mx-auto mb-3 opacity-40" />
          <p className="text-sm">Nenhum cargo encontrado. Defina a função dos colaboradores no perfil deles.</p>
        </div>
      ) : (
        <div className="space-y-3">
          {cargos.map(cargo => {
            const list = criteriaByCargo[cargo.cargo] || [];
            const isOpen = expanded.has(cargo.cargo);
            return (
              <div key={cargo.cargo} className="bg-white dark:bg-dark-card border border-slate-200 dark:border-white/10 rounded-2xl overflow-hidden">
                {/* Header do cargo */}
                <button
                  onClick={() => toggle(cargo.cargo)}
                  className="w-full flex items-center gap-3 p-4 hover:bg-slate-50 dark:hover:bg-white/5 transition-colors text-left"
                >
                  {isOpen ? <ChevronDown size={18} className="text-slate-400 shrink-0" /> : <ChevronRight size={18} className="text-slate-400 shrink-0" />}
                  <div className="flex-1 min-w-0">
                    <h3 className="text-sm font-bold text-slate-900 dark:text-white truncate">{cargo.cargo}</h3>
                    <p className="text-[11px] text-slate-400 flex items-center gap-1.5 mt-0.5">
                      <Users size={12} /> {cargo.total_colaboradores} colaborador{cargo.total_colaboradores !== 1 ? 'es' : ''}
                      <span className="text-slate-300 dark:text-white/20">•</span>
                      {list.length} critério{list.length !== 1 ? 's' : ''}
                    </p>
                  </div>
                </button>

                {/* Critérios */}
                {isOpen && (
                  <div className="px-4 pb-4 space-y-2">
                    {list.length === 0 && (
                      <p className="text-xs text-slate-400 italic px-1 py-2">Nenhum critério definido para este cargo ainda.</p>
                    )}
                    {list.map(crit => {
                      const Ico = iconOf(crit.icon);
                      return (
                        <div key={crit.id} className="group flex items-center gap-3 bg-slate-50 dark:bg-white/5 border border-slate-200 dark:border-white/5 rounded-xl p-3">
                          <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${chipOf(crit.cor)}`}>
                            <Ico size={16} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{crit.label}</p>
                            {crit.descricao && <p className="text-[11px] text-slate-400 truncate">{crit.descricao}</p>}
                          </div>
                          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                              onClick={() => setModal({ cargo: cargo.cargo, editing: crit })}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-violet-500 hover:bg-violet-500/10 transition-colors"
                              title="Editar"
                            >
                              <Edit3 size={15} />
                            </button>
                            <button
                              onClick={() => removeCriterio(crit.id)}
                              className="p-1.5 rounded-lg text-slate-400 hover:text-rose-500 hover:bg-rose-500/10 transition-colors"
                              title="Excluir"
                            >
                              <Trash2 size={15} />
                            </button>
                          </div>
                        </div>
                      );
                    })}

                    <button
                      onClick={() => setModal({ cargo: cargo.cargo, editing: null })}
                      className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-dashed border-slate-300 dark:border-white/15 text-slate-500 hover:border-violet-500/40 hover:text-violet-500 hover:bg-violet-500/5 transition-all text-sm font-bold"
                    >
                      <Plus size={16} /> Adicionar critério
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {modal && (
        <CriterioModal
          cargo={modal.cargo}
          editing={modal.editing}
          onClose={() => setModal(null)}
          onSaved={load}
        />
      )}
    </div>
  );
};

export default CargosAvaliacoes;
