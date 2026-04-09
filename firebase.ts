import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore, doc, getDocFromServer } from 'firebase/firestore';

// Standard Firebase configuration for AI Studio Build
let firebaseConfig: any = {};

try {
  // @ts-ignore
  const config = await import('./firebase-applet-config.json');
  firebaseConfig = config.default;
} catch (e) {
  console.warn("firebase-applet-config.json not found, using environment variables as fallback.");
  firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    firestoreDatabaseId: import.meta.env.VITE_FIREBASE_DATABASE_ID
  };
}

if (!firebaseConfig.apiKey) {
  console.error("Firebase API Key is missing. The app may not function correctly.");
}

const app = initializeApp(firebaseConfig);
// @ts-ignore
const dbId = firebaseConfig.firestoreDatabaseId;
export const db = dbId ? getFirestore(app, dbId) : getFirestore(app);
export const auth = getAuth(app);

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
