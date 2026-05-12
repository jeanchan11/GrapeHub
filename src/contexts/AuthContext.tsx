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

    try {
      let response;
      try {
        response = await fetch(`/api/users/profile/${encodeURIComponent(email)}`);
      } catch (e) {
        console.warn('Relative fetch failed, trying absolute URL...', e);
        response = await fetch(`http://localhost:3000/api/users/profile/${encodeURIComponent(email)}`);
      }

      if (response.ok) {
        const data = await response.json();
        
        // Check if name should be updated or if picture is missing and should be populated from Firebase
        const shouldUpdateName = firebaseUser.displayName && data.name !== firebaseUser.displayName;
        const shouldUpdatePicture = firebaseUser.photoURL && !data.picture;

        if (shouldUpdateName || shouldUpdatePicture) {
          const newName = shouldUpdateName ? firebaseUser.displayName : data.name;
          const newPicture = shouldUpdatePicture ? firebaseUser.photoURL : data.picture;

          try {
            await fetch(`/api/users/${data.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: data.role,
                allowedPages: data.allowedPages,
                name: newName,
                picture: newPicture
              })
            });
          } catch (e) {
            console.warn('Relative PUT failed, trying absolute URL...', e);
            await fetch(`http://localhost:3000/api/users/${data.id}`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                role: data.role,
                allowedPages: data.allowedPages,
                name: newName,
                picture: newPicture
              })
            });
          }
          data.name = newName;
          data.picture = newPicture;
        }

        if (data.email === 'jeanchan@grapemidia.com') {
          // No longer hardcoding allowedPages, use database values
        }
        setUserData(data);
        console.log('Fetched userData:', data);
        return data;
      } else if (response.status === 404) {
        // User not found in Postgres, bootstrap them
        const isSuperAdmin = email === 'jeanchan@grapemidia.com';
        const initialData = {
          uid: firebaseUser.uid,
          email: email,
          name: firebaseUser.displayName,
          picture: firebaseUser.photoURL,
          role: isSuperAdmin ? 'superadmin' : 'user',
          allowedPages: isSuperAdmin ? ['admin', 'gestor', 'notifications', 'settings'] : ['gestor', 'notifications', 'settings']
        };

        let createResponse;
        try {
          createResponse = await fetch('/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialData)
          });
        } catch (e) {
          console.warn('Relative POST failed, trying absolute URL...', e);
          createResponse = await fetch('http://localhost:3000/api/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(initialData)
          });
        }

        if (createResponse.ok) {
          // Fetch again after creation to get the ID
          let secondResponse;
          try {
            secondResponse = await fetch(`/api/users/profile/${encodeURIComponent(email)}`);
          } catch (e) {
            console.warn('Relative fetch failed, trying absolute URL...', e);
            secondResponse = await fetch(`http://localhost:3000/api/users/profile/${encodeURIComponent(email)}`);
          }
          if (secondResponse.ok) {
            const data = await secondResponse.json();
            setUserData(data);
            return data;
          }
        }
      }
    } catch (error) {
      console.error('Error fetching user data from API:', error);
    }
    return null;
  };

  const refreshUserData = async () => {
    if (user) {
      await fetchUserDataFromApi(user);
    }
  };

  useEffect(() => {
    const unsubscribeAuth = onAuthStateChanged(auth, async (firebaseUser) => {
      setUser(firebaseUser);
      
      if (!firebaseUser) {
        setUserData(null);
        setLoading(false);
        return;
      }

      await fetchUserDataFromApi(firebaseUser);
      setLoading(false);
    });

    return () => unsubscribeAuth();
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
