
// Firebase configuration and initialization
// Last updated: 2026-04-02 21:05 UTC
import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User as FirebaseUser } from 'firebase/auth';
import { getFirestore, doc, getDoc, setDoc, updateDoc, collection, onSnapshot, query, where, getDocFromServer } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

// Firebase configuration with fallback for production environment variables
const firebaseConfig = {
  apiKey: (window as any).FIREBASE_API_KEY || import.meta.env.VITE_FIREBASE_API_KEY || (import.meta.env as any).FIREBASE_API_KEY,
  authDomain: (window as any).FIREBASE_AUTH_DOMAIN || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || (import.meta.env as any).FIREBASE_AUTH_DOMAIN,
  projectId: (window as any).FIREBASE_PROJECT_ID || import.meta.env.VITE_FIREBASE_PROJECT_ID || (import.meta.env as any).FIREBASE_PROJECT_ID,
  appId: (window as any).FIREBASE_APP_ID || import.meta.env.VITE_FIREBASE_APP_ID || (import.meta.env as any).FIREBASE_APP_ID,
  storageBucket: (() => {
    const raw = (window as any).FIREBASE_STORAGE_BUCKET || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || (import.meta.env as any).FIREBASE_STORAGE_BUCKET || '';
    // Firebase web SDK expects just the bucket hostname, not the gs:// URI
    return raw.replace(/^gs:\/\//, '');
  })(),
};

const firestoreDatabaseId = (window as any).FIREBASE_FIRESTORE_DATABASE_ID || import.meta.env.VITE_FIREBASE_FIRESTORE_DATABASE_ID || (import.meta.env as any).FIREBASE_FIRESTORE_DATABASE_ID || '(default)';

// Validate config before initialization to prevent white screen
export const isFirebaseConfigValid = !!firebaseConfig.apiKey && firebaseConfig.apiKey !== "SUA_API_KEY_AQUI" && !!firebaseConfig.projectId;

if (!isFirebaseConfigValid) {
  console.warn("Firebase configuration is incomplete or using placeholders.");
}

// Initialize Firebase with safety check
const app = isFirebaseConfigValid ? initializeApp(firebaseConfig) : initializeApp({ apiKey: "placeholder", projectId: "placeholder", appId: "placeholder" });
export const auth = getAuth(app);
export const db = getFirestore(app, firestoreDatabaseId);
export const storage = getStorage(app);
export const googleProvider = new GoogleAuthProvider();

// Error Handling Spec for Firestore Operations
export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId: string | undefined;
    email: string | null | undefined;
    emailVerified: boolean | undefined;
    isAnonymous: boolean | undefined;
    tenantId: string | null | undefined;
    providerInfo: {
      providerId: string;
      displayName: string | null;
      email: string | null;
      photoUrl: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData.map(provider => ({
        providerId: provider.providerId,
        displayName: provider.displayName,
        email: provider.email,
        photoUrl: provider.photoURL
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

// Test Connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if(error instanceof Error && error.message.includes('the client is offline')) {
      console.error("Please check your Firebase configuration. ");
    }
  }
}
testConnection();

export type { FirebaseUser };
