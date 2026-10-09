// ── Mapa de clientes (aba "Mapa" em Clientes Ativos) ─────────────────────────
//
// `clients.location` é texto livre — em 09/10/2026 havia 57 formas para 75 clientes: "Curitiba, PR",
// "Caxias do sul - RS", "Ituporanga/SC", endereço inteiro com CEP, só o estado ("Tocantins",
// "Interior SP")… Aqui ele vira cidade + coordenada usando `ibge_municipios` (5.571 cidades,
// base pública kelvins/municipios-brasileiros, carregada no banco em 09/10/2026).
//
// Regras, nesta ordem:
//  1. Tira CEP; quebra em partes por , - / |.
//  2. UF = parte de 2 letras que é sigla (ou última palavra de uma parte: "Interior SP").
//  3. Se uma parte é o NOME de um estado ("Mato Grosso"), é só o estado — mesmo que exista cidade
//     com esse nome em OUTRO estado (há "Mato Grosso" na PB e "Tocantins" em MG). Exceção: cidade
//     de mesmo nome no PRÓPRIO estado é a cidade ("São Paulo", "Rio de Janeiro" = as capitais).
//  4. Cidade = a primeira parte, de trás para frente, que é nome de município (com a UF, se houver).
//     Endereço vem antes da cidade, então ler do fim acerta "Santa Cruz, Rio de Janeiro - RJ".
//  5. Nome repetido sem UF ("Guaíra" é SP e PR; "Cascavel" é PR e CE): capital, senão a UF mais
//     comum entre os clientes já identificados. Sai como `precisao: 'suposta'`.
// Sem cidade (só estado, vazio, ilegível) o cliente volta com lat/lng nulos e o motivo — a tela
// lista à parte para alguém corrigir o cadastro. Nunca põe pino no centro do estado.
import type { Express } from 'express';
import type { Pool } from 'pg';

const norm = (s: string) => s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim();

interface Mun { codigo: number; nome: string; uf: string; lat: number; lng: number; capital: boolean }
let cache: { porNome: Map<string, Mun[]>; ufs: Set<string>; estados: Map<string, string> } | null = null;

async function carregar(pool: Pool) {
  if (cache) return cache;
  const mun: Mun[] = (await pool.query('SELECT codigo, nome, uf, lat, lng, capital FROM ibge_municipios')).rows;
  const est = (await pool.query('SELECT uf, nome FROM ibge_estados')).rows;
  const porNome = new Map<string, Mun[]>();
  for (const m of mun) { const k = norm(m.nome); porNome.set(k, [...(porNome.get(k) || []), m]); }
  cache = { porNome, ufs: new Set(est.map((e: any) => e.uf)), estados: new Map(est.map((e: any) => [norm(e.nome), e.uf])) };
  return cache;
}

// ok=true → mun/precisao; ok=false → uf/motivo (e ambiguos, se o nome se repete)
interface Resolvido { ok: boolean; mun?: Mun; precisao?: 'exata' | 'suposta'; uf?: string | null; motivo?: string; ambiguos?: Mun[] }

function resolver(local: string, c: NonNullable<typeof cache>): Resolvido {
  const limpo = (local || '').replace(/\b\d{5}-?\d{3}\b/g, ' ').trim();
  if (!limpo) return { ok: false, uf: null, motivo: 'sem local no cadastro' };
  const partes = limpo.split(/[,\-\/|]/).map(p => p.trim()).filter(Boolean);
  let uf: string | null = null;
  for (const p of partes) {
    const up = p.toUpperCase();
    if (c.ufs.has(up)) { uf = up; continue; }
    const ult = up.split(/\s+/).pop() || '';
    if (!uf && ult.length === 2 && c.ufs.has(ult)) uf = ult;
  }
  for (const p of partes) {
    const ufEstado = c.estados.get(norm(p));
    const cidadeHomonima = (c.porNome.get(norm(p)) || []).some(m => m.uf === ufEstado);
    if (ufEstado && !cidadeHomonima && partes.every(q => c.estados.has(norm(q)) || c.ufs.has(q.toUpperCase()))) {
      return { ok: false, uf: ufEstado, motivo: 'só o estado no cadastro' };
    }
  }
  for (let i = partes.length - 1; i >= 0; i--) {
    const p = partes[i];
    if (c.ufs.has(p.toUpperCase())) continue;
    let cands = c.porNome.get(norm(p)) || [];
    if (!cands.length) continue;
    if (uf) { const f = cands.filter(m => m.uf === uf); if (f.length) cands = f; }
    if (cands.length === 1) return { ok: true, mun: cands[0], precisao: uf || (c.porNome.get(norm(p)) || []).length === 1 ? 'exata' : 'suposta' };
    return { ok: false, uf, motivo: 'nome de cidade repetido', ambiguos: cands };
  }
  return { ok: false, uf, motivo: uf ? 'cidade não reconhecida (só a UF)' : 'cidade não reconhecida' };
}

export function setupClientesMapaRoutes(app: Express, pool: Pool) {
  app.get('/api/clientes-mapa', async (_req: any, res) => {
    try {
      const c = await carregar(pool);
      const clientes = (await pool.query(
        `SELECT id, name, location, tags FROM clients WHERE status = 'Ativo' ORDER BY name`)).rows;
      const primeira = clientes.map((cl: any) => ({ cl, r: resolver(cl.location, c) }));

      // UF mais comum entre os identificados — desempata nome repetido sem UF
      const freq = new Map<string, number>();
      for (const { r } of primeira) if (r.ok && r.mun) freq.set(r.mun.uf, (freq.get(r.mun.uf) || 0) + 1);

      const itens = primeira.map(({ cl, r }) => {
        let res = r;
        if (!r.ok && r.ambiguos?.length) {
          const cap = r.ambiguos.find(m => m.capital);
          const escolhido = cap || [...r.ambiguos].sort((a, b) => (freq.get(b.uf) || 0) - (freq.get(a.uf) || 0))[0];
          res = { ok: true, mun: escolhido, precisao: 'suposta' };
        }
        const base = {
          id: cl.id, name: cl.name, location: cl.location || '',
          // `clients.tags` é TEXT com JSON dentro ('["quarentena"]'), não array
          retencao: (() => {
            let t: any = cl.tags;
            if (typeof t === 'string') { try { t = JSON.parse(t); } catch { t = []; } }
            return Array.isArray(t) && t.includes('quarentena');
          })(),
        };
        return res.ok && res.mun
          ? { ...base, codigo: res.mun.codigo, cidade: res.mun.nome, uf: res.mun.uf, lat: res.mun.lat, lng: res.mun.lng, precisao: res.precisao }
          : { ...base, codigo: null, cidade: null, uf: res.uf, lat: null, lng: null, precisao: null, motivo: res.motivo };
      });
      res.json({ itens });
    } catch (e: any) {
      console.error('GET /api/clientes-mapa:', e.message);
      res.status(500).json({ error: 'Falha ao montar o mapa' });
    }
  });
}
