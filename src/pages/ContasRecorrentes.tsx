import React, { useState, useEffect } from 'react';
import { Calendar, ChevronDown, Plus, Link2, FileText, X, Search, Check, Pencil, Power, Trash2 } from 'lucide-react';
import RecurringBillDetail from './RecurringBillDetail';

const MESES = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const fmtCur = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
const fmtDate = (d: string | null) => { if (!d) return '—'; return new Date(d).toLocaleDateString('pt-BR'); };

interface Entry { id: number; recurring_bill_id: number; reference_month: string; expected_value: string; actual_value: string; due_date: string | null; source: string; status: string; movement_asaas_id: string | null; bill_name: string; account_name: string; category_name: string | null; notes: string | null; }
interface Bill { id: number; name: string; description: string | null; due_day: number | null; category_id: number | null; account_name: string | null; is_active: boolean; category_name: string | null; default_value: string | null; }
interface Cat { id: number; description: string; structure: string; level: number; }
interface Movement { id: number; description: string; value: string; transaction_date: string; }

// Status badge
const StatusBadge = ({ status }: { status: string }) => {
  if (status === 'paid') return <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[10px] font-bold rounded-full">Pago</span>;
  if (status === 'ignored') return <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-[10px] font-bold rounded-full">Ignorado</span>;
  return <span className="px-2 py-0.5 bg-amber-500/20 text-amber-400 text-[10px] font-bold rounded-full">Pendente</span>;
};

interface Props { selectedMonth: string; }

export default function ContasRecorrentes({ selectedMonth }: Props) {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [bills, setBills] = useState<Bill[]>([]);
  const [categories, setCategories] = useState<Cat[]>([]);
  const [loading, setLoading] = useState(true);
  const [showBillModal, setShowBillModal] = useState(false);
  const [showEntryModal, setShowEntryModal] = useState(false);
  const [showLinkModal, setShowLinkModal] = useState<number | null>(null);
  const [editBill, setEditBill] = useState<Bill | null>(null);
  const [movements, setMovements] = useState<Movement[]>([]);
  const [searchMov, setSearchMov] = useState('');
  const [tab, setTab] = useState<'provisoes' | 'cadastro'>('provisoes');
  const [detailView, setDetailView] = useState<{ entryId: number; billName: string } | null>(null);

  // Bill form
  const [bName, setBName] = useState(''); const [bDesc, setBDesc] = useState(''); const [bDay, setBDay] = useState('');
  const [bCat, setBCat] = useState(''); const [bAccount, setBAccount] = useState(''); const [bValue, setBValue] = useState('');

  // Entry form
  const [eBill, setEBill] = useState(''); const [eValue, setEValue] = useState(''); const [eDate, setEDate] = useState('');
  const [eSource, setESource] = useState('manual');

  const fetchEntries = async () => {
    try {
      const r = await fetch(`/api/financeiro/recorrentes/entries?month=${selectedMonth}`);
      if (r.ok) setEntries(await r.json());
    } catch (e) { console.error(e); }
  };
  const fetchBills = async () => {
    try {
      const r = await fetch('/api/financeiro/recorrentes/bills');
      if (r.ok) setBills(await r.json());
    } catch (e) { console.error(e); }
  };
  const fetchCategories = async () => {
    try {
      const r = await fetch('/api/fin-categories');
      if (r.ok) {
        const data = await r.json();
        setCategories(data.flat || []);
      }
    } catch (e) { console.error(e); }
  };

  useEffect(() => {
    setLoading(true);
    Promise.all([fetchEntries(), fetchBills(), fetchCategories()]).finally(() => setLoading(false));
  }, [selectedMonth]);

  // Group entries by account_name
  const grouped: Record<string, Entry[]> = {};
  for (const e of entries) {
    const key = e.account_name || 'Sem conta';
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(e);
  }

  const totalExpected = entries.reduce((s, e) => s + parseFloat(e.expected_value || '0'), 0);
  const totalPaid = entries.filter(e => e.status === 'paid').reduce((s, e) => s + parseFloat(e.actual_value || '0'), 0);
  const totalPending = totalExpected - totalPaid;
  const today = new Date().toISOString().slice(0, 10);
  const tomorrow = new Date(Date.now() + 86400000).toISOString().slice(0, 10);
  const urgentTotal = entries.filter(e => e.status === 'pending' && e.due_date && (e.due_date <= tomorrow)).reduce((s, e) => s + parseFloat(e.expected_value || '0'), 0);

  const [selY, selM] = selectedMonth.split('-').map(Number);
  const monthLabel = `${MESES[selM - 1]} ${selY}`;

  // Save bill
  const saveBill = async () => {
    const body = { name: bName, description: bDesc || null, due_day: bDay ? parseInt(bDay) : null, category_id: bCat ? parseInt(bCat) : null, account_name: bAccount || null, is_active: true, default_value: bValue ? parseFloat(bValue) : 0 };
    const url = editBill ? `/api/financeiro/recorrentes/bills/${editBill.id}` : '/api/financeiro/recorrentes/bills';
    const method = editBill ? 'PUT' : 'POST';
    await fetch(url, { method, headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowBillModal(false); setEditBill(null); setBName(''); setBDesc(''); setBDay(''); setBCat(''); setBAccount(''); setBValue('');
    fetchBills(); fetchEntries();
  };

  // Save entry
  const saveEntry = async () => {
    const body = { recurring_bill_id: parseInt(eBill), reference_month: selectedMonth + '-01', expected_value: parseFloat(eValue) || 0, due_date: eDate || null, source: eSource };
    await fetch('/api/financeiro/recorrentes/entries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    setShowEntryModal(false); setEBill(''); setEValue(''); setEDate(''); setESource('manual');
    fetchEntries();
  };

  // Link to movement
  const openLinkModal = async (entryId: number) => {
    setShowLinkModal(entryId);
    try {
      const r = await fetch(`/api/financeiro/extrato?month=${selectedMonth}`);
      if (r.ok) {
        const d = await r.json();
        const arr = Array.isArray(d) ? d : (d.items || []);
        // Filter only outgoing (type = -1) movements
        const movs = arr
          .filter((i: any) => i.type === -1 || i.type === '-1')
          .map((i: any) => ({ id: i.id, description: i.description || i.custom_description || '—', value: i.value, transaction_date: i.transaction_date }));
        setMovements(movs);
      }
    } catch (e) { console.error(e); }
  };

  const linkMovement = async (movId: number) => {
    await fetch(`/api/financeiro/recorrentes/entries/${showLinkModal}/vincular`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ movement_asaas_id: String(movId) }) });
    setShowLinkModal(null); setMovements([]); setSearchMov('');
    fetchEntries();
  };

  const unlinkEntry = async (entryId: number) => {
    if (!confirm('Desvincular este pagamento da provisão?')) return;
    await fetch(`/api/financeiro/recorrentes/entries/${entryId}/desvincular`, { method: 'PUT' });
    fetchEntries();
  };

  const openEditBill = (b: Bill) => {
    setEditBill(b); setBName(b.name); setBDesc(b.description || ''); setBDay(b.due_day?.toString() || '');
    setBCat(b.category_id?.toString() || ''); setBAccount(b.account_name || ''); setBValue(b.default_value?.toString() || ''); setShowBillModal(true);
  };

  const toggleBill = async (bill: Bill) => {
    const action = bill.is_active ? 'Inativar' : 'Reativar';
    if (!confirm(`${action} a despesa "${bill.name}"?`)) return;
    if (bill.is_active) {
      // Inativar (soft delete + remove provisões futuras pendentes)
      await fetch(`/api/financeiro/recorrentes/bills/${bill.id}`, { method: 'DELETE' });
    } else {
      // Reativar
      await fetch(`/api/financeiro/recorrentes/bills/${bill.id}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: bill.name, description: bill.description, due_day: bill.due_day, category_id: bill.category_id, account_name: bill.account_name, is_active: true }) });
    }
    fetchBills(); fetchEntries();
  };

  const hardDeleteBill = async (bill: Bill) => {
    if (!confirm(`EXCLUIR PERMANENTEMENTE a despesa "${bill.name}" e todas as suas provisões? Esta ação não pode ser desfeita.`)) return;
    await fetch(`/api/financeiro/recorrentes/bills/${bill.id}?hard=true`, { method: 'DELETE' });
    fetchBills(); fetchEntries();
  };

  const filteredMovements = movements.filter(m => !searchMov || m.description.toLowerCase().includes(searchMov.toLowerCase()));
  const activeBills = bills.filter(b => b.is_active);

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;

  // Detail view for manual invoices
  if (detailView) return <RecurringBillDetail entryId={detailView.entryId} billName={detailView.billName} onBack={() => { setDetailView(null); fetchEntries(); }} />;

  return (
    <div className="space-y-6">
      {/* Sub tabs */}
      <div className="flex gap-2">
        <button onClick={() => setTab('provisoes')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'provisoes' ? 'bg-violet-500 text-white' : 'bg-dark-card border border-white/10 text-slate-400 hover:text-dark-text'}`}>
          Provisões do Mês
        </button>
        <button onClick={() => setTab('cadastro')} className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${tab === 'cadastro' ? 'bg-violet-500 text-white' : 'bg-dark-card border border-white/10 text-slate-400 hover:text-dark-text'}`}>
          Cadastro de Contas
        </button>
      </div>

      {tab === 'provisoes' && (
        <>
          {/* KPI Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Total Previsto</p>
              <h3 className="text-xl font-black text-dark-text">{fmtCur(totalExpected)}</h3>
            </div>
            <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Já Pago</p>
              <h3 className="text-xl font-black text-emerald-400">{fmtCur(totalPaid)}</h3>
            </div>
            <div className="bg-dark-card border border-white/10 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Pendente</p>
              <h3 className="text-xl font-black text-amber-400">{fmtCur(totalPending)}</h3>
            </div>
            <div className="bg-dark-card border-2 border-rose-500/30 rounded-2xl p-5">
              <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-1">Vence Hoje/Amanhã</p>
              <h3 className="text-xl font-black text-rose-400">{fmtCur(urgentTotal)}</h3>
            </div>
          </div>

          {/* Entries table grouped by account */}
          <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b border-white/10">
              <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Provisões — {monthLabel}</h2>
              <button onClick={() => setShowEntryModal(true)} className="flex items-center gap-2 px-3 py-2 bg-violet-500 hover:bg-violet-600 rounded-xl text-xs font-bold text-white transition-all">
                <Plus size={14} /> Nova Provisão
              </button>
            </div>

            {Object.keys(grouped).length === 0 ? (
              <p className="text-center py-12 text-slate-500 text-sm">Nenhuma provisão para {monthLabel}.</p>
            ) : (
              Object.entries(grouped).map(([account, items]) => (
                <div key={account}>
                  <div className="px-4 py-2 bg-white/[0.02] border-b border-white/5">
                    <span className="text-[10px] font-bold text-violet-400 uppercase tracking-widest">{account}</span>
                  </div>
                  {items.map(entry => (
                    <div key={entry.id} className="flex items-center justify-between px-4 py-3 border-b border-white/5 hover:bg-white/[0.02] transition-colors">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-semibold text-dark-text">{entry.bill_name}</span>
                          <StatusBadge status={entry.status} />
                        </div>
                        <div className="flex items-center gap-3 mt-0.5">
                          <span className="text-[10px] text-slate-500">{entry.category_name || '—'}</span>
                          <span className="text-[10px] text-slate-500">Venc: {fmtDate(entry.due_date)}</span>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Previsto</p>
                          <p className="text-xs font-bold text-dark-text">{fmtCur(parseFloat(entry.expected_value || '0'))}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-slate-500">Pago</p>
                          <p className={`text-xs font-bold ${entry.status === 'paid' ? 'text-emerald-400' : 'text-slate-500'}`}>{fmtCur(parseFloat(entry.actual_value || '0'))}</p>
                        </div>
                        <div className="flex gap-1">
                          {entry.status === 'pending' && !entry.movement_asaas_id && (
                            <button onClick={() => openLinkModal(entry.id)} className="px-2 py-1 bg-violet-500/15 text-violet-400 text-[10px] font-bold rounded-lg hover:bg-violet-500/25 transition-all flex items-center gap-1">
                              <Link2 size={10} /> Vincular
                            </button>
                          )}
                          {entry.source === 'manual' && entry.bill_name.toLowerCase().includes('fatura') && (
                            <button onClick={() => setDetailView({ entryId: entry.id, billName: entry.bill_name })} className="px-2 py-1 bg-blue-500/15 text-blue-400 text-[10px] font-bold rounded-lg hover:bg-blue-500/25 transition-all flex items-center gap-1">
                              <FileText size={10} /> Ver Fatura
                            </button>
                          )}
                          {entry.status === 'paid' && entry.movement_asaas_id && (
                            <button onClick={() => unlinkEntry(entry.id)} className="px-2 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-bold rounded-lg hover:bg-rose-500/15 hover:text-rose-400 transition-all flex items-center gap-1" title="Clique para desvincular">
                              ✓ Vinculado
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ))
            )}
          </div>
        </>
      )}

      {tab === 'cadastro' && (
        <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between p-4 border-b border-white/10">
            <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Despesas Recorrentes</h2>
            <button onClick={() => { setEditBill(null); setBName(''); setBDesc(''); setBDay(''); setBCat(''); setBAccount(''); setBValue(''); setShowBillModal(true); }} className="flex items-center gap-2 px-3 py-2 bg-violet-500 hover:bg-violet-600 rounded-xl text-xs font-bold text-white transition-all">
              <Plus size={14} /> Cadastrar Conta
            </button>
          </div>
          <table className="w-full">
            <thead><tr className="border-b border-white/10">
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Nome</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Categoria</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Dia Venc.</th>
              <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Conta</th>
              <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Valor</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Status</th>
              <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Ações</th>
            </tr></thead>
            <tbody>
              {bills.map(b => (
                <tr key={b.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-xs font-semibold text-dark-text">{b.name}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{b.category_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-center text-slate-400">{b.due_day || '—'}</td>
                  <td className="px-4 py-3 text-xs text-slate-400">{b.account_name || '—'}</td>
                  <td className="px-4 py-3 text-xs text-right font-semibold text-dark-text">{fmtCur(parseFloat(b.default_value || '0'))}</td>
                  <td className="px-4 py-3 text-center">{b.is_active ? <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full">Ativo</span> : <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-[9px] font-bold rounded-full">Inativo</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      <button onClick={() => openEditBill(b)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Editar"><Pencil size={12} className="text-slate-400" /></button>
                      <button onClick={() => toggleBill(b)} className={`px-2 py-1 rounded-lg text-[10px] font-bold transition-all flex items-center gap-1 ${b.is_active ? 'bg-rose-500/15 text-rose-400 hover:bg-rose-500/25' : 'bg-emerald-500/15 text-emerald-400 hover:bg-emerald-500/25'}`} title={b.is_active ? 'Inativar' : 'Ativar'}>
                        <Power size={10} /> {b.is_active ? 'Inativar' : 'Ativar'}
                      </button>
                      <button onClick={() => hardDeleteBill(b)} className="p-1.5 hover:bg-white/10 rounded-lg transition-colors" title="Excluir permanentemente"><Trash2 size={12} className="text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              ))}
              {bills.length === 0 && <tr><td colSpan={7} className="text-center py-8 text-slate-500 text-sm">Nenhuma conta cadastrada.</td></tr>}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal: Bill */}
      {showBillModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowBillModal(false)}>
          <div className="bg-dark-bg border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-dark-text">{editBill ? 'Editar Despesa Recorrente' : 'Nova Despesa Recorrente'}</h3>
              <button onClick={() => setShowBillModal(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome</label><input value={bName} onChange={e => setBName(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" placeholder="Ex: Sicredi Cartão" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Descrição</label><input value={bDesc} onChange={e => setBDesc(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" /></div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Dia Vencimento</label><input type="number" min="1" max="31" value={bDay} onChange={e => setBDay(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Valor Mensal</label><input type="number" step="0.01" value={bValue} onChange={e => setBValue(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" placeholder="R$ 0,00" /></div>
              </div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Conta</label><input value={bAccount} onChange={e => setBAccount(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" placeholder="Ex: Asaas" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Categoria</label>
                <select value={bCat} onChange={e => setBCat(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text">
                  <option value="">Selecione uma categoria...</option>
                  {categories.map(c => <option key={c.id} value={c.id}>{c.structure} — {c.description}</option>)}
                </select>
              </div>
            </div>
            <button onClick={saveBill} disabled={!bName} className="w-full mt-4 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition-all">
              {editBill ? 'Salvar Alterações' : 'Cadastrar Conta'}
            </button>
          </div>
        </div>
      )}

      {/* Modal: Entry */}
      {showEntryModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowEntryModal(false)}>
          <div className="bg-dark-bg border border-white/10 rounded-2xl p-6 w-full max-w-md shadow-2xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-dark-text">Nova Provisão</h3>
              <button onClick={() => setShowEntryModal(false)}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Conta Recorrente</label>
                <select value={eBill} onChange={e => setEBill(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text">
                  <option value="">Selecione...</option>
                  {activeBills.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Valor Previsto</label><input type="number" step="0.01" value={eValue} onChange={e => setEValue(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" /></div>
                <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Data Vencimento</label><input type="date" value={eDate} onChange={e => setEDate(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" /></div>
              </div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Origem</label>
                <select value={eSource} onChange={e => setESource(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text">
                  <option value="manual">Manual</option>
                  <option value="asaas">Asaas</option>
                </select>
              </div>
            </div>
            <button onClick={saveEntry} disabled={!eBill} className="w-full mt-4 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition-all">Criar Provisão</button>
          </div>
        </div>
      )}

      {/* Modal: Link Movement */}
      {showLinkModal !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => { setShowLinkModal(null); setMovements([]); setSearchMov(''); }}>
          <div className="bg-dark-bg border border-white/10 rounded-2xl p-6 w-full max-w-lg shadow-2xl max-h-[80vh] flex flex-col" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-bold text-dark-text">Vincular Pagamento</h3>
              <button onClick={() => { setShowLinkModal(null); setMovements([]); setSearchMov(''); }}><X size={16} className="text-slate-400" /></button>
            </div>
            <div className="relative mb-3"><Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input value={searchMov} onChange={e => setSearchMov(e.target.value)} className="w-full pl-9 pr-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" placeholder="Buscar lançamento..." /></div>
            <div className="flex-1 overflow-y-auto space-y-1">
              {filteredMovements.length === 0 ? <p className="text-center py-8 text-slate-500 text-sm">Nenhum lançamento encontrado.</p> : filteredMovements.map(m => (
                <button key={m.id} onClick={() => linkMovement(m.id)} className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl hover:bg-white/[0.04] transition-colors text-left">
                  <div className="flex-1 min-w-0"><p className="text-xs text-dark-text truncate">{m.description}</p><p className="text-[10px] text-slate-500">{fmtDate(m.transaction_date)}</p></div>
                  <div className="flex items-center gap-2"><span className="text-xs font-bold text-rose-400">-{fmtCur(parseFloat(m.value || '0'))}</span><Check size={12} className="text-slate-500" /></div>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
