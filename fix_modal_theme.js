const fs = require('fs');
const path = './src/pages/CrmComercial.tsx';
let txt = fs.readFileSync(path, 'utf8');

const sIdx = txt.indexOf('isTelefonySettingsOpen && (');
const eIdx = txt.indexOf('{/* Comments Modal */}');
let modal = txt.slice(sIdx, eIdx);

// 1. Modal Wrapper
modal = modal.replace(
  /className="w-full rounded-xl overflow-hidden flex flex-col"\s*style={{ maxWidth: 560, maxHeight: '90vh', background: '#13111a', border: '1px solid #2d2b3d' }}/,
  `className="w-full rounded-xl overflow-hidden flex flex-col bg-white dark:bg-[#13111a] border border-gray-200 dark:border-[#2d2b3d]" style={{ maxWidth: 560, maxHeight: '90vh' }}`
);

// 2. Modal Header
modal = modal.replace(
  /className="flex items-center justify-between px-6 py-4 shrink-0" style={{ borderBottom: '1px solid #2d2b3d' }}/,
  `className="flex items-center justify-between px-6 py-4 shrink-0 border-b border-gray-200 dark:border-[#2d2b3d]"`
);
modal = modal.replace(
  /<h2 className="font-bold text-white text-lg flex items-center gap-2">/,
  `<h2 className="font-bold text-gray-800 dark:text-white text-lg flex items-center gap-2">`
);
modal = modal.replace(
  /className="p-2 rounded-lg hover:bg-white\/5 text-gray-400 hover:text-white transition-colors"/,
  `className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-white/5 text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white transition-colors"`
);

// 3. Tabs
modal = modal.replace(
  /className="flex items-center gap-1 px-4 pt-3 shrink-0" style={{ borderBottom: '1px solid #2d2b3d' }}/,
  `className="flex items-center gap-1 px-4 pt-3 shrink-0 border-b border-gray-200 dark:border-[#2d2b3d]"`
);
modal = modal.replace(
  /className="px-4 py-2\.5 text-sm font-semibold transition-all border-b-2 -mb-px"\n\s*style={{\n\s*borderColor: settingsTab === tab.key \? '#7c3aed' : 'transparent',\n\s*color: settingsTab === tab.key \? '#a78bfa' : '#6b7280',\n\s*}}/g,
  `className={\`px-4 py-2.5 text-sm font-semibold transition-all border-b-2 -mb-px \${settingsTab === tab.key ? 'border-violet-500 text-violet-600 dark:text-violet-400' : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-300'}\`}`
);

// 4. SIP Text colors & Generic texts
modal = modal.replace(/style={{ color: '#9ca3af' }}/g, `className="text-gray-500 dark:text-[#9ca3af]"`);
modal = modal.replace(/style={{ color: '#6b7280' }}/g, `className="text-gray-400 dark:text-[#6b7280]"`);
modal = modal.replace(/style={{ color: '#4ade80' }}/g, `className="text-emerald-600 dark:text-[#4ade80]"`);
modal = modal.replace(/style={{ color: '#e5e7eb' }}/g, `className="text-gray-700 dark:text-[#e5e7eb]"`);
modal = modal.replace(/style={{ color: '#4b5563' }}/g, `className="text-gray-500 dark:text-[#4b5563]"`);

// 5. Inputs (Tokens, sip_extension, etc)
const inputRegex = /className="w-full rounded-lg px-3\.5 py-2\.5 text-sm text-white outline-none transition-all" style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}\n\s*onFocus={e => { e\.currentTarget\.style\.borderColor = '#7c3aed'; e\.currentTarget\.style\.boxShadow = '0 0 0 3px rgba\\(124,58,237,0\.15\\)'; }}\n\s*onBlur={e => { e\.currentTarget\.style\.borderColor = '#2d2b3d'; e\.currentTarget\.style\.boxShadow = 'none'; }}/g;

modal = modal.replace(inputRegex, `className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-800 dark:text-white bg-gray-50 border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:bg-[#0d0b14] dark:border-[#2d2b3d]"`);

// Generic inputs missing text-white
const genInputRegex = /className="w-full rounded-lg px-3\.5 py-2\.5 text-sm outline-none transition-all" style={{ background: '#0d0b14', border: '1px solid #2d2b3d', color: '#9ca3af' }}\n\s*onFocus={e => { e\.currentTarget\.style\.borderColor = '#7c3aed'; e\.currentTarget\.style\.boxShadow = '0 0 0 3px rgba\\(124,58,237,0\.15\\)'; }}\n\s*onBlur={e => { e\.currentTarget\.style\.borderColor = '#2d2b3d'; e\.currentTarget\.style\.boxShadow = 'none'; }}/g;

modal = modal.replace(genInputRegex, `className="w-full rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-500 dark:text-[#9ca3af] bg-gray-50 border border-gray-200 focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20 dark:bg-[#0d0b14] dark:border-[#2d2b3d]"`);

// 6. Action buttons container (cancelar background generic)
modal = modal.replace(
  /style={{ background: 'transparent', border: '1px solid #2d2b3d', color: '#9ca3af' }}/g,
  `className="bg-transparent border border-gray-300 dark:border-[#2d2b3d] text-gray-600 dark:text-[#9ca3af] hover:bg-gray-100 dark:hover:bg-white/5"`
);

// 7. Webhook & Sequencias Block Fixes
modal = modal.replace(
  /className="font-bold text-white text-sm"/g,
  `className="font-bold text-gray-800 dark:text-white text-sm"`
);
modal = modal.replace(
  /className="font-bold text-white text-lg"/g,
  `className="font-bold text-gray-800 dark:text-white text-lg"`
);

// Webhook input block
modal = modal.replace(
  /style={{ background: 'rgba\\(0,0,0,0\.3\\)', border: '1px solid rgba\\(255,255,255,0\.08\\)' }}/,
  `className="bg-gray-100 dark:bg-black/30 border border-gray-200 dark:border-white/10"`
);

modal = modal.replace(
  /style={{ background: 'rgba\\(0,0,0,0\.2\\)' }}/,
  `className="bg-gray-50 dark:bg-black/20"`
);

// 8. Motivos de Perda
modal = modal.replace(
  /style={{ background: 'rgba\\(255,255,255,0\.03\\)', border: '1px solid #2d2b3d' }}/g,
  `className="bg-gray-50 border border-gray-200 dark:bg-white/5 dark:border-[#2d2b3d]"`
);

const inlineInput = /className="flex-1 rounded-lg px-3\.5 py-2\.5 text-sm text-white outline-none transition-all"\n\s*style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}\n\s*onFocus={e => { e\.currentTarget\.style\.borderColor = '#7c3aed'; e\.currentTarget\.style\.boxShadow = '0 0 0 3px rgba\\(124,58,237,0\.15\\)'; }}\n\s*onBlur={e => { e\.currentTarget\.style\.borderColor = '#2d2b3d'; e\.currentTarget\.style\.boxShadow = 'none'; }}/g;

modal = modal.replace(inlineInput, `className="flex-1 rounded-lg px-3.5 py-2.5 text-sm outline-none transition-all text-gray-800 dark:text-white bg-white dark:bg-[#0d0b14] border border-gray-200 dark:border-[#2d2b3d] focus:border-violet-500 focus:ring-2 focus:ring-violet-500/20"`);

const txtInput = /className="w-full rounded-lg px-3\.5 py-2 text-sm outline-none transition-all"\n\s*style={{ background: '#0d0b14', border: '1px solid #2d2b3d', color: '#9ca3af' }}\n\s*onFocus={e => { e\.currentTarget\.style\.borderColor = '#7c3aed'; }}\n\s*onBlur={e => { e\.currentTarget\.style\.borderColor = '#2d2b3d'; }}/g;

modal = modal.replace(txtInput, `className="w-full rounded-lg px-3.5 py-2 text-sm outline-none transition-all text-gray-500 bg-white dark:bg-[#0d0b14] border border-gray-200 dark:border-[#2d2b3d] focus:border-violet-500"`);

const clInput = /className="w-9 h-9 rounded-lg cursor-pointer border-0 p-0\.5"\n\s*style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}/g;
modal = modal.replace(clInput, `className="w-9 h-9 rounded-lg cursor-pointer p-0.5 bg-white dark:bg-[#0d0b14] border border-gray-200 dark:border-[#2d2b3d]"`);

const clEdit = /className="w-8 h-8 rounded cursor-pointer p-0\.5" style={{ background: '#0d0b14', border: '1px solid #2d2b3d' }}/g;
modal = modal.replace(clEdit, `className="w-8 h-8 rounded cursor-pointer p-0.5 bg-white dark:bg-[#0d0b14] border border-gray-200 dark:border-[#2d2b3d]"`);

const itName = /className="flex-1 rounded-lg px-3 py-1\.5 text-sm text-white outline-none" style={{ background: '#0d0b14', border: '1px solid #7c3aed' }}/g;
modal = modal.replace(itName, `className="flex-1 rounded-lg px-3 py-1.5 text-sm outline-none bg-white dark:bg-[#0d0b14] border border-violet-500 text-gray-800 dark:text-white"`);

modal = modal.replace(/className="text-sm font-semibold text-white truncate"/g, `className="text-sm font-semibold text-gray-800 dark:text-white truncate"`);

fs.writeFileSync(path, txt.slice(0, sIdx) + modal + txt.slice(eIdx));
