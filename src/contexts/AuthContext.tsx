import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import { UserData, UserRole } from '../../types';

interface AuthContextType {
  user: FirebaseUser | null;
  userData: UserData | null;
  loading: boolean;
  refreshUserData: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<FirebaseUser | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchUserDataFromApi = async (firebaseUser: FirebaseUser) => {
    const email = firebaseUser.email;
    if (!email) return null;

    // Helper: authenticated fetch with Bearer token + 10s timeout
    const authFetch = async (url: string, options?: RequestInit): Promise<Response> => {
      const token = await firebaseUser.getIdToken();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);
      try {
        return await fetch(url, {
          ...options,
          signal: ctrl.signal,
          headers: {
            ...(options?.headers as Record<string, string> || {}),
            Authorization: `Bearer ${token}`,
          },
        });
      } finally {
        clearTimeout(timer);
      }
    };

    try {
      const response = await authFetch(`/api/users/profile/${encodeURIComponent(email)}`);

      if (response.ok) {
        const data = await response.json();

        // Sync displayName / photoURL from Firebase if outdated
        const shouldUpdateName = firebaseUser.displayName && data.name !== firebaseUser.displayName;
        const shouldUpdatePicture = firebaseUser.photoURL && !data.picture;

        if (shouldUpdateName || shouldUpdatePicture) {
          const newName = shouldUpdateName ? firebaseUser.displayName : data.name;
          const newPicture = shouldUpdatePicture ? firebaseUser.photoURL : data.picture;
          try {
            await authFetch(`/api/users/${data.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ role: data.role, allowedPages: data.allowedPages, name: newName, picture: newPicture }),
            });
          } catch (e) {
            console.warn('[AuthContext] Falha ao sincronizar nome/foto:', e);
          }
          data.name = newName;
          data.picture = newPicture;
        }

        setUserData(data);
        console.log('Fetched userData:', data);
        return data;

      } else if (response.status === 404) {
        // Usuário novo — cria no banco
        const isSuperAdmin = email === 'jeanchan@grapemidia.com';
        const initialData = {
          uid: firebaseUser.uid,
          email,
          name: firebaseUser.displayName,
          picture: firebaseUser.photoURL,
          role: isSuperAdmin ? 'superadmin' : 'user',
          allowedPages: isSuperAdmin
            ? ['admin', 'gestor', 'notifications', 'settings']
            : ['gestor', 'notifications', 'settings'],
        };
        const createRes = await authFetch('/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(initialData),
        });
        if (createRes.ok) {
          const secondRes = await authFetch(`/api/users/profile/${encodeURIComponent(email)}`);
          if (secondRes.ok) {
            const data = await secondRes.json();
            setUserData(data);
            return data;
          }
        }
      }
    } catch (error) {
      console.error('[AuthContext] Erro ao buscar dados do usuário:', error);
    }
    return null;
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserDataFromApi(user);
    }
  };

  useEffect(() => {
    let bgRetryTimer: ReturnType<typeof setInterval> | null = null;

    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        if (bgRetryTimer) { clearInterval(bgRetryTimer); bgRetryTimer = null; }
        return;
      }

      // Retry up to 3 times with exponential backoff if the API call fails
      let result = null;
      for (let attempt = 0; attempt < 3; attempt++) {
        result = await fetchUserDataFromApi(firebaseUser);
        if (result) break;
        // Wait 2s, 4s, 8s before retrying (longer waits for cold starts)
        await new Promise(r => setTimeout(r, 2000 * Math.pow(2, attempt)));
        console.warn(`[AuthContext] Retry ${attempt + 1}/3 fetching userData...`);
      }
      setLoading(false);

      // If all 3 attempts failed, keep retrying in background every 5s
      if (!result && firebaseUser) {
        console.warn('[AuthContext] Initial fetch failed, starting background retry...');
        bgRetryTimer = setInterval(async () => {
          const retryResult = await fetchUserDataFromApi(firebaseUser);
          if (retryResult) {
            console.log('[AuthContext] Background retry succeeded!');
            if (bgRetryTimer) { clearInterval(bgRetryTimer); bgRetryTimer = null; }
          }
        }, 5000);
      }
    });

    return () => {
      unsubscribeAuth();
      if (bgRetryTimer) clearInterval(bgRetryTimer);
    };
  }, []);

  // Removed Firestore onSnapshot effect as we're using Postgres now

  return (
    <AuthContext.Provider value={{ user, userData, loading, refreshUserData }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
