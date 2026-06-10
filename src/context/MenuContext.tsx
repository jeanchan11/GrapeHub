import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';

const MenuContext = createContext<{ menu: any[], setMenu: React.Dispatch<React.SetStateAction<any[]>>, refreshMenu: () => Promise<void> }>({ menu: [], setMenu: () => {}, refreshMenu: async () => {} });

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menu, setMenu] = useState<any[]>([]);

  // Authenticated fetch helper with timeout
  const fetchMenuAuth = async (firebaseUser: FirebaseUser): Promise<boolean> => {
    try {
      const token = await firebaseUser.getIdToken();
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 15000);

      let res: Response;
      try {
        res = await fetch('/api/menu', {
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch (e) {
        // Fallback for dev
        res = await fetch('http://localhost:3000/api/menu', {
          signal: ctrl.signal,
          headers: { Authorization: `Bearer ${token}` },
        });
      } finally {
        clearTimeout(timer);
      }

      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      const data = await res.json();
      if (Array.isArray(data) && data.length > 0) {
        setMenu(data);
        return true;
      } else {
        console.warn('[MenuContext] Menu data empty or not an array');
        return false;
      }
    } catch (err) {
      console.error('[MenuContext] Fetch error:', err);
      return false;
    }
  };

  const refreshMenu = async () => {
    const user = auth.currentUser;
    if (user) await fetchMenuAuth(user);
  };

  useEffect(() => {
    let retryTimer: ReturnType<typeof setTimeout> | null = null;
    let retryCount = 0;
    const MAX_RETRIES = 5;

    const startRetrying = async (user: FirebaseUser) => {
      const success = await fetchMenuAuth(user);
      if (!success && retryCount < MAX_RETRIES) {
        retryCount++;
        console.warn(`[MenuContext] Retry ${retryCount}/${MAX_RETRIES} in 3s...`);
        retryTimer = setTimeout(() => startRetrying(user), 3000);
      }
    };

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (retryTimer) { clearTimeout(retryTimer); retryTimer = null; }
      if (user) {
        retryCount = 0;
        startRetrying(user);
      } else {
        setMenu([]);
      }
    });

    return () => {
      unsubscribe();
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, []);

  return <MenuContext.Provider value={{ menu, setMenu, refreshMenu }}>{children}</MenuContext.Provider>;
};

export const useMenu = () => useContext(MenuContext);
