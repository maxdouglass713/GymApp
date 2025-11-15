import { initializeApp } from 'firebase/app';
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from 'firebase/firestore';
import { getAuth, connectAuthEmulator, initializeAuth, getReactNativePersistence } from 'firebase/auth';
import { getStorage } from 'firebase/storage';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyADb2vpn17gA3XU0IaZ-NaH2WhrLJSRfzs",
  authDomain: "gym-genius-ai-bd17c.firebaseapp.com",
  // Removed databaseURL - using Firestore instead of Realtime Database
  projectId: "gym-genius-ai-bd17c",
  storageBucket: "gym-genius-ai-bd17c.firebasestorage.app",
  messagingSenderId: "32834087649",
  appId: "1:32834087649:web:d967eaa7ac176d4df365a0",
  measurementId: "G-MWJVNL28W1"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase services
export const db = getFirestore(app);

// Add a flag to prevent multiple persistence attempts
let persistenceAttempted = false;

// Enhanced persistence check - run immediately after db initialization
const enablePersistenceSafely = async () => {
  // Multiple layers of protection
  if (persistenceAttempted || global._firestorePersistenceEnabled) {
    console.log('🔄 Persistence already attempted or enabled, skipping...');
    return;
  }
  
  // Only enable for web
  if (typeof window === 'undefined') {
    console.log('📱 Not a web environment, skipping persistence...');
    return;
  }
  
  persistenceAttempted = true;
  global._firestorePersistenceEnabled = true;
  
  try {
    const { enableIndexedDbPersistence } = await import('firebase/firestore');
    await enableIndexedDbPersistence(db);
    console.log('✅ Firestore persistence enabled successfully');
  } catch (err: any) {
    if (err.code === 'failed-precondition') {
      console.warn('⚠️ Multiple tabs open, persistence can only be enabled in one tab at a time.');
    } else if (err.code === 'unimplemented') {
      console.warn('⚠️ The current browser does not support all features required for persistence');
    } else if (err.message.includes('already been started') || err.message.includes('has already been started')) {
      console.warn('⚠️ Firestore persistence already enabled');
    } else {
      console.warn('⚠️ Firestore persistence error:', err.message);
    }
  }
};

// Enable persistence safely
enablePersistenceSafely();

// Initialize Auth with AsyncStorage persistence for React Native
let auth;
try {
  auth = initializeAuth(app, {
    persistence: getReactNativePersistence(AsyncStorage)
  });
} catch (error) {
  // If auth is already initialized, get the existing instance
  auth = getAuth(app);
}

export { auth };
export const storage = getStorage(app);

// Connect to emulators in development
if (__DEV__) {
  // Uncomment these lines if you want to use Firebase emulators for development
  // connectFirestoreEmulator(db, 'localhost', 8080);
  // connectAuthEmulator(auth, 'http://localhost:9099');
}

export default app;