import React, { useState } from 'react';
import { X, Check, Lock, Unlock, Users, Loader2 } from 'lucide-react';
import { UserData, UserRole } from '../../types';

import { Modal } from './ui/Modal';
import { designSystem } from '../design-system';
import LoadingSpinner from './LoadingSpinner';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: UserData;
  menu: any[];
  roles: { id: UserRole; label: string }[];
  currentData: { allowedPages: string[], role: UserRole, squad?: string };
  isSaving: boolean;
  changeRole: (id: string, newRole: UserRole) => void;
  changeSquad: (id: string, newSquad: string) => void;
  togglePage: (id: string, pageId: string) => void;
  toggleSection: (id: string, subSubSessionId: string) => void;
  toggleSubSession: (id: string, subSessionId: string) => void;
  toggleMenuSection: (id: string, sectionId: string) => void;
  savePermissions: (id: string) => Promise<void>;
  discardChanges: (id: string) => void;
  refreshMenu: () => Promise<void>;
  changeName: (id: string, newName: string) => void;
}

export const UserPermissionsModal: React.FC<Props> = ({
  isOpen, onClose, user, menu, roles, currentData, isSaving,
  changeRole, changeName, changeSquad, togglePage, toggleSection, toggleSubSession, toggleMenuSection, savePermissions, discardChanges, refreshMenu
}) => {
  console.log('UserPermissionsModal rendering, isOpen:', isOpen);
  const [activeTab, setActiveTab] = useState<'perfil' | 'permissoes'>('perfil');

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Configurações de ${user.name || user.email}`}
      maxWidth="max-w-4xl"
      footer={
        <>
          <button 
            onClick={() => { discardChanges(user.id); onClose(); }}
            className={designSystem.button.secondary}
          >
            Cancelar
          </button>
          <button 
            onClick={async () => { await savePermissions(user.id); onClose(); }}
            disabled={isSaving}
            className={designSystem.button.primary}
          >
            {isSaving ? <Loader2 size={16} className="animate-spin" /> : <Check size={16} />}
            Salvar Alterações
          </button>
        </>
      }
    >
      <div className="flex flex-col h-full">
        {/* Tabs */}
        <div className="flex border-b modal-divider shrink-0 mb-6">
          <button
            onClick={() => setActiveTab('perfil')}
            className={`py-4 px-6 text-sm font-bold transition-colors ${activeTab === 'perfil' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Perfil
          </button>
          <button
            onClick={() => setActiveTab('permissoes')}
            className={`py-4 px-6 text-sm font-bold transition-colors ${activeTab === 'permissoes' ? 'modal-tab-active' : 'text-slate-500 hover:text-gray-900 dark:hover:text-white'}`}
          >
            Permissões
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          {activeTab === 'perfil' ? (
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <div className="w-20 h-20 rounded-full bg-slate-700 flex items-center justify-center text-white font-bold text-2xl overflow-hidden shrink-0">
                  {user.picture ? <img src={user.picture} alt={user.name || user.email} className="w-full h-full object-cover" referrerPolicy="no-referrer" /> : (user.name || user.email)[0].toUpperCase()}
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900 dark:text-white">Foto de Perfil</h3>
                  <p className="text-sm text-gray-500 dark:text-slate-400">Clique na foto para alterar. JPG, PNG, GIF ou WebP. Máx 5MB.</p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className={designSystem.input.label}>Nome *</label>
                  <input
                    type="text"
                    value={(currentData as any).name ?? user.name ?? ''}
                    onChange={(e) => changeName(user.id, e.target.value)}
                    placeholder="Nome completo..."
                    className={designSystem.input.field}
                  />
                </div>
                <div>
                  <label className={designSystem.input.label}>Email</label>
                  <input type="email" defaultValue={user.email} disabled className={`${designSystem.input.field} opacity-50 cursor-not-allowed`} />
                </div>
              </div>

              <div>
                <label className={designSystem.input.label}>Nível de Acesso</label>
                <div className="relative">
                  <select 
                    value={currentData.role}
                    onChange={(e) => changeRole(user.id, e.target.value as UserRole)}
                    className={`${designSystem.input.field} appearance-none`}
                  >
                    {roles.map(role => (
                      <option key={role.id} value={role.id} className="bg-white dark:bg-neutral-900 darker:bg-black">{role.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div>
                <label className={designSystem.input.label}>Squad</label>
                <div className="relative">
                  <select 
                    value={currentData.squad || ''}
                    onChange={(e) => changeSquad(user.id, e.target.value)}
                    className={`${designSystem.input.field} appearance-none`}
                  >
                    <option value="" className="bg-white dark:bg-neutral-900 darker:bg-black">Selecione um squad</option>
                    {Array.isArray(menu) && menu.length > 0 && menu[0].subSessions && menu[0].subSessions.map(ss => (
                      <option key={ss.id} value={ss.label} className="bg-white dark:bg-neutral-900 darker:bg-black">{ss.label}</option>
                    ))}
                  </select>
                  <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                    <svg width="12" height="12" viewBox="0 0 12 12" fill="none" xmlns="http://www.w3.org/2000/svg">
                      <path d="M2 4L6 8L10 4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className={designSystem.input.label}>Telefone</label>
                  <input type="text" placeholder="+55 11 99999-9999" className={designSystem.input.field} />
                </div>
              </div>

              <div>
                <label className={designSystem.input.label}>Bio</label>
                <textarea placeholder="Conte um pouco sobre você..." className={`${designSystem.input.field} h-24`} />
              </div>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Permissions */}
              <div className="space-y-8">
                {Array.isArray(menu) && menu.map(section => {
                  // Collect all page IDs from every level: section.pages, section.subSubSessions, section.subSessions
                  const sectionPageIds = [
                    ...(section.pages || []).map((p: any) => p.id),
                    ...(section.subSubSessions || []).flatMap((sss: any) => (sss.pages || []).map((p: any) => p.id)),
                    ...(section.subSessions || []).flatMap((ss: any) => {
                      const pIds = (ss.subSubSessions || []).flatMap((sss: any) => (sss.pages || []).map((p: any) => p.id));
                      if (ss.pages) pIds.push(...ss.pages.map((p: any) => p.id));
                      return pIds;
                    }),
                  ];
                  const allAllowed = sectionPageIds.length > 0 && sectionPageIds.every(id => currentData.allowedPages.includes(id));
                  const someAllowed = sectionPageIds.some(id => currentData.allowedPages.includes(id));

                  return (
                    <div key={section.id} className="space-y-4">
                      <div className="flex items-center justify-between border-b border-gray-200 dark:border-white/5 pb-2">
                        <h3 className="text-lg font-bold text-gray-900 dark:text-white">{section.title}</h3>
                        <button
                          onClick={() => toggleMenuSection(user.id, section.id)}
                          className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                            allAllowed ? 'bg-purple-600 dark:bg-violet-600 text-white' : someAllowed ? 'bg-purple-600/40 dark:bg-violet-600/40 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-500'
                          }`}
                        >
                          {allAllowed ? 'Liberar Tudo' : someAllowed ? 'Parcial' : 'Bloquear'}
                        </button>
                      </div>

                      {/* Pages directly under section */}
                      {Array.isArray(section.pages) && section.pages.length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                          {section.pages.map((page: any) => {
                            const isAllowed = currentData.allowedPages.includes(page.id);
                            return (
                              <button
                                key={page.id}
                                onClick={() => togglePage(user.id, page.id)}
                                className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${
                                  isAllowed ? 'bg-purple-600/10 dark:bg-violet-600/10 text-purple-600 dark:text-violet-400 border-purple-500/30 dark:border-violet-500/30' : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-slate-400 border-gray-200 dark:border-white/5'
                                }`}
                              >
                                {isAllowed ? <Unlock size={12} /> : <Lock size={12} />}
                                {page.label}
                              </button>
                            );
                          })}
                        </div>
                      )}

                      {/* SubSubSessions directly under section (no subsession) */}
                      {Array.isArray(section.subSubSessions) && section.subSubSessions.map((sss: any) => {
                        const sssPageIds = (sss.pages || []).map((p: any) => p.id);
                        const sssAll = sssPageIds.length > 0 && sssPageIds.every((id: string) => currentData.allowedPages.includes(id));
                        const sssSome = sssPageIds.some((id: string) => currentData.allowedPages.includes(id));
                        return (
                          <div key={sss.id} className="ml-4 space-y-2">
                            <div className="flex items-center justify-between">
                              <h5 className="text-sm font-bold text-gray-500 dark:text-slate-400">{sss.label}</h5>
                              <button
                                onClick={() => toggleSection(user.id, sss.id)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                  sssAll ? 'bg-purple-600 dark:bg-violet-600 text-white' : sssSome ? 'bg-purple-600/40 dark:bg-violet-600/40 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-500'
                                }`}
                              >
                                {sssAll ? 'Liberar Tudo' : sssSome ? 'Parcial' : 'Bloquear'}
                              </button>
                            </div>
                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                              {(sss.pages || []).map((page: any) => {
                                const isAllowed = currentData.allowedPages.includes(page.id);
                                return (
                                  <button key={page.id} onClick={() => togglePage(user.id, page.id)}
                                    className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${
                                      isAllowed ? 'bg-purple-600/10 dark:bg-violet-600/10 text-purple-600 dark:text-violet-400 border-purple-500/30 dark:border-violet-500/30' : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-slate-400 border-gray-200 dark:border-white/5'
                                    }`}
                                  >
                                    {isAllowed ? <Unlock size={12} /> : <Lock size={12} />}
                                    {page.label}
                                  </button>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                      {/* SubSessions */}
                      {Array.isArray(section.subSessions) && section.subSessions.map((subSession: any) => {
                        const ssPageIds = [
                          ...(subSession.pages || []).map((p: any) => p.id),
                          ...(subSession.subSubSessions || []).flatMap((sss: any) => (sss.pages || []).map((p: any) => p.id)),
                        ];
                        const ssAll = ssPageIds.length > 0 && ssPageIds.every(id => currentData.allowedPages.includes(id));
                        const ssSome = ssPageIds.some(id => currentData.allowedPages.includes(id));

                        return (
                          <div key={subSession.id} className="ml-4 space-y-4">
                            <div className="flex items-center justify-between">
                              <h4 className="text-md font-bold text-purple-600 dark:text-violet-500">{subSession.label}</h4>
                              <button
                                onClick={() => toggleSubSession(user.id, subSession.id)}
                                className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                  ssAll ? 'bg-purple-600 dark:bg-violet-600 text-white' : ssSome ? 'bg-purple-600/40 dark:bg-violet-600/40 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-500'
                                }`}
                              >
                                {ssAll ? 'Liberar Tudo' : ssSome ? 'Parcial' : 'Bloquear'}
                              </button>
                            </div>

                            {/* Pages directly under subSession */}
                            {Array.isArray(subSession.pages) && subSession.pages.length > 0 && (
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2 mb-4">
                                {subSession.pages.map((page: any) => {
                                  const isAllowed = currentData.allowedPages.includes(page.id);
                                  return (
                                    <button key={page.id} onClick={() => togglePage(user.id, page.id)}
                                      className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${
                                        isAllowed ? 'bg-purple-600/10 dark:bg-violet-600/10 text-purple-600 dark:text-violet-400 border-purple-500/30 dark:border-violet-500/30' : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-slate-400 border-gray-200 dark:border-white/5'
                                      }`}
                                    >
                                      {isAllowed ? <Unlock size={12} /> : <Lock size={12} />}
                                      {page.label}
                                    </button>
                                  );
                                })}
                              </div>
                            )}

                            {/* SubSubSessions */}
                            {Array.isArray(subSession.subSubSessions) && subSession.subSubSessions.map((sss: any) => {
                              const sssPageIds = (sss.pages || []).map((p: any) => p.id);
                              const sssAll = sssPageIds.length > 0 && sssPageIds.every((id: string) => currentData.allowedPages.includes(id));
                              const sssSome = sssPageIds.some((id: string) => currentData.allowedPages.includes(id));
                              return (
                                <div key={sss.id} className="ml-4 space-y-2">
                                  <div className="flex items-center justify-between">
                                    <h5 className="text-sm font-bold text-gray-500 dark:text-slate-400">{sss.label}</h5>
                                    <button
                                      onClick={() => toggleSection(user.id, sss.id)}
                                      className={`px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all ${
                                        sssAll ? 'bg-purple-600 dark:bg-violet-600 text-white' : sssSome ? 'bg-purple-600/40 dark:bg-violet-600/40 text-white' : 'bg-gray-100 dark:bg-white/5 text-gray-500 dark:text-slate-500'
                                      }`}
                                    >
                                      {sssAll ? 'Liberar Tudo' : sssSome ? 'Parcial' : 'Bloquear'}
                                    </button>
                                  </div>
                                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
                                    {(sss.pages || []).map((page: any) => {
                                      const isAllowed = currentData.allowedPages.includes(page.id);
                                      return (
                                        <button key={page.id} onClick={() => togglePage(user.id, page.id)}
                                          className={`px-3 py-2 rounded-lg text-[10px] font-bold uppercase tracking-widest transition-all flex items-center gap-2 border ${
                                            isAllowed ? 'bg-purple-600/10 dark:bg-violet-600/10 text-purple-600 dark:text-violet-400 border-purple-500/30 dark:border-violet-500/30' : 'bg-gray-50 dark:bg-white/5 text-gray-400 dark:text-slate-400 border-gray-200 dark:border-white/5'
                                          }`}
                                        >
                                          {isAllowed ? <Unlock size={12} /> : <Lock size={12} />}
                                          {page.label}
                                        </button>
                                      );
                                    })}
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};
