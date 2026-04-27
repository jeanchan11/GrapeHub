import React, { useState, useEffect } from 'react';
import { ArrowLeft, Plus, Check, X, Pencil } from 'lucide-react';

const fmtCur = (v: number) => (v || 0).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

interface Item { id: number; entry_id: number; name: string; category_id: number | null; expected_value: string; actual_value: string; status: string; category_name: string | null; notes: string | null; }

interface Props { entryId: number; billName: string; onBack: () => void; }

export default function RecurringBillDetail({ entryId, billName, onBack }: Props) {
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [iName, setIName] = useState(''); const [iExpected, setIExpected] = useState(''); const [iActual, setIActual] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const r = await fetch(`/api/financeiro/recorrentes/entries/${entryId}/items`);
      if (r.ok) setItems(await r.json());
    } catch (e) { console.error(e); } finally { setLoading(false); }
  };

  useEffect(() => { fetchItems(); }, [entryId]);

  const totalExpected = items.reduce((s, i) => s + parseFloat(i.expected_value || '0'), 0);
  const totalActual = items.reduce((s, i) => s + parseFloat(i.actual_value || '0'), 0);
  const diff = totalActual - totalExpected;
  const pending = items.filter(i => i.status === 'pending').length;

  const addItem = async () => {
    await fetch(`/api/financeiro/recorrentes/entries/${entryId}/items`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: iName, expected_value: parseFloat(iExpected) || 0 }) });
    setShowAdd(false); setIName(''); setIExpected('');
    fetchItems();
  };

  const saveActual = async (itemId: number) => {
    await fetch(`/api/financeiro/recorrentes/items/${itemId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ actual_value: parseFloat(iActual) || 0, status: 'paid' }) });
    setEditId(null); setIActual('');
    fetchItems();
  };

  const deleteItem = async (id: number) => {
    if (!confirm('Remover item?')) return;
    await fetch(`/api/financeiro/recorrentes/items/${id}`, { method: 'DELETE' });
    fetchItems();
  };

  const markAsPaid = async () => {
    await fetch(`/api/financeiro/recorrentes/entries/${entryId}`, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid', actual_value: totalActual }) });
    onBack();
  };

  if (loading) return <div className="flex items-center justify-center py-24"><div className="w-8 h-8 border-4 border-violet-500/30 border-t-violet-500 rounded-full animate-spin" /></div>;

  return (
    <div className="space-y-6">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-xl transition-colors"><ArrowLeft size={16} className="text-slate-400" /></button>
        <span className="text-xs text-slate-500">Contas a Pagar › Recorrentes ›</span>
        <span className="text-xs font-bold text-dark-text">{billName}</span>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Previsto</p>
          <p className="text-lg font-black text-dark-text">{fmtCur(totalExpected)}</p>
        </div>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Total Realizado</p>
          <p className="text-lg font-black text-emerald-400">{fmtCur(totalActual)}</p>
        </div>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">A Realizar</p>
          <p className="text-lg font-black text-amber-400">{pending} itens</p>
        </div>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Diferença</p>
          <p className={`text-lg font-black ${diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-400'}`}>{diff === 0 ? '—' : fmtCur(diff)}</p>
        </div>
        <div className="bg-dark-card border border-white/10 rounded-2xl p-4">
          <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Status</p>
          <p className={`text-lg font-black ${pending > 0 ? 'text-amber-400' : 'text-emerald-400'}`}>{pending > 0 ? 'Pendente' : 'Pago'}</p>
        </div>
      </div>

      {/* Items table */}
      <div className="bg-dark-card border border-white/10 rounded-2xl overflow-hidden">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h2 className="text-sm font-bold text-dark-text uppercase tracking-widest">Itens da Fatura</h2>
          <div className="flex gap-2">
            <button onClick={() => setShowAdd(true)} className="flex items-center gap-2 px-3 py-2 bg-violet-500 hover:bg-violet-600 rounded-xl text-xs font-bold text-white transition-all"><Plus size={14} /> Adicionar Item</button>
            {pending === 0 && items.length > 0 && <button onClick={markAsPaid} className="flex items-center gap-2 px-3 py-2 bg-emerald-500 hover:bg-emerald-600 rounded-xl text-xs font-bold text-white transition-all"><Check size={14} /> Marcar Fatura como Paga</button>}
          </div>
        </div>
        <table className="w-full">
          <thead><tr className="border-b border-white/10">
            <th className="px-4 py-3 text-left text-[10px] font-bold text-slate-500 uppercase">Item</th>
            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Previsto</th>
            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Realizado</th>
            <th className="px-4 py-3 text-right text-[10px] font-bold text-slate-500 uppercase">Diferença</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Status</th>
            <th className="px-4 py-3 text-center text-[10px] font-bold text-slate-500 uppercase">Ações</th>
          </tr></thead>
          <tbody>
            {items.map(item => {
              const exp = parseFloat(item.expected_value || '0');
              const act = parseFloat(item.actual_value || '0');
              const d = act - exp;
              return (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/[0.02]">
                  <td className="px-4 py-3 text-xs font-semibold text-dark-text">{item.name}</td>
                  <td className="px-4 py-3 text-xs text-right text-dark-text">{fmtCur(exp)}</td>
                  <td className="px-4 py-3 text-xs text-right font-bold text-dark-text">
                    {editId === item.id ? (
                      <div className="flex items-center gap-1 justify-end">
                        <input type="number" step="0.01" value={iActual} onChange={e => setIActual(e.target.value)} className="w-24 px-2 py-1 bg-dark-bg border border-white/10 rounded-lg text-xs text-right text-dark-text" autoFocus />
                        <button onClick={() => saveActual(item.id)} className="p-1 bg-emerald-500/20 rounded-lg"><Check size={12} className="text-emerald-400" /></button>
                        <button onClick={() => setEditId(null)} className="p-1 bg-rose-500/20 rounded-lg"><X size={12} className="text-rose-400" /></button>
                      </div>
                    ) : fmtCur(act)}
                  </td>
                  <td className={`px-4 py-3 text-xs text-right font-bold ${d > 0 ? 'text-rose-400' : d < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{item.status === 'paid' ? (d === 0 ? '—' : fmtCur(d)) : '—'}</td>
                  <td className="px-4 py-3 text-center">{item.status === 'paid' ? <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-[9px] font-bold rounded-full">Pago</span> : <span className="px-2 py-0.5 bg-blue-500/20 text-blue-400 text-[9px] font-bold rounded-full">Previsto</span>}</td>
                  <td className="px-4 py-3 text-center">
                    <div className="flex items-center justify-center gap-1">
                      {item.status === 'pending' && <button onClick={() => { setEditId(item.id); setIActual(item.expected_value); }} className="px-2 py-1 bg-violet-500/15 text-violet-400 text-[10px] font-bold rounded-lg hover:bg-violet-500/25">Lançar real</button>}
                      {item.status === 'paid' && <button onClick={() => { setEditId(item.id); setIActual(item.actual_value); }} className="p-1.5 hover:bg-white/10 rounded-lg"><Pencil size={11} className="text-slate-400" /></button>}
                      <button onClick={() => deleteItem(item.id)} className="p-1.5 hover:bg-white/10 rounded-lg"><X size={11} className="text-rose-400" /></button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {items.length === 0 && <tr><td colSpan={6} className="text-center py-8 text-slate-500 text-sm">Nenhum item cadastrado.</td></tr>}
            {/* Total row */}
            {items.length > 0 && (
              <tr className="bg-white/[0.03] border-t border-white/10">
                <td className="px-4 py-3 text-xs font-black text-dark-text uppercase">Total</td>
                <td className="px-4 py-3 text-xs text-right font-black text-dark-text">{fmtCur(totalExpected)}</td>
                <td className="px-4 py-3 text-xs text-right font-black text-emerald-400">{fmtCur(totalActual)}</td>
                <td className={`px-4 py-3 text-xs text-right font-black ${diff > 0 ? 'text-rose-400' : diff < 0 ? 'text-emerald-400' : 'text-slate-500'}`}>{diff === 0 ? '—' : fmtCur(diff)}</td>
                <td colSpan={2}></td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Add item modal */}
      {showAdd && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50" onClick={() => setShowAdd(false)}>
          <div className="bg-dark-bg border border-white/10 rounded-2xl p-6 w-full max-w-sm shadow-2xl" onClick={e => e.stopPropagation()}>
            <h3 className="text-sm font-bold text-dark-text mb-4">Adicionar Item</h3>
            <div className="space-y-3">
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Nome</label><input value={iName} onChange={e => setIName(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" /></div>
              <div><label className="text-[10px] font-bold text-slate-500 uppercase block mb-1">Valor Previsto</label><input type="number" step="0.01" value={iExpected} onChange={e => setIExpected(e.target.value)} className="w-full px-3 py-2 bg-dark-card border border-white/10 rounded-xl text-xs text-dark-text" /></div>
            </div>
            <button onClick={addItem} disabled={!iName} className="w-full mt-4 py-2.5 bg-violet-500 hover:bg-violet-600 disabled:opacity-40 rounded-xl text-xs font-bold text-white transition-all">Adicionar</button>
          </div>
        </div>
      )}
    </div>
  );
}
