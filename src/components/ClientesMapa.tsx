import React, { useEffect, useMemo, useRef, useState } from 'react';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { MapPin, Loader2, AlertCircle, ArrowLeft, ShieldAlert } from 'lucide-react';

/**
 * Aba "Mapa" de Clientes Ativos: uma bolinha por cidade, do tamanho do número de clientes.
 * A cidade sai do texto livre do cadastro (`/api/clientes-mapa`, regras em
 * src/routes/clientes-mapa.ts). Quem não tem cidade identificável vai para a lista
 * "Sem cidade no cadastro" — clicar abre o cliente para corrigir.
 *
 * Leaflet direto (sem react-leaflet: a versão compatível exige React 18 e o projeto está no 19).
 * Mapa base: Esri (ruas ou satélite), sem chave. O CARTO, usado na 1ª versão, passou a exigir
 * chave e desenhava "API KEY REQUIRED" por cima do mapa.
 * Um pino por cliente (estilo ClickUp): roxo = ativo, laranja = retenção. Clientes da mesma
 * cidade se espalham numa espiral pequena em volta do ponto da cidade para não se cobrirem.
 */
interface Item {
  id: string; name: string; location: string; retencao: boolean;
  codigo: number | null; cidade: string | null; uf: string | null;
  lat: number | null; lng: number | null; precisao: 'exata' | 'suposta' | null; motivo?: string;
}
interface Cidade { codigo: number; cidade: string; uf: string; lat: number; lng: number; clientes: Item[] }

const TILES = {
  mapa: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
  satelite: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
};
const COR_ATIVO = '#7c3aed', COR_RETENCAO = '#f59e0b';
const pino = (cor: string, grande: boolean) => {
  const w = grande ? 32 : 26, h = Math.round(w * 1.3);
  return L.divIcon({
    className: '',
    html: `<svg width="${w}" height="${h}" viewBox="0 0 26 34" style="filter:drop-shadow(0 2px 3px rgba(0,0,0,.35))"><path d="M13 1C6.4 1 1 6.4 1 13c0 9 12 20 12 20s12-11 12-20C25 6.4 19.6 1 13 1z" fill="${cor}" stroke="#fff" stroke-width="2"/><circle cx="13" cy="13" r="4.5" fill="#fff"/></svg>`,
    iconSize: [w, h], iconAnchor: [w / 2, h], tooltipAnchor: [0, -h + 4],
  });
};
// espiral de Fermat: o 1º fica no centro da cidade, os outros em volta (~1 km entre vizinhos)
const deslocar = (lat: number, lng: number, i: number): [number, number] => {
  if (i === 0) return [lat, lng];
  const ang = i * 2.39996, r = 0.012 * Math.sqrt(i);
  return [lat + r * Math.sin(ang), lng + r * Math.cos(ang) / Math.cos((lat * Math.PI) / 180)];
};

const ClientesMapa: React.FC<{ onAbrirCliente: (id: string) => void }> = ({ onAbrirCliente }) => {
  const [itens, setItens] = useState<Item[] | null>(null);
  const [erro, setErro] = useState('');
  const [selecionada, setSelecionada] = useState<number | null>(null);
  const [base, setBase] = useState<'mapa' | 'satelite'>('mapa');
  const enquadrado = useRef(false);
  const divRef = useRef<HTMLDivElement>(null);
  const mapaRef = useRef<L.Map | null>(null);
  const camadaRef = useRef<L.LayerGroup | null>(null);
  const tileRef = useRef<L.TileLayer | null>(null);

  useEffect(() => {
    fetch('/api/clientes-mapa').then(r => r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`)))
      .then(j => setItens(j.itens || []))
      .catch(e => setErro(e.message || 'Falha ao carregar o mapa'));
  }, []);

  const cidades = useMemo<Cidade[]>(() => {
    const m = new Map<number, Cidade>();
    for (const it of itens || []) {
      if (it.codigo == null || it.lat == null || it.lng == null) continue;
      const c = m.get(it.codigo) || { codigo: it.codigo, cidade: it.cidade!, uf: it.uf!, lat: it.lat, lng: it.lng, clientes: [] };
      c.clientes.push(it); m.set(it.codigo, c);
    }
    return [...m.values()].sort((a, b) => b.clientes.length - a.clientes.length || a.cidade.localeCompare(b.cidade));
  }, [itens]);
  const semCidade = (itens || []).filter(i => i.codigo == null);
  const porUf = useMemo(() => {
    const m = new Map<string, number>();
    cidades.forEach(c => m.set(c.uf, (m.get(c.uf) || 0) + c.clientes.length));
    return [...m].sort((a, b) => b[1] - a[1]);
  }, [cidades]);

  // cria o mapa uma vez
  useEffect(() => {
    if (!divRef.current || mapaRef.current) return;
    const mapa = L.map(divRef.current, { zoomControl: false, attributionControl: true, scrollWheelZoom: true }).setView([-14.2, -51.9], 4);
    L.control.zoom({ position: 'bottomright' }).addTo(mapa);
    tileRef.current = L.tileLayer(TILES.mapa, { attribution: 'Tiles &copy; Esri', maxZoom: 18 }).addTo(mapa);
    camadaRef.current = L.layerGroup().addTo(mapa);
    mapaRef.current = mapa;
    // a caixa às vezes nasce sem tamanho (troca de aba); quando ganhar, recalcula e reenquadra
    const ro = new ResizeObserver(() => { mapa.invalidateSize(); if (!enquadrado.current) enquadrar(); });
    ro.observe(divRef.current);
    return () => { ro.disconnect(); mapa.remove(); mapaRef.current = null; };
  }, []);

  useEffect(() => { tileRef.current?.setUrl(TILES[base]); }, [base]);

  const enquadrar = () => {
    const mapa = mapaRef.current, el = divRef.current;
    if (!mapa || !el || !el.clientHeight || !cidadesRef.current.length) return;
    mapa.fitBounds(L.latLngBounds(cidadesRef.current.map(c => [c.lat, c.lng] as [number, number])), { padding: [50, 50], maxZoom: 7 });
    enquadrado.current = true;
  };
  const cidadesRef = useRef<Cidade[]>([]);
  cidadesRef.current = cidades;

  // um pino por cliente
  useEffect(() => {
    const camada = camadaRef.current;
    if (!camada) return;
    camada.clearLayers();
    for (const c of cidades) {
      const sel = selecionada === c.codigo;
      c.clientes.forEach((it, i) => {
        const m = L.marker(deslocar(c.lat, c.lng, i), { icon: pino(it.retencao ? COR_RETENCAO : COR_ATIVO, sel), zIndexOffset: sel ? 1000 : 0, riseOnHover: true });
        m.bindTooltip(`<b>${it.name}</b><br/><span style="opacity:.7">${c.cidade}/${c.uf}${it.retencao ? ' · retenção' : ''}</span>`, { direction: 'top' });
        m.on('click', () => { setSelecionada(c.codigo); onAbrirCliente(it.id); });
        m.addTo(camada);
      });
    }
    if (!enquadrado.current) enquadrar();
  }, [cidades, selecionada]);

  const irPara = (c: Cidade) => { setSelecionada(c.codigo); mapaRef.current?.flyTo([c.lat, c.lng], Math.max(mapaRef.current.getZoom(), 7), { duration: 0.6 }); };
  const atual = cidades.find(c => c.codigo === selecionada) || null;
  const total = (itens || []).length;

  const LinhaCliente = ({ it }: { it: Item }) => (
    <button onClick={() => onAbrirCliente(it.id)} className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-white/[0.04] transition-colors">
      <div className="flex items-center gap-2">
        <span className="text-sm font-semibold text-light-text dark:text-white truncate">{it.name}</span>
        {it.retencao && <span className="shrink-0 inline-flex items-center gap-1 h-5 px-1.5 rounded-full text-[10px] font-semibold bg-amber-500/10 text-amber-600 dark:text-amber-400"><ShieldAlert size={10} /> Retenção</span>}
        {it.precisao === 'suposta' && <span className="shrink-0 h-5 px-1.5 inline-flex items-center rounded-full text-[10px] font-semibold bg-slate-500/10 text-slate-500" title="Cidade com nome repetido em outro estado e sem UF no cadastro">UF suposta</span>}
      </div>
      <p className="text-[11px] text-slate-500 truncate">{it.location || 'sem local'}{it.motivo ? ` · ${it.motivo}` : ''}</p>
    </button>
  );

  return (
    <div className="grid grid-cols-1 xl:grid-cols-[1fr_360px] gap-4">
      <div className="relative isolate rounded-3xl overflow-hidden border border-slate-200 dark:border-white/10 bg-slate-100 dark:bg-dark-card h-[640px]">
        <div ref={divRef} className="absolute inset-0" />
        <div className="absolute top-3 left-3 z-[500] flex p-1 rounded-xl bg-white/95 dark:bg-dark-card/95 backdrop-blur border border-slate-200 dark:border-white/10 shadow-sm">
          {(['mapa', 'satelite'] as const).map(b => (
            <button key={b} onClick={() => setBase(b)}
              className={`h-8 px-3 rounded-lg text-xs font-semibold transition-colors ${base === b ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:text-slate-900 dark:hover:text-white'}`}>
              {b === 'mapa' ? 'Mapa' : 'Satélite'}
            </button>
          ))}
        </div>
        {selecionada != null && (
          <button onClick={() => { setSelecionada(null); enquadrado.current = false; enquadrar(); }}
            className="absolute top-3 right-3 z-[500] h-9 px-3 rounded-xl bg-white/95 dark:bg-dark-card/95 border border-slate-200 dark:border-white/10 shadow-sm text-xs font-semibold text-slate-600 dark:text-slate-200 hover:text-violet-500">
            Ver o Brasil todo
          </button>
        )}
        {!itens && !erro && (
          <div className="absolute inset-0 z-[500] flex items-center justify-center bg-white/60 dark:bg-black/40">
            <Loader2 size={24} className="animate-spin text-violet-500" />
          </div>
        )}
        {erro && (
          <div className="absolute top-3 left-3 right-3 z-[500] flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
            <AlertCircle size={14} /> {erro}
          </div>
        )}
        {itens && (
          <div className="absolute bottom-3 left-3 z-[500] px-3 py-2 rounded-xl bg-white/90 dark:bg-dark-card/90 backdrop-blur border border-slate-200 dark:border-white/10 text-[11px] text-slate-600 dark:text-slate-300 flex items-center gap-3">
            <span><b className="text-light-text dark:text-white">{total - semCidade.length}</b> de {total} no mapa</span>
            <span><b className="text-light-text dark:text-white">{cidades.length}</b> cidades</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_ATIVO }} /> ativo</span>
            <span className="inline-flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full" style={{ background: COR_RETENCAO }} /> retenção</span>
          </div>
        )}
      </div>

      <div className="rounded-3xl border border-slate-200 dark:border-white/10 bg-white dark:bg-dark-card/60 p-4 h-[640px] flex flex-col">
        {atual ? (
          <>
            <button onClick={() => { setSelecionada(null); enquadrado.current = false; enquadrar(); }} className="self-start flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-violet-500 mb-2"><ArrowLeft size={13} /> Todas as cidades</button>
            <div className="flex items-center gap-2 px-1 mb-2">
              <MapPin size={16} className="text-violet-500" />
              <h3 className="text-base font-bold text-light-text dark:text-white">{atual.cidade}<span className="text-slate-400 font-medium">/{atual.uf}</span></h3>
              <span className="ml-auto text-xs font-semibold text-slate-500">{atual.clientes.length} cliente{atual.clientes.length > 1 ? 's' : ''}</span>
            </div>
            <div className="flex-1 overflow-y-auto -mx-1">{atual.clientes.map(it => <LinhaCliente key={it.id} it={it} />)}</div>
          </>
        ) : (
          <>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-2">Por estado</p>
            <div className="flex flex-wrap gap-1.5 px-1 mb-4">
              {porUf.map(([uf, n]) => (
                <span key={uf} className="h-6 px-2 inline-flex items-center gap-1 rounded-full text-[11px] font-semibold bg-violet-500/10 text-violet-600 dark:text-violet-400">{uf} <span className="text-slate-500 font-medium">{n}</span></span>
              ))}
            </div>
            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest px-1 mb-1">Cidades</p>
            <div className="flex-1 overflow-y-auto -mx-1">
              {cidades.map(c => (
                <button key={c.codigo} onClick={() => irPara(c)} className="w-full flex items-center gap-2 px-3 py-2 rounded-lg text-left hover:bg-slate-50 dark:hover:bg-white/[0.04]">
                  <MapPin size={13} className="text-violet-500 shrink-0" />
                  <span className="text-sm font-medium text-light-text dark:text-white truncate">{c.cidade}<span className="text-slate-400">/{c.uf}</span></span>
                  {c.clientes.some(x => x.retencao) && <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" title="tem cliente em retenção" />}
                  <span className="ml-auto text-xs font-bold text-slate-500">{c.clientes.length}</span>
                </button>
              ))}
              {semCidade.length > 0 && (
                <div className="mt-4 pt-3 border-t border-slate-100 dark:border-white/5">
                  <p className="text-[10px] font-bold text-amber-600 dark:text-amber-400 uppercase tracking-widest px-2 mb-1">Sem cidade no cadastro ({semCidade.length})</p>
                  <p className="text-[11px] text-slate-500 px-2 mb-1">Clique para abrir e preencher a cidade no "Local do escritório".</p>
                  {semCidade.map(it => <LinhaCliente key={it.id} it={it} />)}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default ClientesMapa;
