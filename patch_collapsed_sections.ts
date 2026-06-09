import fs from 'fs';

let content = fs.readFileSync('src/pages/TodoPage.tsx', 'utf-8');

// 1. Add state variable
if (!content.includes('const [collapsedSections, setCollapsedSections]')) {
  content = content.replace(
    'const [tasks, setTasks] = useState<Task[]>([]);',
    'const [tasks, setTasks] = useState<Task[]>([]);\n  const [collapsedSections, setCollapsedSections] = useState<Record<string, boolean>>({});'
  );
}

// 2. Section tasks replacement
const sectionFind = `<div className="flex items-center gap-1.5 mb-1 group/section">
                              {renamingSectionId === section.id ? (
                                <input autoFocus type="text" value={renamingValue} onChange={(e) => setRenamingValue(e.target.value)}
                                  onBlur={() => handleRenameSection(section)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') { e.preventDefault(); handleRenameSection(section); }
                                    if (e.key === 'Escape') { renameSubmitted.current = true; setRenamingSectionId(null); setTimeout(() => { renameSubmitted.current = false; }, 100); }
                                  }}
                                  className="flex-1 text-[10px] font-bold bg-transparent border-b border-violet-500 text-violet-400 uppercase tracking-widest focus:outline-none" />

                              ) : (
                                <>
                                  <span className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest flex-1">{section.name}</span>
                                  <span className="text-[9px] bg-dark-text/10 px-1.5 py-0.5 rounded-full text-dark-text/40 font-bold">{sectionTasks.length}</span>
                                  <div className="hidden group-hover/section:flex items-center gap-0.5">
                                    <button onClick={() => { setRenamingSectionId(section.id); setRenamingValue(section.name); }} className="p-0.5 text-dark-text/30 hover:text-violet-400 transition-colors rounded" title="Renomear seção"><Edit2 size={10} /></button>
                                    {!section.is_fixed && (
                                      <button onClick={() => handleDeleteSection(section)} className="p-0.5 text-dark-text/30 hover:text-red-400 transition-colors rounded" title="Deletar seção"><Trash2 size={10} /></button>
                                    )}
                                  </div>
                                </>
                              )}
                            </div>
                            
<SortableSectionDropZone id={\`section-\${pid}-\${section.id}\`} items={sectionTasks.map(t => t.id)}>
  {sectionTasks.map(renderTaskRowCard)}
</SortableSectionDropZone>
{renderAddInput(section.id)}`;

const sectionReplace = `
                            {/* COLLAPSE LOGIC INJECTED HERE */}
                            {(() => {
                              const sectionKey = \`section-\${pid}-\${section.id}\`;
                              const isCollapsed = collapsedSections[sectionKey];
                              const toggleCollapse = () => setCollapsedSections(prev => ({ ...prev, [sectionKey]: !prev[sectionKey] }));
                              
                              return (
                                <>
                                  <div className="flex items-center gap-1.5 mb-1 group/section">
                                    {renamingSectionId === section.id ? (
                                      <input autoFocus type="text" value={renamingValue} onChange={(e) => setRenamingValue(e.target.value)}
                                        onBlur={() => handleRenameSection(section)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') { e.preventDefault(); handleRenameSection(section); }
                                          if (e.key === 'Escape') { renameSubmitted.current = true; setRenamingSectionId(null); setTimeout(() => { renameSubmitted.current = false; }, 100); }
                                        }}
                                        className="flex-1 text-[10px] font-bold bg-transparent border-b border-violet-500 text-violet-400 uppercase tracking-widest focus:outline-none" />
      
                                    ) : (
                                      <>
                                        <button onClick={toggleCollapse} className="text-dark-text/40 hover:text-dark-text/60 p-0.5 rounded transition-colors -ml-1">
                                          {isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                        </button>
                                        <span className="text-[10px] font-bold text-dark-text/50 uppercase tracking-widest flex-1 cursor-pointer" onClick={toggleCollapse}>{section.name}</span>
                                        <span className="text-[9px] bg-dark-text/10 px-1.5 py-0.5 rounded-full text-dark-text/40 font-bold">{sectionTasks.length}</span>
                                        <div className="hidden group-hover/section:flex items-center gap-0.5">
                                          <button onClick={() => { setRenamingSectionId(section.id); setRenamingValue(section.name); }} className="p-0.5 text-dark-text/30 hover:text-violet-400 transition-colors rounded" title="Renomear seção"><Edit2 size={10} /></button>
                                          {!section.is_fixed && (
                                            <button onClick={() => handleDeleteSection(section)} className="p-0.5 text-dark-text/30 hover:text-red-400 transition-colors rounded" title="Deletar seção"><Trash2 size={10} /></button>
                                          )}
                                        </div>
                                      </>
                                    )}
                                  </div>
                                  
                                  {!isCollapsed && (
                                    <>
                                      <SortableSectionDropZone id={\`section-\${pid}-\${section.id}\`} items={sectionTasks.map(t => t.id)}>
                                        {sectionTasks.map(renderTaskRowCard)}
                                      </SortableSectionDropZone>
                                      {renderAddInput(section.id)}
                                    </>
                                  )}
                                </>
                              );
                            })()}
`;

// 3. Unsectioned tasks replacement
const unsectionedFind = `<div className="flex items-center gap-1.5 mb-1">
                            <span className="text-[10px] font-bold text-dark-text/30 uppercase tracking-widest flex-1">Sem Seção</span>
                            <span className="text-[9px] bg-dark-text/10 px-1.5 py-0.5 rounded-full text-dark-text/30 font-bold">{unsectionedTasks.length}</span>
                          </div>
                          
<SortableSectionDropZone id={\`section-\${pid}-__none__\`} items={unsectionedTasks.map(t => t.id)}>
  {unsectionedTasks.map(renderTaskRowCard)}
</SortableSectionDropZone>`;

const unsectionedReplace = `{(() => {
                            const unsectionedKey = \`section-\${pid}-__none__\`;
                            const isUnsectionedCollapsed = collapsedSections[unsectionedKey];
                            const toggleUnsectioned = () => setCollapsedSections(prev => ({ ...prev, [unsectionedKey]: !prev[unsectionedKey] }));
                            
                            return (
                              <>
                                <div className="flex items-center gap-1.5 mb-1">
                                  <button onClick={toggleUnsectioned} className="text-dark-text/40 hover:text-dark-text/60 p-0.5 rounded transition-colors -ml-1">
                                    {isUnsectionedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                  <span className="text-[10px] font-bold text-dark-text/30 uppercase tracking-widest flex-1 cursor-pointer" onClick={toggleUnsectioned}>Sem Seção</span>
                                  <span className="text-[9px] bg-dark-text/10 px-1.5 py-0.5 rounded-full text-dark-text/30 font-bold">{unsectionedTasks.length}</span>
                                </div>
                                
                                {!isUnsectionedCollapsed && (
                                  <SortableSectionDropZone id={\`section-\${pid}-__none__\`} items={unsectionedTasks.map(t => t.id)}>
                                    {unsectionedTasks.map(renderTaskRowCard)}
                                  </SortableSectionDropZone>
                                )}
                              </>
                            );
                          })()}`;

if (content.includes(sectionFind.trim().substring(0, 50))) {
  content = content.replace(sectionFind, sectionReplace);
} else {
  console.log("Could not find section block!");
}

if (content.includes(unsectionedFind.trim().substring(0, 50))) {
  content = content.replace(unsectionedFind, unsectionedReplace);
} else {
  console.log("Could not find unsectioned block!");
}

fs.writeFileSync('src/pages/TodoPage.tsx', content);
console.log('Patched TodoPage.tsx');
