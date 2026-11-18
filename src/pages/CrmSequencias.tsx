import React, { useState, useEffect, useMemo } from 'react';
import SplitHeadline from '../components/SplitHeadline';
import { Plus, Zap, Search, X } from 'lucide-react';
import { CarregandoBloco } from '../components/LoadingSpinner';
import { EstadoVazio } from '../components/ui/EstadoVazio';
import { designSystem } from '../design-system';
import { toast } from '@/src/lib/toast';
import { confirmDialog } from '@/src/lib/confirm';
import { CartaoSequencia } from '../components/sequencias/ListaSequencias';
import { EditorSequencia } from '../components/sequencias/EditorSequencia';
import { validar, type FormSequencia } from '../components/sequencias/regras';

/**
 * Sequências de cadência do CRM (redesenho de 18/11/2026).
 * Lista em cartões + editor em duas colunas (linha do tempo | configurar passo).
 * As chamadas de API e o corpo enviado são os mesmos da versão anterior:
 *   GET    /api/crm-comercial/sequences/all
 *   POST   /api/crm-comercial/sequences        { name, description, skip_weekends, steps }
 *   PUT    /api/crm-comercial/sequences/:id    { name, description, skip_weekends, steps }
 *   DELETE /api/crm-comercial/sequences/:id
 * "Duplicar" usa o mesmo POST de criação.
 */

const formNovo = (): FormSequencia => ({ name: 'Nova Sequência', description: '', skip_weekends: true, steps: [] });

const CrmSequencias = () => {
  const [sequences, setSequences] = useState<any[]>([]);
  const [seqMode, setSeqMode] = useState<'list' | 'form'>('list');
  const [seqEditId, setSeqEditId] = useState<string | null>(null);
  const [seqForm, setSeqForm] = useState<FormSequencia>(formNovo());
  const [savingSequence, setSavingSequence] = useState(false);
  const [selectedStepIndex, setSelectedStepIndex] = useState<number | null>(null);
  // Só aparência: a lista mostra o carregamento até a 1ª resposta, em vez de "nenhuma sequência".
  const [carregando, setCarregando] = useState(true);
  // Foto do formulário ao abrir o editor — para o aviso de "alterações não salvas".
  const [fotoForm, setFotoForm] = useState('');
  const [mostrarErros, setMostrarErros] = useState(false);
  const [busca, setBusca] = useState('');
  const [duplicandoId, setDuplicandoId] = useState<string | null>(null);

  const sujo = seqMode === 'form' && JSON.stringify(seqForm) !== fotoForm;

  useEffect(() => {
    fetchSequences();
  }, []);

  // Fechar a aba com edição pendente pede confirmação do navegador.
  useEffect(() => {
    if (!sujo) return;
    const h = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ''; };
    window.addEventListener('beforeunload', h);
    return () => window.removeEventListener('beforeunload', h);
  }, [sujo]);

  const fetchSequences = async () => {
    try {
      const res = await fetch('/api/crm-comercial/sequences/all');
      if (res.ok) {
        setSequences(await res.json());
      }
    } catch (e) {
      console.error(e);
    } finally {
      setCarregando(false);
    }
  };

  const abrirEditor = (id: string | null, form: FormSequencia) => {
    setSeqEditId(id);
    setSeqForm(form);
    setFotoForm(JSON.stringify(form));
    setSelectedStepIndex(form.steps.length ? 0 : null);
    setMostrarErros(false);
    setSeqMode('form');
  };

  const abrirNova = () => abrirEditor(null, formNovo());

  // Mesmo objeto que o editor antigo montava ao clicar em "Editar".
  const abrirEdicao = (seq: any) => abrirEditor(seq.id, {
    name: seq.name, description: seq.description || '', skip_weekends: seq.skip_weekends, steps: seq.steps || [],
  });

  const fecharEditor = () => {
    setSeqMode('list');
    setSeqEditId(null);
    setSelectedStepIndex(null);
    setMostrarErros(false);
  };

  const handleCancelar = async () => {
    if (sujo && !(await confirmDialog({
      title: 'Descartar alterações?',
      message: 'O que você mudou nesta sequência ainda não foi salvo e será perdido.',
      confirmText: 'Descartar',
      cancelText: 'Continuar editando',
      danger: true,
    }))) return;
    fecharEditor();
  };

  const handleSaveSequence = async () => {
    const erros = validar(seqForm).filter(p => p.nivel === 'erro');
    if (erros.length) {
      setMostrarErros(true);
      if (erros[0].passo !== undefined) setSelectedStepIndex(erros[0].passo);
      return toast.error(erros[0].texto);
    }
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
        toast.success(seqEditId ? 'Sequência salva.' : 'Sequência criada.');
        fetchSequences();
        fecharEditor();
      } else {
        toast.error('Erro ao salvar sequência.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao salvar sequência.');
    }
    setSavingSequence(false);
  };

  const handleDeleteSequence = async (seq: any) => {
    const n = seq.steps?.length || 0;
    if (!(await confirmDialog({
      title: 'Excluir sequência?',
      message: `“${seq.name}”${n ? ` e ${n === 1 ? 'o seu passo' : `os ${n} passos`}` : ''} serão apagados. Automações que usam esta sequência deixam de criar atividades. Atividades já criadas nos leads continuam.`,
      confirmText: 'Excluir',
      danger: true,
    }))) return;
    try {
      const res = await fetch(`/api/crm-comercial/sequences/${seq.id}`, { method: 'DELETE' });
      if (res.ok) toast.success('Sequência excluída.');
      else toast.error('Erro ao excluir sequência.');
      fetchSequences();
    } catch (e) {
      console.error(e);
    }
  };

  // Duplicar = criar uma nova pelo mesmo POST, com os mesmos campos de sequência e de passo.
  const handleDuplicar = async (seq: any) => {
    setDuplicandoId(seq.id);
    try {
      const res = await fetch('/api/crm-comercial/sequences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: `${seq.name} (cópia)`,
          description: seq.description || '',
          skip_weekends: seq.skip_weekends,
          steps: (seq.steps || []).map((s: any) => ({
            type: s.type, title: s.title, observations: s.observations, day_offset: s.day_offset, time_of_day: s.time_of_day,
          })),
        })
      });
      if (res.ok) {
        toast.success(`Cópia criada: “${seq.name} (cópia)”.`);
        fetchSequences();
      } else {
        toast.error('Erro ao duplicar sequência.');
      }
    } catch (e) {
      console.error(e);
      toast.error('Erro ao duplicar sequência.');
    }
    setDuplicandoId(null);
  };

  const filtradas = useMemo(() => {
    const q = busca.trim().toLowerCase();
    if (!q) return sequences;
    return sequences.filter(s => `${s.name || ''} ${s.description || ''}`.toLowerCase().includes(q));
  }, [sequences, busca]);

  if (seqMode === 'form') {
    return (
      <EditorSequencia
        form={seqForm}
        setForm={setSeqForm}
        editando={!!seqEditId}
        selecionado={selectedStepIndex}
        setSelecionado={setSelectedStepIndex}
        salvando={savingSequence}
        sujo={sujo}
        mostrarErros={mostrarErros}
        onSalvar={handleSaveSequence}
        onCancelar={handleCancelar}
      />
    );
  }

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ── Cabeçalho ─────────────────────────────────────────────────────── */}
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4 px-6 md:px-8 pt-8 pb-6">
        <SplitHeadline
          text="CRM "
          highlight="Sequências"
          subtitle="Cadências de follow-up: cada passo vira uma atividade no lead, no dia e na hora marcados."
        />
        <div className="flex items-center gap-2">
          {sequences.length > 0 && (
            <div className="relative">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input
                value={busca}
                onChange={e => setBusca(e.target.value)}
                placeholder="Buscar sequência"
                className="h-10 w-48 md:w-56 pl-8 pr-8 rounded-xl bg-dark-card border border-black/10 dark:border-white/10 text-sm text-dark-text placeholder:text-slate-400 focus:outline-none focus:border-violet-500/60 transition-colors"
              />
              {busca && (
                <button type="button" onClick={() => setBusca('')} title="Limpar busca" className="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 rounded-md flex items-center justify-center text-slate-400 hover:text-dark-text">
                  <X size={13} />
                </button>
              )}
            </div>
          )}
          <button type="button" onClick={abrirNova} className={designSystem.button.principal}>
            <Plus size={16} /> Nova sequência
          </button>
        </div>
      </div>

      {/* ── Lista ─────────────────────────────────────────────────────────── */}
      <div className="px-6 md:px-8 pb-10">
        {carregando ? (
          <CarregandoBloco />
        ) : sequences.length === 0 ? (
          <div className="gf-cartao">
            <EstadoVazio
              Icone={Zap}
              titulo="Nenhuma sequência criada ainda."
              descricao="Uma sequência é uma cadência de follow-up — por exemplo, WhatsApp no dia em que o lead entra, ligação dois dias depois. Aplicada a um lead, cada passo vira uma atividade."
              acao={<button type="button" onClick={abrirNova} className={designSystem.button.principal}><Plus size={16} /> Criar sequência</button>}
            />
          </div>
        ) : filtradas.length === 0 ? (
          <EstadoVazio Icone={Search} titulo={`Nenhuma sequência com “${busca.trim()}”.`} acao={<button type="button" onClick={() => setBusca('')} className={designSystem.button.secundario}>Limpar busca</button>} />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 2xl:grid-cols-3 gap-5">
            {filtradas.map(seq => (
              <CartaoSequencia
                key={seq.id}
                seq={seq}
                duplicando={duplicandoId === seq.id}
                onEditar={() => abrirEdicao(seq)}
                onDuplicar={() => handleDuplicar(seq)}
                onExcluir={() => handleDeleteSequence(seq)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CrmSequencias;
