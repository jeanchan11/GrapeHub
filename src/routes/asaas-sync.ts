import https from 'https';
import { categorizeMovements } from './bills';

// ─────────────────────────────────────────────────────────────────────────────
// Asaas Sync Engine
// Sincroniza automaticamente fin_receivables, fin_subscriptions e fin_people
// com os dados do Asaas API. Roda a cada 60 minutos via setInterval.
// ─────────────────────────────────────────────────────────────────────────────

function getAsaasKey(): string | null {
  const key = process.env.ASAAS_API_KEY;
  if (!key) return null;
  return key.replace(/\\\$/g, '$');
}

// Fetch paginado — percorre todas as páginas automaticamente
async function asaasFetchAll(endpoint: string, params: Record<string, string> = {}): Promise<any[]> {
  const key = getAsaasKey();
  if (!key) return [];

  const results: any[] = [];
  let offset = 0;
  const limit = 100;

  while (true) {
    const qs = new URLSearchParams({ ...params, limit: String(limit), offset: String(offset) }).toString();
    const url = `https://api.asaas.com/v3${endpoint}?${qs}`;

    const data = await new Promise<any | null>((resolve) => {
      const req = https.request(url, {
        method: 'GET',
        headers: { 'access_token': key },
      }, (res) => {
        let body = '';
        res.on('data', (chunk: string) => body += chunk);
        res.on('end', () => {
          try { resolve(JSON.parse(body)); }
          catch { resolve(null); }
        });
      });
      req.on('error', () => resolve(null));
      req.setTimeout(15000, () => { req.destroy(); resolve(null); });
      req.end();
    });

    if (!data || !Array.isArray(data.data)) break;

    results.push(...data.data);

    if (!data.hasMore) break;
    offset += limit;

    // Pequena pausa para não sobrecarregar a API
    await new Promise(r => setTimeout(r, 200));
  }

  return results;
}

// Busca um objeto único do Asaas (ex.: /finance/balance)
async function asaasFetchOne(endpoint: string): Promise<any | null> {
  const key = getAsaasKey();
  if (!key) return null;
  const url = `https://api.asaas.com/v3${endpoint}`;
  return await new Promise<any | null>((resolve) => {
    const req = https.request(url, { method: 'GET', headers: { 'access_token': key } }, (res) => {
      let body = ''; res.on('data', (c: string) => body += c);
      res.on('end', () => { try { resolve(JSON.parse(body)); } catch { resolve(null); } });
    });
    req.on('error', () => resolve(null));
    req.setTimeout(15000, () => { req.destroy(); resolve(null); });
    req.end();
  });
}

// Snapshot do saldo REAL do Asaas → grava como saldo de abertura do PRÓXIMO mês.
// Roda a cada sync: durante o mês, mantém a abertura do mês seguinte = último saldo; congela na virada.
async function snapshotSaldoVirada(pool: any) {
  try {
    const bal = await asaasFetchOne('/finance/balance');
    const balance = bal && bal.balance != null ? parseFloat(bal.balance) : null;
    if (balance == null || isNaN(balance)) return;
    const now = new Date();
    let y = now.getFullYear(), m = now.getMonth() + 2; // próximo mês (getMonth é 0-based)
    if (m > 12) { m = 1; y += 1; }
    const nextMonth = `${y}-${String(m).padStart(2, '0')}`;
    await pool.query(
      `INSERT INTO fin_dfc_historico (ref_month, structure, description, value, sort_order)
       VALUES ($1, '_saldo_abertura', 'Saldo de abertura (real)', $2, 1)
       ON CONFLICT (ref_month, structure) DO UPDATE SET value=EXCLUDED.value`,
      [nextMonth, balance]
    );
  } catch (e: any) { console.warn('[asaas-sync] snapshot saldo da virada:', e.message); }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync 1: Cobranças → fin_receivables  (completo — substitui n8n)
// Busca por vencimento + pagamentos recentes + cancelados + remove excluídas
// ─────────────────────────────────────────────────────────────────────────────
async function syncPayments(pool: any): Promise<{ upserted: number; deleted: number }> {
  const today = new Date();
  const from = new Date(today); from.setDate(today.getDate() - 30);
  const to   = new Date(today); to.setDate(today.getDate() + 60);
  const recentFrom = new Date(today); recentFrom.setDate(today.getDate() - 7);

  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  // 1. Faturas por vencimento — janela principal (todos os status)
  const byDueDate = await asaasFetchAll('/payments', {
    'dueDate[ge]': fmt(from),
    'dueDate[le]': fmt(to),
  });

  // 2. Pagamentos recebidos recentemente (últimos 7 dias)
  const recentlyPaid = await asaasFetchAll('/payments', {
    'paymentDate[ge]': fmt(recentFrom),
    'paymentDate[le]': fmt(today),
    status: 'RECEIVED',
  });

  // 3. Confirmados recentemente
  const recentlyConfirmed = await asaasFetchAll('/payments', {
    'paymentDate[ge]': fmt(recentFrom),
    'paymentDate[le]': fmt(today),
    status: 'CONFIRMED',
  });

  // 4. Cancelados recentemente
  const recentlyCancelled = await asaasFetchAll('/payments', {
    'dateCreated[ge]': fmt(recentFrom),
    'dateCreated[le]': fmt(today),
    status: 'CANCELLED',
  });

  // 5. TODAS as cobranças vencidas em aberto (qualquer vencimento) — garante que cobranças
  //    reativadas/reabertas fora da janela de datas voltem a aparecer como inadimplentes
  //    (senão uma cobrança marcada CANCELLED e depois restaurada no Asaas ficava presa).
  const allOverdue = await asaasFetchAll('/payments', { status: 'OVERDUE' });

  // Junta tudo e deduplica por id
  const allPayments = new Map<string, any>();
  for (const p of [...byDueDate, ...recentlyPaid, ...recentlyConfirmed, ...recentlyCancelled, ...allOverdue]) {
    allPayments.set(p.id, p);
  }

  if (allPayments.size === 0) return { upserted: 0, deleted: 0 };

  // Busca mapa customer_id → nome via fin_people
  const custIds = [...new Set([...allPayments.values()].map((p: any) => p.customer).filter(Boolean))];
  const nameMap: Record<string, string> = {};
  if (custIds.length > 0) {
    try {
      const r = await pool.query(
        `SELECT asaas_id, name FROM fin_people WHERE asaas_id = ANY($1)`,
        [custIds]
      );
      for (const row of r.rows) nameMap[row.asaas_id] = row.name;
    } catch { /* ignora */ }
  }

  // 5. Upsert de todos os registros
  let upserted = 0;
  for (const p of allPayments.values()) {
    try {
      // O Asaas marca cancelamento/remoção com deleted:true (o status pode continuar OVERDUE).
      // Normalizamos para CANCELLED para não contar como cobrança em aberto/inadimplente.
      const effStatus = p.deleted === true ? 'CANCELLED' : p.status;
      await pool.query(`
        INSERT INTO fin_receivables (
          asaas_id, customer_id, customer_name, billing_type, status,
          value, net_value, due_date, payment_date, description,
          invoice_url, bank_slip_url, subscription_id, raw_json, synced_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,NOW())
        ON CONFLICT (asaas_id) DO UPDATE SET
          status        = EXCLUDED.status,
          payment_date  = EXCLUDED.payment_date,
          net_value     = EXCLUDED.net_value,
          value         = EXCLUDED.value,
          due_date      = EXCLUDED.due_date,
          invoice_url   = EXCLUDED.invoice_url,
          customer_name = COALESCE(EXCLUDED.customer_name, fin_receivables.customer_name),
          raw_json      = EXCLUDED.raw_json,
          synced_at     = NOW()
      `, [
        p.id,
        p.customer,
        nameMap[p.customer] || p.customerName || null,
        p.billingType,
        effStatus,
        p.value,
        p.netValue,
        p.dueDate,
        p.paymentDate || null,
        p.description || null,
        p.invoiceUrl || null,
        p.bankSlipUrl || null,
        p.subscription || null,
        JSON.stringify(p),
      ]);
      upserted++;
    } catch { /* ignora erros individuais */ }
  }

  // 6. Remove faturas OBSOLETAS: cobranças em aberto na janela de vencimento que o Asaas
  //    não retornou mais (foram canceladas/removidas/regeneradas). Preserva as já pagas (histórico).
  let deleted = 0;
  try {
    const ids = [...allPayments.keys()];
    const delRes = await pool.query(
      `DELETE FROM fin_receivables
       WHERE due_date >= $1 AND due_date <= $2
         AND status IN ('PENDING', 'Pendente', 'OVERDUE')
         AND NOT (asaas_id = ANY($3))
       RETURNING id`,
      [fmt(from), fmt(to), ids]
    );
    deleted = delRes.rowCount || 0;
  } catch (e: any) {
    console.warn('[asaas-sync] cleanup faturas obsoletas:', e.message);
  }

  // 7. Reconciliação de cobranças ABERTAS fora da janela de vencimento.
  //    Cobranças PENDING/OVERDUE no nosso banco que o Asaas não retornou nesta sync (venceram
  //    há muito) ficariam "presas". Reverificamos 1 a 1 no Asaas: se foram removidas
  //    (deleted:true) ou canceladas → CANCELLED; se pagas → status real. Cap p/ limitar chamadas.
  let cancelled = 0, reconciled = 0;
  try {
    const openRows = await pool.query(
      `SELECT asaas_id, status FROM fin_receivables
       WHERE status IN ('PENDING','Pendente','OVERDUE') AND NOT (asaas_id = ANY($1))
       ORDER BY due_date ASC LIMIT 150`,
      [[...allPayments.keys()]]
    );
    for (const row of openRows.rows) {
      const pay = await asaasFetchOne(`/payments/${row.asaas_id}`);
      if (!pay || pay.deleted === true || pay.status === 'CANCELLED') {
        await pool.query(
          `UPDATE fin_receivables SET status='CANCELLED', raw_json=COALESCE($2, raw_json), synced_at=NOW() WHERE asaas_id=$1`,
          [row.asaas_id, pay ? JSON.stringify(pay) : null]
        );
        cancelled++;
      } else if (pay.status && pay.status !== row.status) {
        await pool.query(
          `UPDATE fin_receivables SET status=$1, payment_date=$2, raw_json=$3, synced_at=NOW() WHERE asaas_id=$4`,
          [pay.status, pay.paymentDate || null, JSON.stringify(pay), row.asaas_id]
        );
        reconciled++;
      } else {
        await pool.query(`UPDATE fin_receivables SET synced_at=NOW() WHERE asaas_id=$1`, [row.asaas_id]);
      }
    }
    if (cancelled || reconciled) console.log(`[asaas-sync] reconciliação abertas: ${cancelled} cancelada(s), ${reconciled} atualizada(s)`);
  } catch (e: any) {
    console.warn('[asaas-sync] reconciliação abertas:', e.message);
  }

  return { upserted, deleted };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync 2: Extrato → fin_movements_asaas
// Busca financialTransactions dos últimos 60 dias
// ─────────────────────────────────────────────────────────────────────────────
async function syncExtrato(pool: any): Promise<{ upserted: number }> {
  const today = new Date();
  const from = new Date(today); from.setDate(today.getDate() - 60);
  const fmt = (d: Date) => d.toISOString().slice(0, 10);

  const transactions = await asaasFetchAll('/financialTransactions', {
    startDate: fmt(from),
    finishDate: fmt(today),
  });

  if (transactions.length === 0) return { upserted: 0 };

  let upserted = 0;
  for (const tx of transactions) {
    try {
      // ID único: prefixo asaas_ + id da transação
      // ID único: extrai apenas os dígitos e remove zeros à esquerda para coincidir com n8n
      // (ex: "ftn_001902465692" → "1902465692")
      const asaasId = String(tx.id).replace(/\D/g, '').replace(/^0+/, '') || '0';
      const type = (tx.value ?? 0) >= 0 ? 1 : -1;
      const value = Math.abs(tx.value ?? 0);

      await pool.query(`
        INSERT INTO fin_movements_asaas (
          asaas_id, type, transaction_type, value, transaction_date,
          description, balance, payment_id, transfer_id,
          account, sicredi_status, raw_json, synced_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,'asaas','realizado',$10,NOW())
        ON CONFLICT (asaas_id) DO UPDATE SET
          value            = EXCLUDED.value,
          balance          = EXCLUDED.balance,
          transaction_type = EXCLUDED.transaction_type,
          description      = EXCLUDED.description,
          raw_json         = EXCLUDED.raw_json,
          synced_at        = NOW()
      `, [
        asaasId,
        type,
        tx.type || (type === 1 ? 'CREDIT' : 'DEBIT'),
        value,
        tx.date,
        tx.description || tx.type || null,
        tx.balance ?? null,
        tx.paymentId || tx.payment || null,
        tx.transferId || tx.transfer || null,
        JSON.stringify(tx),
      ]);
      upserted++;
    } catch { /* ignora erros individuais */ }
  }

  return { upserted };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pareia estornos de Pix (transação cancelada + o crédito de devolução) e marca AMBOS
// com is_reversed_pair=true para excluí-los dos cálculos financeiros (despesa/entrada/DRE).
// Link EXATO pelo pixTransactionId: o estorno (PIX_TRANSACTION_DEBIT_REFUND) e o débito
// original compartilham o mesmo pixTransactionId. Sem chute por valor/data.
// ─────────────────────────────────────────────────────────────────────────────
async function pairReversedTransactions(pool: any): Promise<{ marked: number }> {
  try {
    const r = await pool.query(`
      UPDATE fin_movements_asaas m
      SET is_reversed_pair = true
      WHERE m.account = 'asaas'
        AND m.is_reversed_pair = false
        AND (m.raw_json->>'pixTransactionId') IS NOT NULL
        AND (m.raw_json->>'pixTransactionId') IN (
          SELECT raw_json->>'pixTransactionId'
          FROM fin_movements_asaas
          WHERE transaction_type = 'PIX_TRANSACTION_DEBIT_REFUND'
            AND (raw_json->>'pixTransactionId') IS NOT NULL
        )
    `);
    return { marked: r.rowCount || 0 };
  } catch (e: any) {
    console.warn('[asaas-sync] pairReversedTransactions:', e.message);
    return { marked: 0 };
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync 3: Assinaturas → fin_subscriptions
// Busca todas as ACTIVE (volume pequeno)
// ─────────────────────────────────────────────────────────────────────────────
async function syncSubscriptions(pool: any): Promise<{ upserted: number }> {
  const subscriptions = await asaasFetchAll('/subscriptions', { status: 'ACTIVE' });

  if (subscriptions.length === 0) return { upserted: 0 };

  let upserted = 0;
  for (const s of subscriptions) {
    try {
      await pool.query(`
        INSERT INTO fin_subscriptions (
          asaas_id, customer_id, status, value, next_due_date,
          billing_type, cycle, description, raw_json, synced_at
        ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,NOW())
        ON CONFLICT (asaas_id) DO UPDATE SET
          status        = EXCLUDED.status,
          value         = EXCLUDED.value,
          next_due_date = EXCLUDED.next_due_date,
          billing_type  = EXCLUDED.billing_type,
          cycle         = EXCLUDED.cycle,
          raw_json      = EXCLUDED.raw_json,
          synced_at     = NOW()
      `, [
        s.id,
        s.customer,
        s.status,
        s.value,
        s.nextDueDate || null,
        s.billingType,
        s.cycle,
        s.description || null,
        JSON.stringify(s),
      ]);
      upserted++;
    } catch { /* ignora erros individuais */ }
  }

  // Garante que todo cliente com assinatura ativa exista em fin_people. Sem isso, o nome
  // fica NULL no dropdown de vínculo (join por asaas_id) e a assinatura vira "sem nome",
  // impossível de achar. O syncCustomers só ATUALIZA registros existentes — não cria novos.
  try {
    const custIds = [...new Set(subscriptions.map((s: any) => s.customer).filter(Boolean))];
    if (custIds.length) {
      const existing = await pool.query(`SELECT asaas_id FROM fin_people WHERE asaas_id = ANY($1)`, [custIds]);
      const have = new Set(existing.rows.map((r: any) => r.asaas_id));
      const missing = custIds.filter((id: string) => !have.has(id));
      let created = 0;
      for (const cid of missing) {
        const c = await asaasFetchOne(`/customers/${cid}`);
        if (!c || !c.name) continue;
        await pool.query(
          `INSERT INTO fin_people (guid, name, email, phone, cnpjcpf, asaas_id, is_client, synced_at)
           VALUES (gen_random_uuid(), $1, $2, $3, $4, $5, true, NOW())
           ON CONFLICT DO NOTHING`,
          [c.name, c.email || null, c.mobilePhone || c.phone || null, c.cpfCnpj || null, cid]
        );
        created++;
      }
      if (created) console.log(`[asaas-sync] fin_people: +${created} cliente(s) de assinatura criados`);
    }
  } catch (e: any) { console.warn('[asaas-sync] garantir fin_people:', e?.message); }

  return { upserted };
}

// ─────────────────────────────────────────────────────────────────────────────
// Sync 3: Clientes → atualiza fin_people existentes
// Só atualiza registros que já têm asaas_id no banco — não cria novos
// ─────────────────────────────────────────────────────────────────────────────
async function syncCustomers(pool: any): Promise<{ updated: number }> {
  // Busca os asaas_ids que já existem no banco para saber quais atualizar
  const existingRes = await pool.query(`SELECT asaas_id FROM fin_people WHERE asaas_id IS NOT NULL`);
  const existingIds: Set<string> = new Set(existingRes.rows.map((r: any) => r.asaas_id));

  if (existingIds.size === 0) return { updated: 0 };

  const customers = await asaasFetchAll('/customers');

  let updated = 0;
  for (const c of customers) {
    if (!existingIds.has(c.id)) continue; // só atualiza quem já está no banco
    try {
      await pool.query(`
        UPDATE fin_people SET
          name        = $1,
          email       = COALESCE($2, email),
          phone       = COALESCE($3, phone),
          synced_at   = NOW()
        WHERE asaas_id = $4
      `, [
        c.name,
        c.email || null,
        c.mobilePhone || c.phone || null,
        c.id,
      ]);
      updated++;
    } catch { /* ignora erros individuais */ }
  }

  return { updated };
}

// ─────────────────────────────────────────────────────────────────────────────
// Reconciliação automática: vincula provisões (fin_bill_entries) aos
// pagamentos reais do extrato (fin_movements_asaas).
// Critérios: valor ±5%, data ±7 dias, ambos não vinculados ainda.
// ─────────────────────────────────────────────────────────────────────────────
export async function reconcileBills(pool: any): Promise<{ matched: number }> {
  let matched = 0;
  try {
    // Busca provisões pendentes (não pagas, sem vínculo)
    const pendingEntries = await pool.query(`
      SELECT e.id, e.expected_value, e.due_date, b.name
      FROM fin_bill_entries e
      JOIN fin_bills b ON b.id = e.bill_id
      WHERE e.status != 'paid'
        AND e.status != 'cancelled'
        AND e.linked_movement_id IS NULL
        AND e.due_date IS NOT NULL
        AND e.expected_value IS NOT NULL
    `);

    for (const entry of pendingEntries.rows) {
      const val = parseFloat(entry.expected_value);
      if (!val || val <= 0) continue;

      // Procura pagamento no extrato com valor ±5% e data ±7 dias
      const minVal = val * 0.95;
      const maxVal = val * 1.05;
      const match = await pool.query(`
        SELECT id, value, transaction_date, description
        FROM fin_movements_asaas
        WHERE account = 'asaas'
          AND type = -1
          AND linked_bill_entry_id IS NULL
          AND value BETWEEN $1 AND $2
          AND transaction_date BETWEEN ($3::date - INTERVAL '7 days') AND ($3::date + INTERVAL '7 days')
        ORDER BY ABS(value - $4) ASC, ABS(transaction_date::date - $3::date) ASC
        LIMIT 1
      `, [minVal, maxVal, entry.due_date, val]);

      if (match.rows.length > 0) {
        const m = match.rows[0];
        // Vincula: marca a provisão como paga e linka ambos
        await pool.query(`
          UPDATE fin_bill_entries
          SET status = 'paid',
              actual_value = $1,
              paid_at = $2::date,
              linked_movement_id = $3,
              updated_at = NOW()
          WHERE id = $4
        `, [m.value, m.transaction_date, m.id, entry.id]);

        await pool.query(`
          UPDATE fin_movements_asaas
          SET linked_bill_entry_id = $1
          WHERE id = $2
        `, [entry.id, m.id]);

        matched++;
      }
    }
  } catch (err: any) {
    console.error('[reconcile] Erro:', err.message);
  }
  return { matched };
}

// ─────────────────────────────────────────────────────────────────────────────
// Orquestrador principal
// ─────────────────────────────────────────────────────────────────────────────
export async function runAsaasSync(pool: any): Promise<void> {
  const key = getAsaasKey();
  if (!key) {
    console.warn('[asaas-sync] ASAAS_API_KEY não configurada — sync ignorado.');
    return;
  }

  // Registra início no log
  let logId: number | null = null;
  try {
    const lr = await pool.query(
      `INSERT INTO asaas_sync_log (status) VALUES ('running') RETURNING id`
    );
    logId = lr.rows[0]?.id;
  } catch { /* tabela pode não existir ainda */ }

  const startedAt = Date.now();
  console.log('[asaas-sync] Iniciando sync...');

  try {
    const [paymentsResult, extratoResult, subscriptionsResult, customersResult] = await Promise.all([
      syncPayments(pool),
      syncExtrato(pool),
      syncSubscriptions(pool),
      syncCustomers(pool),
    ]);

    // Reconciliação automática DESATIVADA — o vínculo de contas a pagar agora é feito
    // manualmente pelo botão "Vincular" de cada conta (estava casando só pelo valor e errando).
    // const reconResult = await reconcileBills(pool);
    const reconResult = { matched: 0 };

    // Pareia estornos de Pix (débito cancelado + devolução) e exclui dos cálculos
    try { const rev = await pairReversedTransactions(pool); if (rev.marked) console.log(`[asaas-sync] estornos pareados: ${rev.marked} movimento(s) excluído(s)`); } catch (e: any) { console.warn('[estornos] pós-sync:', e.message); }

    // Categoriza movimentos novos no plano de contas (alimenta a DRE ao vivo)
    try { await categorizeMovements(pool); } catch (e: any) { console.warn('[categorizar] pós-sync:', e.message); }

    // Snapshot do saldo real → abertura do próximo mês (o "último saldo antes de virar")
    await snapshotSaldoVirada(pool);

    const duration = ((Date.now() - startedAt) / 1000).toFixed(1);
    console.log(`[asaas-sync] ✅ Concluído em ${duration}s — faturas: ${paymentsResult.upserted} (${paymentsResult.deleted} removidas), extrato: ${extratoResult.upserted}, assinaturas: ${subscriptionsResult.upserted}, clientes: ${customersResult.updated} (reconciliação automática desativada)`);

    if (logId) {
      await pool.query(`
        UPDATE asaas_sync_log SET
          finished_at             = NOW(),
          payments_upserted       = $1,
          subscriptions_upserted  = $2,
          customers_updated       = $3,
          status                  = 'done',
          error_message           = $5
        WHERE id = $4
      `, [
        paymentsResult.upserted + extratoResult.upserted,
        subscriptionsResult.upserted,
        customersResult.updated,
        logId,
        paymentsResult.deleted > 0 ? `${paymentsResult.deleted} fatura(s) removida(s) do Asaas` : null,
      ]);
    }
  } catch (err: any) {
    console.error('[asaas-sync] ❌ Erro:', err.message);
    if (logId) {
      await pool.query(
        `UPDATE asaas_sync_log SET finished_at = NOW(), status = 'error', error_message = $1 WHERE id = $2`,
        [err.message, logId]
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Registro de rotas
// ─────────────────────────────────────────────────────────────────────────────
export function setupAsaasSyncRoutes(app: any, pool: any) {

  // Cria tabela de log se não existir
  pool.query(`
    CREATE TABLE IF NOT EXISTS asaas_sync_log (
      id                    SERIAL PRIMARY KEY,
      started_at            TIMESTAMPTZ DEFAULT NOW(),
      finished_at           TIMESTAMPTZ,
      payments_upserted     INT DEFAULT 0,
      subscriptions_upserted INT DEFAULT 0,
      customers_updated     INT DEFAULT 0,
      status                TEXT DEFAULT 'running',
      error_message         TEXT
    )
  `).catch((e: any) => console.warn('[asaas-sync] migrate log table:', e.message));

  // Cria tabelas de Contas a Pagar nativo
  pool.query(`
    CREATE TABLE IF NOT EXISTS fin_bills (
      id          SERIAL PRIMARY KEY,
      name        VARCHAR(200) NOT NULL,
      category    VARCHAR(100),
      value       NUMERIC(12,2),
      recurrence  VARCHAR(20) DEFAULT 'monthly',
      due_day     INT,
      due_date    DATE,
      is_active   BOOLEAN DEFAULT TRUE,
      notes       TEXT,
      created_at  TIMESTAMPTZ DEFAULT NOW(),
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `).then(() => {
    return pool.query(`
      CREATE TABLE IF NOT EXISTS fin_bill_entries (
        id              SERIAL PRIMARY KEY,
        bill_id         INT REFERENCES fin_bills(id) ON DELETE CASCADE,
        reference_month VARCHAR(7) NOT NULL,
        due_date        DATE,
        expected_value  NUMERIC(12,2),
        actual_value    NUMERIC(12,2),
        status          VARCHAR(20) DEFAULT 'pending',
        paid_at         DATE,
        notes           TEXT,
        created_at      TIMESTAMPTZ DEFAULT NOW(),
        updated_at      TIMESTAMPTZ DEFAULT NOW(),
        UNIQUE(bill_id, reference_month)
      );
    `);
  }).then(() => {
    return pool.query(`
      ALTER TABLE fin_bill_entries ADD COLUMN IF NOT EXISTS linked_movement_id INT;
    `);
  }).catch((e: any) => console.warn('[bills] migrate fin_bills/fin_bill_entries:', e.message));

  // Notas/anotações de cobrança por cliente inadimplente (status do contato, aguardando pagamento, etc.)
  pool.query(`
    CREATE TABLE IF NOT EXISTS fin_inadimplente_notes (
      customer_id TEXT PRIMARY KEY,
      note        TEXT,
      updated_at  TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch((e: any) => console.warn('[inadimplentes] migrate notes table:', e.message));

  // Data de pagamento da fatura do cartão Sicredi (uma por mês de competência)
  pool.query(`
    CREATE TABLE IF NOT EXISTS fin_sicredi_invoice (
      billing_month TEXT PRIMARY KEY,
      payment_date  DATE,
      updated_at    TIMESTAMPTZ DEFAULT NOW()
    );
  `).catch((e: any) => console.warn('[sicredi] migrate invoice table:', e.message));

  // Alterações na tabela fin_movements_asaas (independentes)
  pool.query(`
    ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS custom_description TEXT;
  `).then(() => {
    return pool.query(`ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS custom_category VARCHAR(100);`);
  }).then(() => {
    return pool.query(`ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS user_comment TEXT;`);
  }).then(() => {
    return pool.query(`ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS edited_at TIMESTAMPTZ;`);
  }).then(() => {
    return pool.query(`ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS linked_bill_entry_id INT;`);
  }).then(() => {
    // Estornos/cancelamentos: par débito-cancelado + estorno é excluído dos cálculos financeiros
    return pool.query(`ALTER TABLE fin_movements_asaas ADD COLUMN IF NOT EXISTS is_reversed_pair BOOLEAN DEFAULT false;`);
  }).catch((e: any) => console.warn('[bills] migrate fin_movements_asaas:', e.message));

  // POST /api/fin/sync/run — executa sync manual imediato
  app.post('/api/fin/sync/run', async (_req: any, res: any) => {
    try {
      res.json({ ok: true, message: 'Sync iniciado em background.' });
      // Roda após responder para não bloquear o HTTP
      setImmediate(() => runAsaasSync(pool));
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });

  // GET /api/fin/sync/status — última execução
  app.get('/api/fin/sync/status', async (_req: any, res: any) => {
    try {
      const r = await pool.query(`
        SELECT id, started_at, finished_at, payments_upserted,
               subscriptions_upserted, customers_updated, status, error_message
        FROM asaas_sync_log
        ORDER BY started_at DESC
        LIMIT 5
      `);
      res.json({ logs: r.rows });
    } catch (e: any) {
      res.status(500).json({ error: e.message });
    }
  });
}
