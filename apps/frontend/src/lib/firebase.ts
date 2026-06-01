import { getApp, getApps, initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

// firebase.ts
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "placeholder-key",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "placeholder-project.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "placeholder-project",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "placeholder-project.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "1234567890",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:1234567890:web:1234567890",
};

const missing = Object.entries(firebaseConfig)
  .filter(([key, value]) => !value || value.startsWith("placeholder"))
  .map(([key]) => key);

if (missing.length > 0) {
  console.warn(`[Firebase] Missing actual credentials for: ${missing.join(", ")}. Using build-time placeholders.`);
}

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

