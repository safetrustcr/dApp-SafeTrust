import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

export function initializeFirebaseAdmin(): void {
  if (getApps().length > 0) return;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g, '\n');

  if (!projectId || !clientEmail || !privateKey) {
    const msg = '[Firebase Admin] Missing credentials';
    if (process.env.NODE_ENV === 'production') throw new Error(msg);
    console.warn(`${msg} — skipping cert init (non-production)`);
    return;
  }

  initializeApp({
    credential: cert({
      projectId,
      clientEmail,
      privateKey,
    }),
  });
  console.log('[Firebase Admin] Initialized successfully');
}

export { getAuth };
