// ── Pasta dentro de pasta ─────────────────────────────────────────────────────
//
// O menu só tem dois níveis de pasta: `menu_subsessions` (pasta, sempre dentro de uma seção)
// e `menu_subsubsessions` (subpasta, dentro de seção ou de pasta, e que só guarda páginas).
// "Mover a pasta RH para dentro de Gestão" (pedido do Jean, 09/10/2026) é, portanto, converter
// a pasta em subpasta: mesma id, nome, ícone e cor; as páginas vão junto; a pasta antiga sai.
// Só vale para pasta SEM subpastas — subpasta não guarda subpasta (seria um 4º nível).
//
// Tudo numa transação de um cliente só: se qualquer passo falha, nada muda. A ordem importa:
// as páginas trocam de pai ANTES do DELETE da pasta, porque `menu_pages.subsession_id` é
// ON DELETE CASCADE — apagar antes levaria as páginas junto.
import type { Express } from 'express';
import type { Pool } from 'pg';

export function setupMenuPastaEmPastaRoutes(app: Express, pool: Pool) {
  app.post('/api/menu/subsessions/:id/virar-subpasta', async (req: any, res) => {
    const id = String(req.params.id);
    const destino = String(req.body?.destino || '');
    const ordem: string[] | null = Array.isArray(req.body?.ordem) ? req.body.ordem.map(String) : null;
    if (!destino) return res.status(400).json({ error: 'Falta a pasta de destino.' });
    if (destino === id) return res.status(400).json({ error: 'Uma pasta não entra nela mesma.' });

    const c = await pool.connect();
    try {
      await c.query('BEGIN');
      const pasta = (await c.query('SELECT * FROM menu_subsessions WHERE id=$1 FOR UPDATE', [id])).rows[0];
      if (!pasta) throw Object.assign(new Error('Pasta não encontrada.'), { status: 404 });
      const alvo = (await c.query('SELECT id FROM menu_subsessions WHERE id=$1', [destino])).rows[0];
      if (!alvo) throw Object.assign(new Error('Pasta de destino não encontrada.'), { status: 404 });
      const subs = Number((await c.query('SELECT count(*) FROM menu_subsubsessions WHERE subsession_id=$1', [id])).rows[0].count);
      if (subs > 0) throw Object.assign(new Error(`"${pasta.label}" tem ${subs} subpasta(s). Subpasta só guarda páginas — esvazie as subpastas antes.`), { status: 409 });
      const conflito = (await c.query('SELECT 1 FROM menu_subsubsessions WHERE id=$1', [id])).rowCount;
      if (conflito) throw Object.assign(new Error(`Já existe uma subpasta com o id "${id}".`), { status: 409 });

      const prox = Number((await c.query('SELECT COALESCE(MAX(order_index)+1, 0) AS n FROM menu_subsubsessions WHERE subsession_id=$1', [destino])).rows[0].n);
      await c.query(
        `INSERT INTO menu_subsubsessions (id, subsession_id, section_id, label, icon, icon_color, order_index)
         VALUES ($1, $2, NULL, $3, $4, $5, $6)`,
        [id, destino, pasta.label, pasta.icon || 'FolderOpen', pasta.icon_color || '#64748b', prox]);
      const paginas = await c.query(
        `UPDATE menu_pages SET subsubsession_id=$1, subsession_id=NULL, section_id=NULL
          WHERE subsession_id=$1 AND subsubsession_id IS NULL`, [id]);
      await c.query('DELETE FROM menu_subsessions WHERE id=$1', [id]);
      if (ordem) {
        for (let i = 0; i < ordem.length; i++) {
          await c.query('UPDATE menu_subsubsessions SET order_index=$1 WHERE id=$2 AND subsession_id=$3', [i, ordem[i], destino]);
        }
      }
      await c.query('COMMIT');
      res.json({ ok: true, paginas: paginas.rowCount });
    } catch (e: any) {
      await c.query('ROLLBACK').catch(() => {});
      res.status(e.status || 500).json({ error: e.message || 'Falha ao mover a pasta.' });
    } finally {
      c.release();
    }
  });
}
