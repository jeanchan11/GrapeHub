// Popup do fechamento (Métricas do Comercial › Lista de Fechamentos).
// Mostra o lead do CRM por trás do fechamento — anúncio, perfil e jornada — e deixa
// mudar a origem ou tirar da lista. Dados: GET /api/fechamentos/:id/detalhe
// (src/routes/fechamento-detalhe.ts).
import React, { useEffect, useState } from 'react';
import { X, Megaphone, UserRound, Route, Trash2, ArrowRight } from 'lucide-react';
import { Modal } from './ui/Modal';
import { CarregandoBloco } from './LoadingSpinner';
import { dataDoBanco } from '../lib/dataBanco';
import { toast } from '../lib/toast';

interface Props {
  id: number;
  onClose: () => void;
  /** Origem mudou ou o fechamento saiu da lista: quem abriu recarrega. */
  onAlterado: () => void;
}

const brl = (v: any) => (Number(String(v ?? '0').replace(/[R$\s]/g, '').replace(',', '.')) || 0)
  .toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const dataBR = (d?: string | null) => (d ? new Date(d).toLocaleDateString('pt-BR') : '—');
const diaBR = (d?: string | null) => (d ? dataDoBanco(d).toLocaleDateString('pt-BR') : '—');

const Campo: React.FC<{ rotulo: string; valor?: React.ReactNode; largo?: boolean }> = ({ rotulo, valor, largo }) => (
  <div className={largo ? 'col-span-2' : ''}>
    <p className="text-[11px] text-slate-500 dark:text-slate-400">{rotulo}</p>
    <p className="text-[13px] text-dark-text break-words">{valor || <span className="text-slate-400">—</span>}</p>
  </div>
);

const Bloco: React.FC<{ titulo: string; Icone: any; children: React.ReactNode }> = ({ titulo, Icone, children }) => (
  <div className="rounded-xl border border-black/10 dark:border-white/10 p-4">
    <div className="flex items-center gap-2 mb-3">
      <Icone size={14} className="text-violet-500" />
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</h3>
    </div>
    {children}
  </div>
);

export default function FechamentoPopup({ id, onClose, onAlterado }: Props) {
  const [d, setD] = useState<any>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);
  const [confirmarSaida, setConfirmarSaida] = useState(false);
  const [verTudo, setVerTudo] = useState(false);

  useEffect(() => {
    fetch(`/api/fechamentos/${id}/detalhe`)
      .then(async r => { if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Erro ao carregar'); return r.json(); })
      .then(setD)
      .catch(e => setErro(e.message));
  }, [id]);

  // Esc e clique fora: o <Modal> já cuida.

  const mudarOrigem = async (origem: string) => {
    if (!d || salvando || (d.fechamento.origem || '').toLowerCase() === origem) return;
    setSalvando(true);
    try {
      const r = await fetch(`/api/fechamentos/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ origem }) });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não foi possível mudar a origem');
      setD({ ...d, fechamento: { ...d.fechamento, origem } });
      onAlterado();
    } catch (e: any) { toast.error(e.message); } finally { setSalvando(false); }
  };

  const tirarDaLista = async () => {
    setSalvando(true);
    try {
      const r = await fetch(`/api/fechamentos/${id}`, { method: 'DELETE' });
      if (!r.ok) throw new Error((await r.json().catch(() => ({}))).error || 'Não foi possível tirar da lista');
      toast.success('Fechamento retirado da lista');
      onAlterado();
      onClose();
    } catch (e: any) { toast.error(e.message); setSalvando(false); }
  };

  const f = d?.fechamento;
  const l = d?.lead;
  const origem = (f?.origem || '').toLowerCase();
  const diasAteFechar = l?.created_at && f?.dia
    ? Math.max(0, Math.round((dataDoBanco(f.dia).getTime() - new Date(new Date(l.created_at).toDateString()).getTime() - 12 * 3600000) / 86400000))
    : null;
  // Jornada: entradas e trocas de etapa (o resto do histórico é tarefa/automação)
  const movimentos = (d?.historico || []).filter((h: any) => h.para || h.de);
  const visiveis = verTudo ? movimentos : movimentos.slice(-6);
  const temAnuncio = l && (l.utm_campaign || l.utm_creative || l.utm_position);

  return (
    <Modal isOpen onClose={onClose} semCabecalho semPadding maxWidth="max-w-3xl" className="max-h-[90vh]">
      <div className="overflow-y-auto">
        {!d && !erro && <CarregandoBloco className="py-24" />}
        {erro && <div className="p-8 text-center text-sm text-rose-500">{erro}</div>}

        {f && (
          <>
            {/* Cabeçalho */}
            <div className="flex items-start gap-4 p-6 border-b border-black/10 dark:border-white/10">
              <div className="w-11 h-11 rounded-xl bg-violet-500/15 flex items-center justify-center text-violet-500 font-bold shrink-0">
                {(f.nome || '?').trim().charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0 flex-1">
                <h2 className="text-[17px] font-semibold text-dark-text leading-snug">{f.nome || '—'}</h2>
                {f.lead_nome && f.lead_nome !== f.nome && <p className="text-[12.5px] text-slate-500">{f.lead_nome}</p>}
                <p className="mt-1 text-[12.5px] text-slate-500">
                  Fechou em <span className="text-dark-text">{diaBR(f.dia)}</span>
                  {l?.responsavel && <> · com <span className="text-dark-text">{String(l.responsavel).split(/\s+/)[0]}</span></>}
                </p>
              </div>
              <div className="text-right shrink-0">
                <p className="numero text-[18px] font-semibold text-emerald-500">{brl(f.valor)}</p>
                <button onClick={onClose} className="mt-2 p-1 rounded-lg text-slate-400 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5" aria-label="Fechar">
                  <X size={16} />
                </button>
              </div>
            </div>

            <div className="p-6 space-y-4">
              {/* Origem do fechamento (é o que divide Campanhas × Indicação no dashboard) */}
              <div className="flex flex-wrap items-center gap-3">
                <span className="text-[12px] text-slate-500">Origem no dashboard</span>
                <div className="inline-flex rounded-lg border border-black/10 dark:border-white/10 p-0.5">
                  {[{ id: 'campanhas', rotulo: 'Campanhas', cor: 'bg-pink-500' }, { id: 'indicação', rotulo: 'Indicação', cor: 'bg-violet-500' }].map(o => {
                    const ativo = origem.includes(o.id.slice(0, 5));
                    return (
                      <button key={o.id} disabled={!d.pode_editar || salvando} onClick={() => mudarOrigem(o.id)}
                        className={`h-7 px-3 rounded-md text-[12px] font-medium transition-colors ${ativo ? `${o.cor} text-white` : 'text-slate-500 hover:text-dark-text disabled:hover:text-slate-500'} disabled:cursor-default`}>
                        {o.rotulo}
                      </button>
                    );
                  })}
                </div>
                {!origem && <span className="text-[12px] text-amber-500">sem origem: não entra em nenhum dos dois</span>}
              </div>

              {!l && (
                <p className="rounded-xl border border-dashed border-black/10 dark:border-white/10 p-4 text-[13px] text-slate-500">
                  Não achei o lead deste fechamento no CRM (o vínculo é pelo nome). Só os dados do fechamento estão disponíveis.
                </p>
              )}

              {l && (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Bloco titulo="De onde veio" Icone={Megaphone}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Campo rotulo="Origem do lead" valor={l.origem} />
                      <Campo rotulo="Plataforma" valor={l.utm_platform} />
                      {temAnuncio ? (
                        <>
                          <Campo rotulo="Campanha" valor={l.utm_campaign} largo />
                          <Campo rotulo="Criativo" valor={l.utm_creative} />
                          <Campo rotulo="Anúncio" valor={l.utm_position} />
                        </>
                      ) : (
                        <p className="col-span-2 text-[12.5px] text-slate-500">Sem dados de anúncio: o lead entrou sem UTM.</p>
                      )}
                    </div>
                  </Bloco>

                  <Bloco titulo="Perfil" Icone={UserRound}>
                    <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                      <Campo rotulo="Faturamento" valor={l.faturamento || f.faturamento} />
                      <Campo rotulo="Nicho" valor={l.nicho} />
                      <Campo rotulo="Tempo de advocacia" valor={l.tempo_oab} />
                      <Campo rotulo="Cidade" valor={[l.form_cidade || f.cidade, l.form_estado].filter(Boolean).join(' / ') || l.office_location} />
                      <Campo rotulo="Telefone" valor={l.telefone} />
                      <Campo rotulo="Instagram" valor={l.instagram} />
                      <Campo rotulo="E-mail" valor={l.email} largo />
                    </div>
                  </Bloco>

                  <div className="md:col-span-2">
                    <Bloco titulo="Jornada" Icone={Route}>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-x-4 gap-y-3 mb-4">
                        <Campo rotulo="Entrou no CRM" valor={dataBR(l.created_at)} />
                        <Campo rotulo="Reuniões" valor={d.reunioes.length ? d.reunioes.map((r: any) => dataBR(r.meeting_date)).join(', ') : null} />
                        <Campo rotulo="Fechou" valor={<>{diaBR(f.dia)}{diasAteFechar != null && <span className="text-slate-500"> · {diasAteFechar} {diasAteFechar === 1 ? 'dia' : 'dias'}</span>}</>} />
                        <Campo rotulo="Etapa atual no CRM" valor={[l.kanban, l.etapa].filter(Boolean).join(' › ')} />
                        {l.forma_pagamento && <Campo rotulo="Forma de pagamento" valor={l.forma_pagamento} />}
                      </div>
                      {movimentos.length > 0 && (
                        <div className="border-t border-black/10 dark:border-white/10 pt-3 space-y-1.5">
                          {movimentos.length > 6 && (
                            <button onClick={() => setVerTudo(v => !v)} className="text-[12px] text-violet-500 hover:underline mb-1">
                              {verTudo ? 'Mostrar só as últimas' : `Ver as ${movimentos.length} movimentações`}
                            </button>
                          )}
                          {visiveis.map((h: any, i: number) => (
                            <div key={i} className="flex items-center gap-2 text-[12.5px]">
                              <span className="w-[74px] shrink-0 text-slate-500">{dataBR(h.created_at)}</span>
                              <span className="text-slate-500 truncate max-w-[30%]">{h.de || 'Entrada'}</span>
                              <ArrowRight size={11} className="text-slate-400 shrink-0" />
                              <span className="text-dark-text font-medium truncate">{h.para || '—'}</span>
                              {h.autor && <span className="ml-auto shrink-0 text-[11.5px] text-slate-400">{h.autor}</span>}
                            </div>
                          ))}
                        </div>
                      )}
                    </Bloco>
                  </div>
                </div>
              )}
            </div>

            {/* Tirar da lista */}
            {d.pode_editar && (
              <div className="px-6 pb-6">
                {!confirmarSaida ? (
                  <button onClick={() => setConfirmarSaida(true)}
                    className="inline-flex items-center gap-1.5 text-[12.5px] text-rose-500 hover:text-rose-600">
                    <Trash2 size={13} /> Tirar da lista de fechamentos
                  </button>
                ) : (
                  <div className="flex flex-wrap items-center gap-3 rounded-xl bg-rose-500/10 px-4 py-3">
                    <p className="flex-1 min-w-[200px] text-[12.5px] text-rose-600 dark:text-rose-400">
                      Tirar <b className="font-semibold">{f.nome}</b> ({brl(f.valor)}) dos fechamentos? O lead no CRM não muda, e o registro fica guardado.
                    </p>
                    <button onClick={() => setConfirmarSaida(false)} className="h-8 px-3 rounded-lg text-[12.5px] text-slate-500 hover:text-dark-text">Cancelar</button>
                    <button onClick={tirarDaLista} disabled={salvando}
                      className="h-8 px-3 rounded-lg text-[12.5px] font-medium bg-rose-500 text-white hover:bg-rose-600 disabled:opacity-50">
                      {salvando ? 'Tirando…' : 'Tirar da lista'}
                    </button>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
}
