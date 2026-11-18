import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  ChevronLeft, ChevronUp, ChevronDown, Trash2, Plus, Save, Loader2, Play, Clock,
  AlertTriangle, AlertCircle, ChevronRight, CalendarOff, Hourglass, MousePointerClick, ListChecks,
} from 'lucide-react';
import { Cartao } from '../graficos';
import { EstadoVazio } from '../ui/EstadoVazio';
import { designSystem } from '../../design-system';
import { hojeLocal } from '../../lib/dataBanco';
import {
  CANAIS, canalDe, agruparPorDia, diasDosPassos, datasDosPassos, fmtData, ehFimDeSemana,
  foraDoHorario, horaSeguinte, passoNovo, textoDias, textoDuracao, validar,
  type FormSequencia, type Passo, type Problema, type RegraDatas,
} from './regras';

const ROTULO = 'text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400';
const AJUDA = 'text-[12px] leading-snug text-slate-500 dark:text-slate-400';
const CAMPO = 'w-full px-3 rounded-xl bg-black/[0.03] dark:bg-white/5 border border-black/10 dark:border-white/10 text-sm text-dark-text focus:outline-none focus:border-violet-500/60 placeholder:text-slate-400 dark:placeholder:text-slate-500 transition-colors';
const BOTAO_ICONE = 'w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 transition-colors disabled:opacity-30 disabled:pointer-events-none';

interface Props {
  form: FormSequencia;
  setForm: React.Dispatch<React.SetStateAction<FormSequencia>>;
  editando: boolean;
  selecionado: number | null;
  setSelecionado: (i: number | null) => void;
  salvando: boolean;
  sujo: boolean;
  /** Depois de uma tentativa de salvar com erro, os erros aparecem abertos. */
  mostrarErros: boolean;
  onSalvar: () => void;
  onCancelar: () => void;
}

export function EditorSequencia({ form, setForm, editando, selecionado, setSelecionado, salvando, sujo, mostrarErros, onSalvar, onCancelar }: Props) {
  const steps = form.steps;
  const grupos = useMemo(() => agruparPorDia(steps), [steps]);
  const dias = useMemo(() => diasDosPassos(steps), [steps]);
  const problemas = useMemo(() => validar(form), [form]);
  const erros = problemas.filter(p => p.nivel === 'erro');
  const avisos = problemas.filter(p => p.nivel === 'aviso');
  const [verAvisos, setVerAvisos] = useState(false);

  // Prévia: data de entrada de exemplo e qual regra simular.
  const [entrada, setEntrada] = useState(hojeLocal());
  const regra: RegraDatas = 'lead'; // botão e automação seguem a mesma regra
  const dataEntrada = useMemo(() => new Date((entrada || hojeLocal()) + 'T12:00:00'), [entrada]);
  const datas = useMemo(() => datasDosPassos(form, dataEntrada, regra), [form, dataEntrada, regra]);
  const pularNaPrevia = form.skip_weekends ?? true;

  // Passo recém-criado: foca o título para já digitar por cima de "Nova atividade".
  const focarTitulo = useRef(false);

  // ── Operações nos passos (só estado local; o servidor recebe a lista inteira ao salvar) ──
  const atualizar = (i: number, campo: keyof Passo, valor: any) => {
    setForm(f => {
      const s = [...f.steps];
      s[i] = { ...s[i], [campo]: valor };
      return { ...f, steps: s };
    });
  };

  const adicionar = (pos: number, espera: number, hora = '09:00') => {
    setForm(f => {
      const s = [...f.steps];
      s.splice(pos, 0, passoNovo(espera, hora));
      return { ...f, steps: s };
    });
    focarTitulo.current = true;
    setSelecionado(pos);
  };

  // Trocar de lugar: o passo assume o lugar (o dia) do vizinho e vice-versa — as esperas
  // ficam onde estão, então nenhum outro passo muda de data.
  const mover = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= steps.length) return;
    setForm(f => {
      const s = [...f.steps];
      const a = s[i], b = s[j];
      s[i] = { ...b, day_offset: a.day_offset };
      s[j] = { ...a, day_offset: b.day_offset };
      return { ...f, steps: s };
    });
    if (selecionado === i) setSelecionado(j);
    else if (selecionado === j) setSelecionado(i);
  };

  // Excluir: a espera do passo apagado passa para o seguinte, que continua na mesma data.
  const excluir = (i: number) => {
    setForm(f => {
      const s = [...f.steps];
      if (i + 1 < s.length) {
        s[i + 1] = { ...s[i + 1], day_offset: (Number(s[i + 1].day_offset) || 0) + (Number(s[i].day_offset) || 0) };
      }
      s.splice(i, 1);
      return { ...f, steps: s };
    });
    if (selecionado === i) setSelecionado(steps.length > 1 ? Math.min(i, steps.length - 2) : null);
    else if (selecionado !== null && selecionado > i) setSelecionado(selecionado - 1);
  };

  const problemasDoPasso = (i: number) => problemas.filter(p => p.passo === i);
  const passo = selecionado !== null ? steps[selecionado] : undefined;

  return (
    <div className="min-h-screen bg-dark-bg">
      {/* ── Topo: nome, descrição, fim de semana, salvar ─────────────────── */}
      <div className="px-6 md:px-8 pt-6 pb-5">
        <button type="button" onClick={onCancelar} className="inline-flex items-center gap-1 text-[13px] font-medium text-slate-500 dark:text-slate-400 hover:text-dark-text transition-colors">
          <ChevronLeft size={15} /> Sequências
        </button>

        <div className="mt-3 flex flex-col lg:flex-row lg:items-start gap-4 lg:justify-between">
          <div className="flex-1 min-w-0 max-w-3xl">
            <p className={ROTULO}>{editando ? 'Editando sequência' : 'Nova sequência'}</p>
            <input
              value={form.name}
              onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
              autoFocus={!editando}
              onFocus={e => { if (!editando && form.name === 'Nova Sequência') e.currentTarget.select(); }}
              placeholder="Nome da sequência"
              className={`mt-1 w-full bg-transparent text-2xl font-black tracking-tight text-dark-text placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none border-b-2 pb-1 transition-colors ${
                mostrarErros && !form.name.trim() ? 'border-rose-500/60' : 'border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-violet-500/60'
              }`}
            />
            <textarea
              value={form.description}
              onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
              rows={Math.min(4, Math.max(1, form.description.split('\n').length))}
              placeholder="Para que serve esta sequência? (opcional)"
              className="mt-2 w-full bg-transparent text-sm text-slate-600 dark:text-slate-300 placeholder:text-slate-400 dark:placeholder:text-slate-500 focus:outline-none resize-none border-b border-transparent hover:border-black/10 dark:hover:border-white/10 focus:border-violet-500/60 pb-1 transition-colors"
              style={{ fieldSizing: 'content' } as React.CSSProperties}
            />
          </div>

          <div className="flex items-center gap-2 shrink-0 flex-wrap">
            {sujo && (
              <span className="inline-flex items-center gap-1.5 h-8 px-3 rounded-full bg-amber-500/10 text-amber-700 dark:text-amber-400 text-[12px] font-semibold">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-500" /> Alterações não salvas
              </span>
            )}
            <button type="button" onClick={onCancelar} className={designSystem.button.secundario}>Cancelar</button>
            <button type="button" onClick={onSalvar} disabled={salvando} className={designSystem.button.principal}>
              {salvando ? <Loader2 size={16} className="animate-spin" /> : <Save size={16} />}
              {salvando ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </div>

        {/* Pular fim de semana */}
        <div className="mt-4 flex items-start gap-3 max-w-3xl">
          <button
            type="button"
            role="switch"
            aria-checked={!!form.skip_weekends}
            onClick={() => setForm(f => ({ ...f, skip_weekends: !f.skip_weekends }))}
            className={`mt-0.5 w-10 h-[22px] rounded-full relative shrink-0 transition-colors ${form.skip_weekends ? 'bg-violet-600' : 'bg-slate-300 dark:bg-white/15'}`}
          >
            <span className={`absolute left-0 top-[3px] w-4 h-4 rounded-full bg-white shadow transition-transform ${form.skip_weekends ? 'translate-x-[21px]' : 'translate-x-[3px]'}`} />
          </button>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-dark-text flex items-center gap-1.5">
              <CalendarOff size={14} className="text-slate-400" /> Pular fins de semana
            </p>
            <p className={AJUDA}>
              {form.skip_weekends
                ? 'Sábado e domingo não contam na espera: "2 dias" depois de uma sexta cai na terça.'
                : 'Desligado: a espera conta todos os dias, inclusive sábado e domingo.'}
              {' '}Vale para o botão “Sequência” do lead e para a automação “Iniciar sequência”.
            </p>
          </div>
        </div>

        {/* Validação */}
        {problemas.length > 0 && (
          <div className="mt-4 max-w-3xl space-y-2">
            {erros.length > 0 && (
              <div className={`rounded-xl border px-3.5 py-2.5 ${mostrarErros ? 'border-rose-500/40 bg-rose-500/10' : 'border-rose-500/20 bg-rose-500/5'}`}>
                <p className="text-[12.5px] font-semibold text-rose-600 dark:text-rose-400 flex items-center gap-1.5">
                  <AlertCircle size={14} /> {erros.length === 1 ? 'Falta corrigir 1 item para salvar' : `Faltam corrigir ${erros.length} itens para salvar`}
                </p>
                <ListaProblemas itens={erros} onIr={setSelecionado} />
              </div>
            )}
            {avisos.length > 0 && (
              <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 px-3.5 py-2">
                <button type="button" onClick={() => setVerAvisos(v => !v)} className="w-full text-left text-[12.5px] font-semibold text-amber-700 dark:text-amber-400 flex items-center gap-1.5">
                  <AlertTriangle size={14} /> {avisos.length === 1 ? '1 aviso' : `${avisos.length} avisos`} <span className="font-normal text-slate-500 dark:text-slate-400">· não impedem salvar</span>
                  <ChevronRight size={14} className={`ml-auto transition-transform ${verAvisos ? 'rotate-90' : ''}`} />
                </button>
                {verAvisos && <ListaProblemas itens={avisos} onIr={setSelecionado} />}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── Corpo: linha do tempo | configurar passo ─────────────────────── */}
      <div className="px-6 md:px-8 pb-10 grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_380px] gap-5 items-start">

        {/* Linha do tempo */}
        <Cartao
          className="lg:col-start-1"
          titulo="Passos"
          legenda={steps.length
            ? `${steps.length} ${steps.length === 1 ? 'passo' : 'passos'} · dura ${textoDuracao(steps, form.skip_weekends ?? true)} · datas de exemplo para entrada em ${fmtData(dataEntrada)}`
            : 'Cada passo vira uma atividade no lead, no dia e na hora marcados.'}
        >
          {/* Início */}
          <div className="flex gap-3">
            <div className="flex flex-col items-center w-12 shrink-0">
              <span className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center justify-center"><Play size={13} className="fill-current" /></span>
              {steps.length > 0 && <div className="flex-1 w-px bg-black/10 dark:bg-white/10 my-1 min-h-[12px]" />}
            </div>
            <div className="flex-1 min-w-0 pb-4 pt-1">
              <p className="text-[13.5px] font-semibold text-dark-text">Lead entra na sequência</p>
              <p className={AJUDA}>Pelo botão “Sequência” no lead ou por uma automação. Exemplo: {fmtData(dataEntrada)}.</p>
            </div>
          </div>

          {steps.length === 0 ? (
            <EstadoVazio
              Icone={ListChecks}
              titulo="Nenhum passo ainda."
              descricao="Comece pelo primeiro contato — por exemplo, um WhatsApp no dia em que o lead entra."
              acao={<button type="button" onClick={() => adicionar(0, 0)} className={designSystem.button.principal}><Plus size={16} /> Adicionar o primeiro passo</button>}
              className="py-8"
            />
          ) : (
            <>
              {grupos.map((g, gi) => {
                const primeiro = g.indices[0];
                const ultimo = g.indices[g.indices.length - 1];
                const espera = Number(steps[primeiro].day_offset) || 0;
                const data = datas[primeiro];
                const fds = data && ehFimDeSemana(data);
                const anterior = gi > 0 ? grupos[gi - 1].dia : null;
                return (
                  <div key={gi} className="flex gap-3">
                    <div className="flex flex-col items-center w-12 shrink-0">
                      <span className="numero h-8 min-w-[40px] px-2 rounded-lg bg-violet-500/10 text-violet-600 dark:text-violet-300 text-[12.5px] font-semibold flex items-center justify-center">D{g.dia}</span>
                      <div className="flex-1 w-px bg-black/10 dark:bg-white/10 my-1 min-h-[12px]" />
                    </div>
                    <div className="flex-1 min-w-0 pb-5">
                      <div className="flex flex-wrap items-baseline gap-x-2 pt-1.5">
                        <p className="text-[13.5px] font-semibold text-dark-text">
                          {anterior === null
                            ? (g.dia === 0 ? 'No dia da entrada' : `${textoDias(g.dia, pularNaPrevia)} depois da entrada`)
                            : `${textoDias(espera, pularNaPrevia)} depois do D${anterior}`}
                        </p>
                        {data && (
                          <span className={`text-[12px] ${fds ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
                            {fmtData(data)}{fds ? ' · fim de semana' : ''}
                          </span>
                        )}
                      </div>

                      <div className="mt-2 space-y-1.5">
                        {g.indices.map(i => (
                          <LinhaPasso
                            key={i}
                            passo={steps[i]}
                            indice={i}
                            total={steps.length}
                            selecionado={selecionado === i}
                            problemas={problemasDoPasso(i)}
                            onSelecionar={() => setSelecionado(i)}
                            onMover={dir => mover(i, dir)}
                            onExcluir={() => excluir(i)}
                          />
                        ))}
                      </div>

                      <button
                        type="button"
                        onClick={() => adicionar(ultimo + 1, 0, horaSeguinte(steps[ultimo].time_of_day))}
                        className="mt-1.5 inline-flex items-center gap-1 h-7 px-2 -ml-2 rounded-lg text-[12.5px] font-medium text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10 transition-colors"
                      >
                        <Plus size={13} /> Passo neste dia
                      </button>
                    </div>
                  </div>
                );
              })}

              {/* Fim: novo dia */}
              <div className="flex gap-3">
                <div className="flex flex-col items-center w-12 shrink-0">
                  <span className="w-8 h-8 rounded-full border border-dashed border-black/15 dark:border-white/20 text-slate-400 flex items-center justify-center"><Plus size={14} /></span>
                </div>
                <div className="flex-1 min-w-0">
                  <button
                    type="button"
                    onClick={() => adicionar(steps.length, 1)}
                    className="w-full h-10 rounded-xl border border-dashed border-black/15 dark:border-white/15 text-[13px] font-semibold text-slate-500 dark:text-slate-400 hover:text-violet-600 dark:hover:text-violet-400 hover:border-violet-500/50 hover:bg-violet-500/5 transition-colors"
                  >
                    Adicionar passo em um novo dia
                  </button>
                </div>
              </div>
            </>
          )}
        </Cartao>

        {/* Configurar passo (fixo ao rolar no desktop) */}
        <div className="lg:col-start-2 lg:row-start-1 lg:row-span-2 lg:sticky lg:top-4">
          {passo && selecionado !== null ? (
            <ConfigPasso
              key={selecionado}
              passo={passo}
              indice={selecionado}
              total={steps.length}
              dia={dias[selecionado]}
              data={datas[selecionado]}
              pularNaPrevia={pularNaPrevia}
              focarTitulo={focarTitulo}
              onMudar={(campo, valor) => atualizar(selecionado, campo, valor)}
              onExcluir={() => excluir(selecionado)}
            />
          ) : (
            <Cartao titulo="Configurar passo">
              <EstadoVazio
                Icone={MousePointerClick}
                titulo={steps.length ? 'Escolha um passo na linha do tempo.' : 'Adicione um passo para configurar.'}
                descricao="Aqui você define o canal, quando ele acontece, o horário e a mensagem."
                className="py-8"
              />
            </Cartao>
          )}
        </div>

        {/* Prévia de datas */}
        {steps.length > 0 && (
          <Cartao
            className="lg:col-start-1"
            titulo="Prévia das datas"
            legenda="Simulação de quando cada atividade cai. Nada é criado aqui."
          >
            <div className="flex flex-wrap items-center gap-3 mb-4">
              <label className="flex items-center gap-2 text-[13px] text-slate-600 dark:text-slate-300">
                Se o lead entrar em
                <input type="date" value={entrada} onChange={e => setEntrada(e.target.value || hojeLocal())} className={`${CAMPO} h-9 w-auto`} />
              </label>
            </div>
            <div className="divide-y divide-black/5 dark:divide-white/5">
              {steps.map((s, i) => {
                const c = canalDe(s.type);
                const d = datas[i];
                const fds = d && ehFimDeSemana(d);
                return (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setSelecionado(i)}
                    className="w-full flex items-center gap-3 py-2 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.03] -mx-2 px-2 rounded-lg transition-colors"
                  >
                    <span className="numero w-9 shrink-0 text-[12px] text-slate-500 dark:text-slate-400">D{dias[i]}</span>
                    <span className={`w-6 h-6 rounded-md flex items-center justify-center shrink-0 ${c.fundo} ${c.texto}`}><c.Icone size={13} /></span>
                    <span className="w-20 shrink-0 text-[13px] font-medium text-dark-text">{c.tipo}</span>
                    <span className={`w-28 shrink-0 text-[13px] numero ${fds ? 'text-amber-600 dark:text-amber-400' : 'text-dark-text'}`}>
                      {d ? fmtData(d) : ''} {s.time_of_day || '09:00'}
                    </span>
                    <span className="flex-1 min-w-0 truncate text-[12.5px] text-slate-500 dark:text-slate-400 hidden sm:block">{s.title}</span>
                  </button>
                );
              })}
            </div>
            {datas.some(ehFimDeSemana) && (
              <p className={`${AJUDA} mt-3 flex items-start gap-1.5`}>
                <AlertTriangle size={13} className="text-amber-500 shrink-0 mt-0.5" />
                {pularNaPrevia
                  ? 'Em laranja, datas no fim de semana: o D0 não é adiado quando o lead entra num sábado ou domingo.'
                  : 'Em laranja, datas que caem no fim de semana.'}
              </p>
            )}
          </Cartao>
        )}
      </div>
    </div>
  );
}

function ListaProblemas({ itens, onIr }: { itens: Problema[]; onIr: (i: number) => void }) {
  return (
    <ul className="mt-1.5 space-y-0.5">
      {itens.map((p, k) => (
        <li key={k} className="text-[12.5px] text-slate-600 dark:text-slate-300">
          {p.passo !== undefined ? (
            <button type="button" onClick={() => onIr(p.passo!)} className="text-left hover:text-violet-600 dark:hover:text-violet-400 hover:underline underline-offset-2">
              {p.texto}
            </button>
          ) : p.texto}
        </li>
      ))}
    </ul>
  );
}

/** Uma linha da linha do tempo: canal, título, horário e as ações do passo. */
function LinhaPasso({ passo, indice, total, selecionado, problemas, onSelecionar, onMover, onExcluir }: {
  passo: Passo; indice: number; total: number; selecionado: boolean; problemas: Problema[];
  onSelecionar: () => void; onMover: (dir: -1 | 1) => void; onExcluir: () => void;
}) {
  const c = canalDe(passo.type);
  const temErro = problemas.some(p => p.nivel === 'erro');
  const acao = (e: React.MouseEvent, fn: () => void) => { e.stopPropagation(); fn(); };
  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onSelecionar}
      onKeyDown={e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onSelecionar(); } }}
      className={`group flex items-center gap-3 rounded-xl border px-3 py-2 cursor-pointer transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-violet-500/40 ${
        selecionado
          ? 'border-violet-500/60 bg-violet-500/[0.07] ring-1 ring-violet-500/25'
          : 'border-black/10 dark:border-white/10 bg-black/[0.015] dark:bg-white/[0.03] hover:border-violet-500/35'
      }`}
    >
      <span className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${c.fundo} ${c.texto}`}><c.Icone size={15} /></span>
      <div className="flex-1 min-w-0">
        <p className={`text-[13.5px] font-semibold truncate ${passo.title ? 'text-dark-text' : 'text-slate-400 italic font-normal'}`}>{passo.title || 'Sem título'}</p>
        <p className="text-[12px] text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
          {c.tipo}
          <span className="w-1 h-1 rounded-full bg-slate-300 dark:bg-slate-600" />
          <Clock size={11} /> <span className={foraDoHorario(passo.time_of_day) ? 'text-amber-600 dark:text-amber-400 font-semibold' : ''}>{passo.time_of_day || '09:00'}</span>
        </p>
      </div>
      {problemas.length > 0 && (
        <span title={problemas.map(p => p.texto).join('\n')} className={temErro ? 'text-rose-500' : 'text-amber-500'}>
          {temErro ? <AlertCircle size={15} /> : <AlertTriangle size={15} />}
        </span>
      )}
      <div className={`flex items-center gap-0.5 shrink-0 transition-opacity ${selecionado ? 'opacity-100' : 'opacity-60 group-hover:opacity-100'}`}>
        <button type="button" title="Subir (troca de lugar com o passo de cima)" onClick={e => acao(e, () => onMover(-1))} disabled={indice === 0} className={`${BOTAO_ICONE} hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10`}>
          <ChevronUp size={15} />
        </button>
        <button type="button" title="Descer (troca de lugar com o passo de baixo)" onClick={e => acao(e, () => onMover(1))} disabled={indice === total - 1} className={`${BOTAO_ICONE} hover:text-violet-600 dark:hover:text-violet-400 hover:bg-violet-500/10`}>
          <ChevronDown size={15} />
        </button>
        <button type="button" title="Excluir passo (os seguintes mantêm as datas)" onClick={e => acao(e, onExcluir)} className={`${BOTAO_ICONE} hover:text-rose-500 hover:bg-rose-500/10`}>
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
}

/** Painel da direita: tudo o que define um passo. */
function ConfigPasso({ passo, indice, total, dia, data, pularNaPrevia, focarTitulo, onMudar, onExcluir }: {
  passo: Passo; indice: number; total: number; dia: number; data?: Date; pularNaPrevia: boolean;
  focarTitulo: React.MutableRefObject<boolean>;
  onMudar: (campo: keyof Passo, valor: any) => void;
  onExcluir: () => void;
}) {
  const tituloRef = useRef<HTMLInputElement>(null);
  // Sem dependências de propósito: confere a marca a cada render (o passo novo pode
  // nascer no mesmo índice do selecionado, sem remontar o painel).
  useEffect(() => {
    if (focarTitulo.current) {
      focarTitulo.current = false;
      tituloRef.current?.focus();
      tituloRef.current?.select();
    }
  });

  const c = canalDe(passo.type);
  const espera = Number(passo.day_offset);
  const esperaInvalida = !Number.isInteger(espera) || espera < 0;
  const fora = !!passo.time_of_day && foraDoHorario(passo.time_of_day);
  const tipoForaDaLista = !!passo.type && !CANAIS.some(k => k.tipo === passo.type);

  return (
    <Cartao
      titulo={`Configurar passo ${indice + 1} de ${total}`}
      legenda={`D${dia}${data ? ` · ${fmtData(data)}` : ''} · ${c.tipo}`}
      acao={
        <button type="button" onClick={onExcluir} title="Excluir passo" className="h-8 px-2.5 -mr-1 rounded-lg inline-flex items-center gap-1.5 text-[12.5px] font-medium text-slate-500 hover:text-rose-500 hover:bg-rose-500/10 transition-colors">
          <Trash2 size={14} /> Excluir
        </button>
      }
    >
      <div className="space-y-5">
        {/* Canal */}
        <div>
          <p className={ROTULO}>Canal</p>
          <div className="mt-2 grid grid-cols-5 gap-1.5">
            {CANAIS.map(k => {
              const sel = passo.type === k.tipo;
              return (
                <button
                  key={k.tipo}
                  type="button"
                  onClick={() => onMudar('type', k.tipo)}
                  className={`flex flex-col items-center gap-1 py-2 rounded-xl border text-[11px] font-semibold transition-colors ${
                    sel ? `${k.borda} ${k.fundo} ${k.texto}` : 'border-black/10 dark:border-white/10 text-slate-500 dark:text-slate-400 hover:border-violet-500/35 hover:text-dark-text'
                  }`}
                >
                  <k.Icone size={16} />
                  {k.tipo}
                </button>
              );
            })}
          </div>
          {tipoForaDaLista && <p className={`${AJUDA} mt-1.5`}>Tipo atual: “{passo.type}”. Escolha um canal acima para trocar.</p>}
        </div>

        {/* Quando */}
        <div>
          <p className={ROTULO}>Quando</p>
          <div className="mt-2 flex items-center gap-2">
            <Hourglass size={14} className="text-slate-400 shrink-0" />
            <div className="flex items-center rounded-xl border border-black/10 dark:border-white/10 overflow-hidden">
              <button type="button" onClick={() => onMudar('day_offset', Math.max(0, (Number(passo.day_offset) || 0) - 1))} className="w-8 h-9 text-slate-500 hover:bg-black/[0.04] dark:hover:bg-white/5 hover:text-dark-text">−</button>
              <input
                type="number"
                min={0}
                value={passo.day_offset}
                onChange={e => onMudar('day_offset', parseInt(e.target.value) || 0)}
                className={`numero w-12 h-9 text-center text-sm font-semibold bg-transparent text-dark-text focus:outline-none border-x border-black/10 dark:border-white/10 ${esperaInvalida ? 'text-rose-500' : ''}`}
              />
              <button type="button" onClick={() => onMudar('day_offset', (Number(passo.day_offset) || 0) + 1)} className="w-8 h-9 text-slate-500 hover:bg-black/[0.04] dark:hover:bg-white/5 hover:text-dark-text">+</button>
            </div>
            <span className="text-[13px] text-slate-600 dark:text-slate-300">
              {espera === 1 ? 'dia' : 'dias'} depois {indice === 0 ? 'da entrada do lead' : 'do passo anterior'}
            </span>
          </div>
          <p className={`${AJUDA} mt-1.5`}>
            {espera === 0
              ? (indice === 0 ? 'Acontece no mesmo dia em que o lead entra.' : 'Acontece no mesmo dia do passo anterior.')
              : `Cai no D${dia}${data ? ` (${fmtData(data)} no exemplo)` : ''}${pularNaPrevia ? ', contando só dias úteis' : ''}.`}
            {indice < total - 1 && ' Mudar a espera move junto os passos seguintes.'}
          </p>

          <div className="mt-3 flex items-center gap-2">
            <Clock size={14} className="text-slate-400 shrink-0" />
            <input
              type="time"
              value={passo.time_of_day || '09:00'}
              onChange={e => onMudar('time_of_day', e.target.value)}
              className={`${CAMPO} h-9 w-28 numero font-semibold`}
            />
            <span className={`text-[12.5px] ${fora ? 'text-amber-600 dark:text-amber-400 font-semibold' : 'text-slate-500 dark:text-slate-400'}`}>
              {fora ? 'fora de 8h–21h · risco de bloqueio' : 'horário da atividade'}
            </span>
          </div>
        </div>

        {/* Título */}
        <div>
          <label className={ROTULO} htmlFor="seq-passo-titulo">Título da atividade</label>
          <input
            id="seq-passo-titulo"
            ref={tituloRef}
            type="text"
            value={passo.title}
            onChange={e => onMudar('title', e.target.value)}
            placeholder="Ex.: Mensagem de apresentação"
            className={`${CAMPO} h-10 mt-2 font-semibold`}
          />
          <p className={`${AJUDA} mt-1.5`}>É o nome da atividade que aparece no lead.</p>
        </div>

        {/* Mensagem */}
        <div>
          <div className="flex items-center justify-between">
            <label className={ROTULO} htmlFor="seq-passo-obs">Mensagem / roteiro</label>
            <span className="text-[11px] text-slate-400">opcional</span>
          </div>
          <textarea
            id="seq-passo-obs"
            value={passo.observations || ''}
            onChange={e => onMudar('observations', e.target.value)}
            rows={5}
            placeholder="Texto da mensagem, script da ligação ou notas para quem executa…"
            className={`${CAMPO} py-2.5 mt-2 resize-y min-h-[100px] text-[13px]`}
          />
          <p className={`${AJUDA} mt-1.5`}>Vai nas observações da atividade.</p>
        </div>
      </div>
    </Cartao>
  );
}

export default EditorSequencia;
