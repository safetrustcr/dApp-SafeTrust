import { cert, getApps, initializeApp } from 'firebase-admin/app';

/**
 * Initializes the Firebase Admin SDK exactly once.
 * Falls back to Application Default Credentials when the service-account
 * environment variables are not present.
 */
export function initFirebaseAdmin(): void {
  if (getApps().length > 0) {
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    return;
  }

  initializeApp();
}
