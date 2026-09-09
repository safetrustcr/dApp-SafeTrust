import { initializeApp, getApps, cert } from 'firebase-admin/app';

/**
 * Initialises the Firebase Admin SDK once — safe to call multiple times.
 *
 * Uses explicit credentials when FIREBASE_CLIENT_EMAIL is present (local dev,
 * CI). Falls back to Application Default Credentials in GCP environments
 * (Cloud Run / GKE) where the service account is attached to the instance.
 *
 * Call this once at server startup in index.ts before any route handler
 * invokes getAuth().verifyIdToken().
 */
export function initFirebaseAdmin(): void {
  if (getApps().length > 0) return; // already initialised — idempotent

  const projectId   = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  // Replace escaped newlines — private keys are stored as single-line strings
  // in .env files but Firebase Admin expects actual newline characters.
  const privateKey  = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    console.log('[firebase-admin] ✅ initialised with service account credentials');
  } else {
    // Application Default Credentials — works automatically in GCP
    initializeApp();
    console.log('[firebase-admin] ✅ initialised with Application Default Credentials');
  }
}