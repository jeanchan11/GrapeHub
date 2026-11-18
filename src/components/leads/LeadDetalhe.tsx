// Detalhe do lead (Comercial › Leads). Redesenho de 18/11/2026.
// Contato, negócio, de onde veio, perfil e uma linha do tempo única (histórico de etapas +
// anotações). Dados: o próprio lead da lista + GET /api/crm-comercial/lead-history/:id
// (o servidor devolve os 50 mais recentes) + GET /api/crm-comercial/notes?lead_id=.
import React, { useEffect, useMemo, useState } from 'react';
import {
  X, Phone, Mail, Copy, MessageCircle, Megaphone, UserRound, Briefcase, Route, Instagram,
  ArrowRight, MessageSquare, CheckCircle2, XCircle, RotateCcw, Calendar, ListChecks, Zap, Clock, Inbox,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { Modal } from '../ui/Modal';
import { Abas } from '../ui/Abas';
import { EstadoVazio } from '../ui/EstadoVazio';
import { CarregandoBloco } from '../LoadingSpinner';
import { dataDoBanco } from '../../lib/dataBanco';
import { toast } from '../../lib/toast';
import {
  type Lead, type HistoryEntry, type Note, getLeadStatus, STATUS, brl, valorNum, formatPhone,
  linkWhatsApp, formatDateTime, timeAgo, tagNome, tagCor, corAvatar, inicial,
} from './leadsUtil';

// ── Peças ────────────────────────────────────────────────
const Campo: React.FC<{ rotulo: string; valor?: React.ReactNode; largo?: boolean }> = ({ rotulo, valor, largo }) => (
  <div className={`min-w-0 ${largo ? 'col-span-2' : ''}`}>
    <p className="text-[11px] text-slate-500 dark:text-slate-400">{rotulo}</p>
    <div className="text-[13px] text-dark-text break-words">{valor || <span className="text-slate-400">—</span>}</div>
  </div>
);

const Bloco: React.FC<{ titulo: string; Icone: LucideIcon; children: React.ReactNode; className?: string }> = ({ titulo, Icone, children, className = '' }) => (
  <div className={`rounded-xl border border-black/10 dark:border-white/10 p-4 ${className}`}>
    <div className="flex items-center gap-2 mb-3">
      <Icone size={14} className="text-violet-500" />
      <h3 className="text-[12px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">{titulo}</h3>
    </div>
    {children}
  </div>
);

const BotaoAcao: React.FC<{ Icone: LucideIcon; rotulo: string; onClick?: () => void; href?: string }> = ({ Icone, rotulo, onClick, href }) => {
  const cls = 'inline-flex items-center gap-1.5 h-8 px-3 rounded-lg border border-black/10 dark:border-white/10 text-[12.5px] font-medium text-slate-600 dark:text-slate-300 hover:text-dark-text hover:border-violet-500/40 transition-colors';
  if (href) return <a href={href} target="_blank" rel="noopener noreferrer" className={cls}><Icone size={13} /> {rotulo}</a>;
  return <button type="button" onClick={onClick} className={cls}><Icone size={13} /> {rotulo}</button>;
};

async function copiar(texto: string, oque: string) {
  try {
    await navigator.clipboard.writeText(texto);
    toast.success(`${oque} copiado`);
  } catch {
    toast.error(`Não foi possível copiar o ${oque.toLowerCase()}`);
  }
}

// ── Linha do tempo ───────────────────────────────────────
type GrupoEvento = 'etapa' | 'nota' | 'tarefa';
interface Evento {
  chave: string;
  quando: string;
  grupo: GrupoEvento;
  Icone: LucideIcon;
  cor: string; // classe de texto
  titulo: React.ReactNode;
  texto?: string | null;
  autor?: string | null;
}

function eventoDoHistorico(h: HistoryEntry, i: number): Evento {
  const t = h.action_type || '';
  const base = { chave: `h-${h.id ?? i}`, quando: h.created_at, autor: h.user_name || h.moved_by };
  if (t === 'stage_changed' || (!t && (h.from_coluna_name || h.to_coluna_name))) {
    return {
      ...base, grupo: 'etapa', Icone: ArrowRight, cor: 'text-violet-500',
      titulo: (
        <span className="inline-flex flex-wrap items-center gap-1.5">
          <span className="text-slate-500">{h.from_coluna_name || 'Entrada'}</span>
          <ArrowRight size={11} className="text-slate-400" />
          <span className="font-medium">{h.to_coluna_name || '?'}</span>
        </span>
      ),
    };
  }
  if (t === 'note_created') return { ...base, grupo: 'nota', Icone: MessageSquare, cor: 'text-amber-500', titulo: 'Anotação', texto: h.description };
  if (t === 'lead_won') return { ...base, grupo: 'etapa', Icone: CheckCircle2, cor: 'text-emerald-500', titulo: 'Lead ganho', texto: h.description };
  if (t === 'lead_lost') return { ...base, grupo: 'etapa', Icone: XCircle, cor: 'text-rose-500', titulo: 'Lead perdido', texto: h.description };
  if (t === 'reaberto') return { ...base, grupo: 'etapa', Icone: RotateCcw, cor: 'text-violet-500', titulo: 'Lead reaberto', texto: h.description };
  if (t === 'meeting_created') return { ...base, grupo: 'tarefa', Icone: Calendar, cor: 'text-violet-500', titulo: h.description || 'Reunião marcada' };
  if (t === 'call' || t.startsWith('call_')) return { ...base, grupo: 'tarefa', Icone: Phone, cor: 'text-sky-500', titulo: h.description || 'Ligação realizada' };
  if (t.startsWith('task_')) {
    return { ...base, grupo: 'tarefa', Icone: ListChecks, cor: t === 'task_completed' ? 'text-emerald-500' : 'text-slate-400',
      titulo: <>{h.description || 'Tarefa'}{h.task_type && <span className="text-slate-400"> · {h.task_type}</span>}</> };
  }
  if (t === 'whatsapp_trigger') return { ...base, grupo: 'tarefa', Icone: Inbox, cor: 'text-emerald-500', titulo: h.description || 'Entrada pelo WhatsApp' };
  if (t === 'automacao') return { ...base, grupo: 'tarefa', Icone: Zap, cor: 'text-amber-500', titulo: h.description || 'Automação executada' };
  return { ...base, grupo: 'tarefa', Icone: Clock, cor: 'text-slate-400', titulo: h.description || h.action_type || 'Ação registrada' };
}

function rotuloDia(iso: string): string {
  const d = new Date(iso);
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const dia = new Date(d); dia.setHours(0, 0, 0, 0);
  const diff = Math.round((hoje.getTime() - dia.getTime()) / 86400000);
  if (diff === 0) return 'Hoje';
  if (diff === 1) return 'Ontem';
  return d.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
}

type FiltroTempo = 'tudo' | GrupoEvento;

// ── Popup ────────────────────────────────────────────────
export default function LeadDetalhe({ lead, onClose, getToken }: { lead: Lead; onClose: () => void; getToken: () => Promise<string | null> }) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [notes, setNotes] = useState<Note[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(true);
  const [filtro, setFiltro] = useState<FiltroTempo>('tudo');

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (!token) return;
      try {
        const [hRes, nRes] = await Promise.all([
          fetch(`/api/crm-comercial/lead-history/${lead.id}`, { headers: { Authorization: `Bearer ${token}` } }),
          fetch(`/api/crm-comercial/notes?lead_id=${lead.id}`, { headers: { Authorization: `Bearer ${token}` } }),
        ]);
        if (hRes.ok) setHistory(await hRes.json());
        if (nRes.ok) setNotes(await nRes.json());
      } catch { /* silencioso, como antes */ }
      setLoadingHistory(false);
    })();
  }, [lead.id]);

  const status = getLeadStatus(lead);
  const st = STATUS[status];
  const valor = valorNum(lead.valor);
  const tags = lead.tags || [];
  const whats = lead.form_telefone_whatsapp && lead.form_telefone_whatsapp.replace(/\D/g, '') !== (lead.telefone || '').replace(/\D/g, '')
    ? lead.form_telefone_whatsapp : null;
  const linkWa = linkWhatsApp(lead.telefone) || linkWhatsApp(lead.form_telefone_whatsapp);
  const cidade = [lead.form_cidade, lead.form_estado].filter(Boolean).join(' / ') || lead.office_location || '';
  const temUtm = !!(lead.utm_platform || lead.utm_campaign || lead.utm_set || lead.utm_creative || lead.utm_position);

  // Linha do tempo: histórico + anotações; a anotação que já aparece como note_created no
  // histórico não se repete (mesma regra da tela antiga).
  const eventos = useMemo(() => {
    const jaNoHistorico = new Set(history.filter(h => h.action_type === 'note_created').map(h => h.description));
    const lista: Evento[] = [
      ...history.map(eventoDoHistorico),
      ...notes.filter(n => !jaNoHistorico.has(n.content)).map((n): Evento => ({
        chave: `n-${n.id}`, quando: n.created_at, grupo: 'nota', Icone: MessageSquare, cor: 'text-amber-500',
        titulo: 'Anotação', texto: n.content, autor: n.user_name,
      })),
    ];
    return lista.sort((a, b) => new Date(b.quando).getTime() - new Date(a.quando).getTime());
  }, [history, notes]);

  const contagem = (g: GrupoEvento) => eventos.filter(e => e.grupo === g).length;
  const visiveis = filtro === 'tudo' ? eventos : eventos.filter(e => e.grupo === filtro);
  // Agrupa por dia, mantendo a ordem (mais recente primeiro)
  const porDia: { dia: string; itens: Evento[] }[] = [];
  visiveis.forEach(e => {
    const dia = rotuloDia(e.quando);
    const ult = porDia[porDia.length - 1];
    if (ult && ult.dia === dia) ult.itens.push(e); else porDia.push({ dia, itens: [e] });
  });

  return (
    <Modal isOpen onClose={onClose} semCabecalho semPadding maxWidth="max-w-3xl" className="max-h-[90vh]">
      <div className="overflow-y-auto">
        {/* Cabeçalho */}
        <div className="flex items-start gap-4 p-6 border-b border-black/10 dark:border-white/10">
          <div className={`w-11 h-11 rounded-xl flex items-center justify-center font-bold shrink-0 ${corAvatar(lead.nome)}`}>
            {inicial(lead.nome)}
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-[17px] font-semibold text-dark-text leading-snug break-words">{lead.nome}</h2>
            {lead.form_nome_fantasia && lead.form_nome_fantasia !== lead.nome && (
              <p className="text-[12.5px] text-slate-500">{lead.form_nome_fantasia}</p>
            )}
            <div className="mt-1.5 flex flex-wrap items-center gap-2 text-[12.5px]">
              <span className={`inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11.5px] font-semibold ${st.pilula}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.ponto}`} />{st.rotulo}
              </span>
              {lead.coluna_nome && (
                <span className="inline-flex items-center gap-1.5 text-dark-text">
                  <span className="w-2 h-2 rounded-full shrink-0" style={{ background: lead.coluna_color || '#94a3b8' }} />
                  {lead.coluna_nome}
                </span>
              )}
              {lead.kanban_name && <span className="text-slate-500">· {lead.kanban_name}</span>}
            </div>
          </div>
          <div className="text-right shrink-0">
            <p className={`numero text-[18px] font-semibold ${valor ? 'text-dark-text' : 'text-slate-400'}`}>{valor != null ? brl.format(valor) : '—'}</p>
            <button onClick={onClose} aria-label="Fechar" className="mt-2 p-1 rounded-lg text-slate-400 hover:text-dark-text hover:bg-black/5 dark:hover:bg-white/5">
              <X size={16} />
            </button>
          </div>
        </div>

        <div className="p-6 space-y-4">
          {/* Ações rápidas (só aparecem com o dado) */}
          {(lead.telefone || lead.email || linkWa) && (
            <div className="flex flex-wrap items-center gap-2">
              {linkWa && <BotaoAcao Icone={MessageCircle} rotulo="Abrir WhatsApp" href={linkWa} />}
              {lead.telefone && <BotaoAcao Icone={Copy} rotulo="Copiar telefone" onClick={() => copiar(lead.telefone!, 'Telefone')} />}
              {lead.email && <BotaoAcao Icone={Copy} rotulo="Copiar e-mail" onClick={() => copiar(lead.email!, 'E-mail')} />}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Bloco titulo="Contato" Icone={Phone}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Campo rotulo="Telefone" valor={lead.telefone ? <span className="numero">{formatPhone(lead.telefone)}</span> : null} />
                {whats
                  ? <Campo rotulo="WhatsApp do formulário" valor={<span className="numero">{formatPhone(whats)}</span>} />
                  : <Campo rotulo="Instagram" valor={lead.instagram ? <span className="inline-flex items-center gap-1"><Instagram size={12} className="text-slate-400" />{lead.instagram}</span> : null} />}
                <Campo rotulo="E-mail" valor={lead.email ? <span className="inline-flex items-center gap-1"><Mail size={12} className="text-slate-400 shrink-0" />{lead.email}</span> : null} largo />
                {whats && <Campo rotulo="Instagram" valor={lead.instagram} />}
                {lead.form_nome_completo && lead.form_nome_completo !== lead.nome && <Campo rotulo="Nome no formulário" valor={lead.form_nome_completo} />}
              </div>
            </Bloco>

            <Bloco titulo="Negócio" Icone={Briefcase}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Campo rotulo="Pipeline" valor={lead.kanban_name} />
                <Campo rotulo="Etapa" valor={lead.coluna_nome} />
                <Campo rotulo="Responsável" valor={lead.responsavel_name} />
                <Campo rotulo="Valor" valor={valor != null ? <span className="numero">{brl.format(valor)}</span> : null} />
                <Campo rotulo="Criado em" valor={lead.created_at ? <>{formatDateTime(lead.created_at)} <span className="text-slate-400">· {timeAgo(lead.created_at)}</span></> : null} />
                <Campo rotulo="Mudou de etapa" valor={lead.etapa_updated_at ? <>{formatDateTime(lead.etapa_updated_at)} <span className="text-slate-400">· {timeAgo(lead.etapa_updated_at)}</span></> : null} />
                {lead.previsao && <Campo rotulo="Previsão" valor={dataDoBanco(lead.previsao).toLocaleDateString('pt-BR')} />}
                {lead.reunion_date && <Campo rotulo="Reunião" valor={lead.reunion_date} />}
                {lead.reunion_link && (
                  <Campo rotulo="Link da reunião" largo valor={<a href={lead.reunion_link} target="_blank" rel="noopener noreferrer" className="text-violet-600 dark:text-violet-400 hover:underline break-all">{lead.reunion_link}</a>} />
                )}
                {lead.forma_pagamento && <Campo rotulo="Forma de pagamento" valor={lead.forma_pagamento} />}
                {lead.prob_fechamento != null && <Campo rotulo="Chance de fechar" valor={<span className="numero">{lead.prob_fechamento}%</span>} />}
                {lead.lead_score != null && <Campo rotulo="Pontuação do lead" valor={<span className="numero">{lead.lead_score}</span>} />}
              </div>
            </Bloco>

            <Bloco titulo="De onde veio" Icone={Megaphone}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Campo rotulo="Origem" valor={(lead.origem || '').trim() || null} />
                <Campo rotulo="Plataforma" valor={lead.utm_platform} />
                {temUtm ? (
                  <>
                    <Campo rotulo="Campanha" valor={lead.utm_campaign} largo />
                    <Campo rotulo="Conjunto" valor={lead.utm_set} largo />
                    <Campo rotulo="Criativo" valor={lead.utm_creative} />
                    <Campo rotulo="Posicionamento" valor={lead.utm_position} />
                  </>
                ) : (
                  <p className="col-span-2 text-[12.5px] text-slate-500">Sem dados de anúncio: o lead entrou sem UTM.</p>
                )}
              </div>
            </Bloco>

            <Bloco titulo="Perfil" Icone={UserRound}>
              <div className="grid grid-cols-2 gap-x-4 gap-y-3">
                <Campo rotulo="Nome fantasia" valor={lead.form_nome_fantasia} />
                <Campo rotulo="Nicho" valor={lead.nicho} />
                <Campo rotulo="Faturamento" valor={lead.faturamento} />
                <Campo rotulo="Tempo de OAB" valor={lead.tempo_oab} />
                <Campo rotulo="Cidade" valor={cidade} />
                {lead.investimento && <Campo rotulo="Investimento" valor={lead.investimento} />}
                {lead.monthly_closings && <Campo rotulo="Fechamentos por mês" valor={lead.monthly_closings} />}
                {lead.closing_goal && <Campo rotulo="Meta de fechamentos" valor={lead.closing_goal} />}
              </div>
            </Bloco>
          </div>

          {(tags.length > 0 || lead.observacoes) && (
            <div className="rounded-xl border border-black/10 dark:border-white/10 p-4 space-y-3">
              {tags.length > 0 && (
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1.5">Tags</p>
                  <div className="flex flex-wrap gap-1.5">
                    {tags.map((t, i) => {
                      const cor = tagCor(t) || '#8b5cf6';
                      return (
                        <span key={i} className="inline-flex items-center gap-1.5 h-6 px-2.5 rounded-full text-[11.5px] font-medium" style={{ background: `${cor}22`, color: cor }}>
                          <span className="w-1.5 h-1.5 rounded-full" style={{ background: cor }} />{tagNome(t)}
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}
              {lead.observacoes && (
                <div>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400 mb-1">Observações</p>
                  <p className="text-[13px] text-dark-text whitespace-pre-wrap break-words">{lead.observacoes}</p>
                </div>
              )}
            </div>
          )}

          {/* Linha do tempo */}
          <Bloco titulo="Linha do tempo" Icone={Route}>
            {loadingHistory ? (
              <CarregandoBloco className="py-8" />
            ) : eventos.length === 0 ? (
              <EstadoVazio Icone={Clock} titulo="Nenhum registro no histórico." className="py-6" />
            ) : (
              <>
                <Abas<FiltroTempo>
                  variante="segmentado"
                  className="mb-4"
                  ativa={filtro}
                  onChange={setFiltro}
                  abas={[
                    { id: 'tudo', rotulo: 'Tudo', contador: eventos.length },
                    { id: 'etapa', rotulo: 'Etapas', contador: contagem('etapa') },
                    { id: 'nota', rotulo: 'Anotações', contador: contagem('nota') },
                    { id: 'tarefa', rotulo: 'Tarefas e automações', contador: contagem('tarefa') },
                  ]}
                />
                {visiveis.length === 0 ? (
                  <p className="py-4 text-center text-[12.5px] text-slate-500">Nada deste tipo no histórico.</p>
                ) : (
                  <div className="space-y-4">
                    {porDia.map(g => (
                      <div key={g.dia}>
                        <p className="text-[11px] font-semibold text-slate-500 dark:text-slate-400 mb-2">{g.dia}</p>
                        <div className="relative pl-6">
                          <div className="absolute left-[9px] top-1 bottom-1 w-px bg-black/10 dark:bg-white/10" />
                          {g.itens.map(e => (
                            <div key={e.chave} className="relative pb-3 last:pb-0">
                              <span className="absolute -left-6 top-0 w-[19px] h-[19px] rounded-full bg-dark-card border border-black/10 dark:border-white/10 flex items-center justify-center">
                                <e.Icone size={10} className={e.cor} />
                              </span>
                              <div className="text-[12.5px] text-dark-text leading-snug">{e.titulo}</div>
                              {e.texto && (
                                <p className="mt-1 text-[12.5px] text-slate-600 dark:text-slate-300 whitespace-pre-wrap break-words rounded-lg bg-black/[0.03] dark:bg-white/[0.04] px-3 py-2">{e.texto}</p>
                              )}
                              <p className="mt-0.5 text-[11px] text-slate-400">
                                {new Date(e.quando).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                                {e.autor && <> · {e.autor}</>}
                              </p>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {history.length >= 50 && (
                  <p className="mt-4 text-[11.5px] text-slate-400">O servidor manda só os 50 registros mais recentes do histórico; os mais antigos não aparecem aqui.</p>
                )}
              </>
            )}
          </Bloco>
        </div>
      </div>
    </Modal>
  );
}
