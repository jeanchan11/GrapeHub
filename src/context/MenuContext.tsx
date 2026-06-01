import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';

const MenuContext = createContext<{ menu: any[], setMenu: React.Dispatch<React.SetStateAction<any[]>> }>({ menu: [], setMenu: () => {} });

export const MenuProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [menu, setMenu] = useState<any[]>([]);

  const refreshMenu = async () => {
    try {
      let res;
      try {
        res = await fetch('/api/menu');
      } catch (e) {
        console.warn('Relative fetch failed, trying absolute URL...', e);
        res = await fetch('http://localhost:3000/api/menu');
      }
      
      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }
      
      const data = await res.json();
      console.log('Menu data fetched:', data);
      if (Array.isArray(data)) {
        // Force a completely new state to ensure UI updates
        setMenu([]); 
        setTimeout(() => {
            setMenu(data);
        }, 0);
      } else {
        console.error('Menu data is not an array:', data);
        setMenu([]);
      }
    } catch (err) {
      console.error('Menu fetch error:', err);
    }
  };

  useEffect(() => {
    // Wait for Firebase Auth to be ready before fetching menu
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        refreshMenu();
      } else {
        setMenu([]);
      }
    });
    return () => unsubscribe();
  }, []);

  return <MenuContext.Provider value={{ menu, setMenu, refreshMenu }}>{children}</MenuContext.Provider>;
};

export const useMenu = () => useContext(MenuContext);
