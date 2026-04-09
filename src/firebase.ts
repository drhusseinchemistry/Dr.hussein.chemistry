import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Standard Firebase configuration for AI Studio Build
import firebaseConfigData from './firebase-applet-config.json';

const debug = (msg: string) => {
  console.log(msg);
  if ((window as any).debug) (window as any).debug(msg);
};

debug("Firebase config loaded: " + !!firebaseConfigData.apiKey);

const firebaseConfig = {
  apiKey: firebaseConfigData.apiKey || import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: firebaseConfigData.authDomain || import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: firebaseConfigData.projectId || import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: firebaseConfigData.storageBucket || import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: firebaseConfigData.messagingSenderId || import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: firebaseConfigData.appId || import.meta.env.VITE_FIREBASE_APP_ID,
  firestoreDatabaseId: (firebaseConfigData as any).firestoreDatabaseId || import.meta.env.VITE_FIREBASE_DATABASE_ID
};

if (!firebaseConfig.apiKey || firebaseConfig.apiKey.includes('TODO')) {
  console.error("Firebase API Key is missing or placeholder. The app will not be able to connect to the database.");
}

let app;
try {
  app = initializeApp(firebaseConfig);
} catch (e) {
  console.error("Failed to initialize Firebase app:", e);
}

const dbId = firebaseConfig.firestoreDatabaseId;
export const db = app ? (dbId ? getFirestore(app, dbId) : getFirestore(app)) : null as any;
export const auth = app ? getAuth(app) : null as any;

// Test connection
async function testConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
    console.log("Firebase connection successful.");
  } catch (error) {
    if (error instanceof Error) {
      if (error.message.includes('the client is offline')) {
        console.error("Firebase is offline. Please check your internet connection and Firebase configuration.");
      } else {
        console.error("Firebase connection error:", error.message);
      }
    }
  }
}
testConnection();
