import React, { useState } from 'react';
import { Archive } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { Modal } from './ui/Modal';
import { designSystem } from '../design-system';

interface ArchiveClientModalProps {
  clientId: string;
  onClose: () => void;
  onConfirm: (data: any) => Promise<void>;
}

const EXIT_REASONS = [
  { id: 'resultado_campanha', label: 'Resultado Campanha', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { id: 'motivo_financeiro', label: 'Motivo Financeiro', color: 'bg-orange-500/10 text-orange-500 border-orange-500/20' },
  { id: 'crm_ia', label: 'CRM e IA', color: 'bg-blue-500/10 text-blue-500 border-blue-500/20' },
  { id: 'motivo_pessoal', label: 'Motivo Pessoal', color: 'bg-purple-500/10 text-purple-500 border-purple-500/20' },
  { id: 'falta_relacionamento', label: 'Falta de Relacionamento', color: 'bg-rose-500/10 text-rose-500 border-rose-500/20' },
  { id: 'resultado_comercial', label: 'Resultado Comercial', color: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20' },
];

const ArchiveClientModal: React.FC<ArchiveClientModalProps> = ({ clientId, onClose, onConfirm }) => {
  const { user } = useAuth();
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({
    how_it_went: '',
    exit_reasons: [] as string[],
    project_result: '',
    client_relationship: '',
    notes: ''
  });

  const handleToggleReason = (reason: string) => {
    setFormData(prev => ({
      ...prev,
      exit_reasons: prev.exit_reasons.includes(reason)
        ? prev.exit_reasons.filter(r => r !== reason)
        : [...prev.exit_reasons, reason]
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.how_it_went || formData.exit_reasons.length === 0 || !formData.project_result || !formData.client_relationship) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    setIsSubmitting(true);
    try {
      await onConfirm({
        ...formData,
        archived_by: user?.name || user?.email || 'Desconhecido'
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Arquivar Cliente"
      icon={<Archive size={24} className="text-rose-500" />}
      maxWidth="max-w-lg"
      footer={
        <>
          <button
            type="button"
            onClick={onClose}
            className={designSystem.button.secondary}
          >
            Cancelar
          </button>
          <button
            type="submit"
            form="archive-form"
            disabled={isSubmitting}
            className="px-4 py-3 rounded-xl text-sm font-bold text-white bg-rose-500 hover:bg-rose-600 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {isSubmitting ? (
              <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            ) : (
              <>
                <Archive size={18} />
                Confirmar Arquivamento
              </>
            )}
          </button>
        </>
      }
    >
      <div className="flex flex-col h-full">
        <div className="mb-6">
          <p className="text-sm text-slate-500">Preencha os dados de saída</p>
        </div>

        <div className="flex-1 overflow-y-auto pr-2">
          <form id="archive-form" onSubmit={handleSubmit} className="space-y-6">
            
            {/* Como foi */}
            <div>
              <label className={designSystem.input.label}>
                Como foi? *
              </label>
              <select
                value={formData.how_it_went}
                onChange={(e) => setFormData(prev => ({ ...prev, how_it_went: e.target.value }))}
                className={designSystem.input.field}
                required
              >
                <option value="" className="bg-light-sidebar dark:bg-dark-sidebar">Selecione...</option>
                <option value="Inevitável" className="bg-light-sidebar dark:bg-dark-sidebar">Inevitável</option>
                <option value="Podia ser evitado" className="bg-light-sidebar dark:bg-dark-sidebar">Podia ser evitado</option>
                <option value="Não esperado" className="bg-light-sidebar dark:bg-dark-sidebar">Não esperado</option>
              </select>
            </div>

            {/* Motivo de Saída */}
            <div>
              <label className={designSystem.input.label}>
                Motivo de Saída *
              </label>
              <div className="flex flex-wrap gap-2">
                {EXIT_REASONS.map(reason => {
                  const isSelected = formData.exit_reasons.includes(reason.label);
                  return (
                    <button
                      key={reason.id}
                      type="button"
                      onClick={() => handleToggleReason(reason.label)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-all ${
                        isSelected 
                          ? reason.color
                          : 'bg-slate-50 dark:bg-white/5 border-slate-200 dark:border-white/10 text-slate-500 hover:border-slate-300 dark:hover:border-white/20'
                      }`}
                    >
                      {reason.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Resultado do Projeto */}
            <div>
              <label className={designSystem.input.label}>
                Resultado do Projeto *
              </label>
              <select
                value={formData.project_result}
                onChange={(e) => setFormData(prev => ({ ...prev, project_result: e.target.value }))}
                className={designSystem.input.field}
                required
              >
                <option value="" className="bg-light-sidebar dark:bg-dark-sidebar">Selecione...</option>
                <option value="Ótimo" className="bg-light-sidebar dark:bg-dark-sidebar">Ótimo</option>
                <option value="Bom" className="bg-light-sidebar dark:bg-dark-sidebar">Bom</option>
                <option value="Ok" className="bg-light-sidebar dark:bg-dark-sidebar">Ok</option>
                <option value="Ruim" className="bg-light-sidebar dark:bg-dark-sidebar">Ruim</option>
              </select>
            </div>

            {/* Relacionamento com Cliente */}
            <div>
              <label className={designSystem.input.label}>
                Relacionamento com Cliente *
              </label>
              <select
                value={formData.client_relationship}
                onChange={(e) => setFormData(prev => ({ ...prev, client_relationship: e.target.value }))}
                className={designSystem.input.field}
                required
              >
                <option value="" className="bg-light-sidebar dark:bg-dark-sidebar">Selecione...</option>
                <option value="Ótimo" className="bg-light-sidebar dark:bg-dark-sidebar">Ótimo</option>
                <option value="Bom" className="bg-light-sidebar dark:bg-dark-sidebar">Bom</option>
                <option value="Ok" className="bg-light-sidebar dark:bg-dark-sidebar">Ok</option>
                <option value="Ruim" className="bg-light-sidebar dark:bg-dark-sidebar">Ruim</option>
              </select>
            </div>

            {/* Observações finais */}
            <div>
              <label className={designSystem.input.label}>
                Observações finais
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                className={`${designSystem.input.field} min-h-[100px] resize-none`}
                placeholder="Adicione observações adicionais..."
              />
            </div>

          </form>
        </div>
      </div>
    </Modal>
  );
};

export default ArchiveClientModal;
