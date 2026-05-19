const fs = require('fs');

let content = fs.readFileSync('src/pages/ContasAPagar.tsx', 'utf8');

// Replace Imports
content = content.replace("import { AlertTriangle, Clock, CalendarDays, BarChart2, CreditCard, ChevronLeft, ChevronRight, RefreshCw } from 'lucide-react';",
"import { AlertTriangle, Clock, CalendarDays, BarChart2, CreditCard, ChevronLeft, ChevronRight, RefreshCw, Activity, CheckCircle2 } from 'lucide-react';\nimport { PageHeader } from '../components/ui/PageHeader';")

// Outer wrapper
content = content.replace(
    '<div className="min-h-screen transition-colors duration-300 p-6 md:p-8" style={{ background: \'#0a0a0f\', fontFamily: "\'DM Sans\', sans-serif" }}>',
    '<div className="min-h-screen bg-dark-bg p-8 font-sans text-dark-text transition-colors duration-300">\n      <div className="max-w-[1600px] mx-auto space-y-6">'
)

// Header
const old_header = `      {/* ── Header ─────────────────────────────────────────── */}
      <div className="flex items-center justify-between pb-6">
        <div>
          <h1 className="text-2xl font-black tracking-tight" style={{ color: '#e2e0f0' }}>
            Contas a <span style={{ color: tabColor }}>Pagar</span>
          </h1>
          <p className="text-[10px] font-bold uppercase tracking-widest mt-0.5" style={{ color: '#5c5a7a' }}>
            Provisões pendentes · Marvee Sync
          </p>
        </div>
        <div className="flex items-center gap-3">
          {/* Month selector */}
          <div className="flex items-center gap-1 rounded-xl px-1 py-1" style={{ background: '#1a1830', border: '1px solid #2d2b4a' }}>
            <button onClick={prevMonth} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
              <ChevronLeft size={14} style={{ color: '#7c7a9a' }} />
            </button>
            <button
              onClick={() => setSelectedMonth(selectedMonth ? null : currentMonthKey)}
              className="px-3 py-1 text-xs font-bold min-w-[120px] text-center transition-colors"
              style={{ color: '#e2e0f0' }}
            >
              {monthLabel}
            </button>
            <button onClick={nextMonth} className="w-7 h-7 rounded-lg flex items-center justify-center transition-colors hover:bg-white/5">
              <ChevronRight size={14} style={{ color: '#7c7a9a' }} />
            </button>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors hover:bg-white/5"
            style={{ background: '#1a1830', border: '1px solid #2d2b4a' }}
          >
            <RefreshCw size={14} className={spinning ? 'animate-spin' : ''} style={{ color: '#7c7a9a' }} />
          </button>
        </div>
      </div>

      {/* ── Tabs ────────────────────────────────────────────── */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => setActiveTab('contas')}
          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{
            background: activeTab === 'contas' ? '#7C3AED' : '#1a1830',
            color: activeTab === 'contas' ? '#fff' : '#7c7a9a',
            border: \`1px solid \${activeTab === 'contas' ? '#7C3AED' : '#2d2b4a'}\`,
          }}
        >
          Contas a Pagar
        </button>
        <button
          onClick={() => setActiveTab('sicredi')}
          className="px-5 py-2.5 rounded-xl text-xs font-bold transition-all"
          style={{
            background: activeTab === 'sicredi' ? '#22c55e' : '#1a1830',
            color: activeTab === 'sicredi' ? '#fff' : '#7c7a9a',
            border: \`1px solid \${activeTab === 'sicredi' ? '#22c55e' : '#2d2b4a'}\`,
          }}
        >
          Sicredi
        </button>
      </div>`;

const new_header = `      <PageHeader 
        title="Contas a" 
        titleAccent="Pagar" 
        subtitle="Provisões pendentes · Marvee Sync"
      >
        <div className="flex items-center gap-3">
          <div className="flex items-center bg-dark-card border border-white/10 rounded-xl p-1">
            <button onClick={prevMonth} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
              <ChevronLeft size={16} className="text-slate-400" />
            </button>
            <button onClick={() => setSelectedMonth(selectedMonth ? null : currentMonthKey)} className="px-3 py-1 text-sm font-bold text-dark-text min-w-[120px] text-center hover:bg-white/5 rounded-lg transition-colors">
              {monthLabel}
            </button>
            <button onClick={nextMonth} className="p-1 hover:bg-white/5 rounded-lg transition-colors">
              <ChevronRight size={16} className="text-slate-400" />
            </button>
          </div>
          <button onClick={() => fetchData(true)} className="p-2.5 bg-dark-card border border-white/10 hover:bg-white/5 rounded-xl transition-colors">
            <RefreshCw size={16} className={\`text-slate-400 \${spinning ? 'animate-spin' : ''}\`} />
          </button>
        </div>
      </PageHeader>

      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-white/10 pb-4">
        <div className="flex items-center gap-6">
          <button 
            onClick={() => setActiveTab('contas')}
            className={\`flex items-center gap-2 pb-4 -mb-[17px] border-b-2 font-bold text-sm transition-colors \${activeTab === 'contas' ? 'border-violet-500 text-violet-400' : 'border-transparent text-slate-400 hover:text-white'}\`}
          >
            Contas a Pagar
          </button>
          <button 
            onClick={() => setActiveTab('sicredi')}
            className={\`flex items-center gap-2 pb-4 -mb-[17px] border-b-2 font-bold text-sm transition-colors \${activeTab === 'sicredi' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-slate-400 hover:text-white'}\`}
          >
            Sicredi
          </button>
        </div>
      </div>`;

content = content.replace(old_header, new_header);

// KPI Cards
content = content.replace(/className="rounded-\[10px\] p-4" style={{ background: '#1a1830', border: '1px solid #2d2b4a' }}/g, 'className="bg-dark-card border border-white/10 rounded-2xl p-6 relative overflow-hidden flex flex-col"');

// Table Header
content = content.replace(/className="flex items-center justify-between px-4 py-2\.5 rounded-t-\[10px\]" style={{ background: '#12101e' }}/g, 'className="flex items-center justify-between px-6 py-4 rounded-t-2xl bg-dark-bg border border-white/10"');

// Table Body
content = content.replace(/className="overflow-x-auto rounded-b-\[10px\]" style={{ background: '#1a1830', border: '1px solid #2d2b4a', borderTop: 'none' }}/g, 'className="overflow-x-auto rounded-b-2xl bg-dark-card border border-white/10 border-t-0"');

// Row hover and borders
content = content.replace(/style={{ borderBottom: '1px solid #141228' }}/g, 'className="border-b border-white/5 hover:bg-white/5 transition-colors"');
content = content.replace(/onMouseEnter=\{[^\}]+\}/g, '');
content = content.replace(/onMouseLeave=\{[^\}]+\}/g, '');
content = content.replace(/className="transition-colors"\s+className="border-b/g, 'className="border-b');

// End div (add closing div for max-w container)
if (!content.includes('</PageHeader>')) {
  console.log("Error: replacement failed");
} else {
  // add the closing div
  content = content.replace('  );\n}\n', '      </div>\n    </div>\n  );\n}\n');
}

fs.writeFileSync('src/pages/ContasAPagar.tsx', content);
