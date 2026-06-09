import fs from 'fs';

let content = fs.readFileSync('src/pages/TodoPage.tsx', 'utf-8');

const sectionFind = `{isCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
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
                                  )}`;

const sectionReplace = `<div className={\`transform transition-transform duration-200 \${isCollapsed ? '-rotate-90' : 'rotate-0'}\`}>
                                            <ChevronDown size={12} />
                                          </div>
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
                                  
                                  <AnimatePresence initial={false}>
                                    {!isCollapsed && (
                                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                        <SortableSectionDropZone id={\`section-\${pid}-\${section.id}\`} items={sectionTasks.map(t => t.id)}>
                                          {sectionTasks.map(renderTaskRowCard)}
                                        </SortableSectionDropZone>
                                        {renderAddInput(section.id)}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>`;

const unsectionedFind = `{isUnsectionedCollapsed ? <ChevronRight size={12} /> : <ChevronDown size={12} />}
                                  </button>
                                  <span className="text-[10px] font-bold text-dark-text/30 uppercase tracking-widest flex-1 cursor-pointer" onClick={toggleUnsectioned}>Sem Seção</span>
                                  <span className="text-[9px] bg-dark-text/10 px-1.5 py-0.5 rounded-full text-dark-text/30 font-bold">{unsectionedTasks.length}</span>
                                </div>
                                
                                {!isUnsectionedCollapsed && (
                                  <SortableSectionDropZone id={\`section-\${pid}-__none__\`} items={unsectionedTasks.map(t => t.id)}>
                                    {unsectionedTasks.map(renderTaskRowCard)}
                                  </SortableSectionDropZone>
                                )}`;

const unsectionedReplace = `<div className={\`transform transition-transform duration-200 \${isUnsectionedCollapsed ? '-rotate-90' : 'rotate-0'}\`}>
                                      <ChevronDown size={12} />
                                    </div>
                                  </button>
                                  <span className="text-[10px] font-bold text-dark-text/30 uppercase tracking-widest flex-1 cursor-pointer" onClick={toggleUnsectioned}>Sem Seção</span>
                                  <span className="text-[9px] bg-dark-text/10 px-1.5 py-0.5 rounded-full text-dark-text/30 font-bold">{unsectionedTasks.length}</span>
                                </div>
                                
                                <AnimatePresence initial={false}>
                                  {!isUnsectionedCollapsed && (
                                    <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} transition={{ duration: 0.2, ease: 'easeInOut' }} className="overflow-hidden">
                                      <SortableSectionDropZone id={\`section-\${pid}-__none__\`} items={unsectionedTasks.map(t => t.id)}>
                                        {unsectionedTasks.map(renderTaskRowCard)}
                                      </SortableSectionDropZone>
                                    </motion.div>
                                  )}
                                </AnimatePresence>`;

if (content.includes(sectionFind)) {
  content = content.replace(sectionFind, sectionReplace);
} else {
  console.log("Could not find section block!");
}

if (content.includes(unsectionedFind)) {
  content = content.replace(unsectionedFind, unsectionedReplace);
} else {
  console.log("Could not find unsectioned block!");
}

fs.writeFileSync('src/pages/TodoPage.tsx', content);
console.log('Patched animations in TodoPage.tsx');
