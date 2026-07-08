// Sessão do cliente do portal — auth própria (Neon), independente do Firebase.
// Guarda o token assinado emitido por /api/portal/auth/login no localStorage.
import React, { createContext, useContext, useState, useEffect } from 'react';

const TOKEN_KEY = 'grapehub_client_token';
const INFO_KEY = 'grapehub_client_info';

export interface ClientSession { token: string; email: string | null; name: string | null; projectId: string; companyName: string | null; }

interface Ctx {
  session: ClientSession | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; error?: string }>;
  logout: () => void;
}

export const getClientToken = (): string | null => {
  try { return localStorage.getItem(TOKEN_KEY); } catch { return null; }
};
const clearStored = () => { try { localStorage.removeItem(TOKEN_KEY); localStorage.removeItem(INFO_KEY); } catch { /* ignore */ } };

const ClientSessionContext = createContext<Ctx>({ session: null, loading: true, login: async () => ({ ok: false }), logout: () => {} });
export const useClientSession = () => useContext(ClientSessionContext);

export const ClientSessionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [session, setSession] = useState<ClientSession | null>(null);
  const [loading, setLoading] = useState(true);

  // Ao montar: se há token guardado, valida com /api/portal/me. Se inválido/expirado, limpa.
  useEffect(() => {
    const token = getClientToken();
    if (!token) { setLoading(false); return; }
    let info: any = null;
    try { info = JSON.parse(localStorage.getItem(INFO_KEY) || 'null'); } catch { /* ignore */ }
    if (info) setSession({ token, email: info.email ?? null, name: info.name ?? null, projectId: info.projectId, companyName: info.companyName ?? null });
    fetch('/api/portal/me')
      .then(async r => {
        if (r.ok) {
          const d = await r.json();
          const s: ClientSession = { token, email: info?.email ?? null, name: info?.name ?? null, projectId: d.project?.id, companyName: d.project?.name ?? info?.companyName ?? null };
          setSession(s);
          try { localStorage.setItem(INFO_KEY, JSON.stringify({ email: s.email, name: s.name, projectId: s.projectId, companyName: s.companyName })); } catch { /* ignore */ }
        } else {
          clearStored(); setSession(null);
        }
      })
      .catch(() => { /* mantém a sessão otimista em caso de rede instável */ })
      .finally(() => setLoading(false));
  }, []);

  const login = async (email: string, password: string): Promise<{ ok: boolean; error?: string }> => {
    try {
      const r = await fetch('/api/portal/auth/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });
      const d = await r.json().catch(() => ({}));
      if (!r.ok) return { ok: false, error: d.error || 'Falha ao entrar.' };
      try {
        localStorage.setItem(TOKEN_KEY, d.token);
        localStorage.setItem(INFO_KEY, JSON.stringify({ email: d.email, name: d.name, projectId: d.projectId, companyName: d.companyName }));
      } catch { /* ignore */ }
      setSession({ token: d.token, email: d.email ?? null, name: d.name ?? null, projectId: d.projectId, companyName: d.companyName ?? null });
      return { ok: true };
    } catch {
      return { ok: false, error: 'Erro de conexão. Tente novamente.' };
    }
  };

  const logout = () => { clearStored(); setSession(null); };

  return (
    <ClientSessionContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </ClientSessionContext.Provider>
  );
};
