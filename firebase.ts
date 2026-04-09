import { initializeApp, getApp, getApps } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Standard Firebase configuration for AI Studio Build
import firebaseConfigData from './firebase-applet-config.json';

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigData.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigData.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigData.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigData.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigData.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: (firebaseConfigData as any).firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID
};

const isConfigValid = firebaseConfig.apiKey && !firebaseConfig.apiKey.includes('TODO');

let app;
if (isConfigValid) {
  try {
    app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();
  } catch (e) {
    console.error("Firebase initialization failed:", e);
  }
} else {
  console.warn("Firebase configuration is missing or invalid. App will run in local mode.");
}

export const db = app ? (firebaseConfig.firestoreDatabaseId ? getFirestore(app, firebaseConfig.firestoreDatabaseId) : getFirestore(app)) : null as any;
export const auth = app ? getAuth(app) : null as any;

// Test connection
if (db) {
  getDocFromServer(doc(db, 'test', 'connection'))
    .then(() => console.log("Firebase connection successful."))
    .catch((error) => {
      if (error.message?.includes('the client is offline')) {
        console.error("Firebase is offline.");
      } else {
        console.error("Firebase connection error:", error.message);
      }
    });
}
