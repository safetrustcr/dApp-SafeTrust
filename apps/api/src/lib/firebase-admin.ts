import { initializeApp, getApps, cert } from 'firebase-admin/app';

/**
 * Initialises the Firebase Admin SDK once — safe to call multiple times.
 * Uses Application Default Credentials when FIREBASE_CLIENT_EMAIL is absent
 * (works in Cloud Run / GKE automatically).
 */
export function initFirebaseAdmin(): void {
  if (getApps().length > 0) return; // already initialised

  const projectId    = process.env.FIREBASE_PROJECT_ID;
  const clientEmail  = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey   = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({ credential: cert({ projectId, clientEmail, privateKey }) });
  } else {
    // Fallback: Application Default Credentials (GCP environments)
    initializeApp();
  }
}
