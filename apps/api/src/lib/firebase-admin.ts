import { applicationDefault, cert, getApps, initializeApp } from 'firebase-admin/app';

const getMissingFirebaseConfig = (): string[] => {
  const missing: string[] = [];

  if (!process.env.FIREBASE_PROJECT_ID) {
    missing.push('FIREBASE_PROJECT_ID');
  }

  if (!process.env.FIREBASE_CLIENT_EMAIL) {
    missing.push('FIREBASE_CLIENT_EMAIL');
  }

  const privateKey = process.env.FIREBASE_PRIVATE_KEY ?? '';
  if (!privateKey.includes('BEGIN PRIVATE KEY')) {
    missing.push('FIREBASE_PRIVATE_KEY');
  }

  return missing;
};

/**
 * Initialises the Firebase Admin SDK once — safe to call multiple times.
 *
 * Uses service account credentials in local/dev environments. Falls back to
 * Application Default Credentials only when GOOGLE_APPLICATION_CREDENTIALS and
 * FIREBASE_PROJECT_ID are both set. Otherwise the API exits during startup so
 * misconfiguration fails fast instead of surfacing as a generic user error.
 */
export function initFirebaseAdmin(): void {
  if (getApps().length > 0) return;

  if (process.env.GOOGLE_APPLICATION_CREDENTIALS && process.env.FIREBASE_PROJECT_ID) {
    initializeApp({
      credential: applicationDefault(),
      projectId: process.env.FIREBASE_PROJECT_ID,
    });
    console.log('[firebase-admin] ✅ initialised with Application Default Credentials');
    return;
  }

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (projectId && clientEmail && privateKey?.includes('BEGIN PRIVATE KEY')) {
    initializeApp({
      credential: cert({ projectId, clientEmail, privateKey }),
    });
    console.log('[firebase-admin] ✅ initialised with service account credentials');
    return;
  }

  const missing = getMissingFirebaseConfig();
  throw new Error(
    `Firebase Admin is not configured.\nMissing: ${missing.join(', ')}\nGet them from Firebase Console → Project settings → Service accounts → Generate new private key.\nOr set GOOGLE_APPLICATION_CREDENTIALS to the JSON key path.`,
  );
}