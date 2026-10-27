import { getFirebaseTestUserCredentials, REQUEST_TIMEOUT_MS } from '../config.js';

const REFRESH_BEFORE_EXPIRY_MS = 5 * 60 * 1000;
const IDENTITY_TOOLKIT_URL = 'https://identitytoolkit.googleapis.com/v1';
const SECURE_TOKEN_URL = 'https://securetoken.googleapis.com/v1';

type FirebaseSession = {
  idToken: string;
  refreshToken: string;
  expiresAt: number;
};

type FirebaseAuthResponse = {
  idToken?: string;
  refreshToken?: string;
  expiresIn?: string;
};

let session: FirebaseSession | undefined;
let pendingSession: Promise<FirebaseSession> | undefined;

async function firebaseRequest<T>(
  url: string,
  body: Record<string, string | boolean>,
): Promise<T> {
  let response: Response;
  try {
    response = await fetch(url, {
      method: 'POST',
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    throw new Error('Unable to reach Firebase Authentication.');
  }

  if (!response.ok) {
    throw new Error(`Firebase Authentication rejected the local test user (HTTP ${response.status}).`);
  }

  try {
    return (await response.json()) as T;
  } catch {
    throw new Error('Firebase Authentication returned an invalid response.');
  }
}

function parseSession(response: FirebaseAuthResponse): FirebaseSession {
  if (!response.idToken || !response.refreshToken || !response.expiresIn) {
    throw new Error('Firebase Authentication response is missing session fields.');
  }
  const expiresInSeconds = Number(response.expiresIn);
  if (!Number.isFinite(expiresInSeconds) || expiresInSeconds <= 0) {
    throw new Error('Firebase Authentication returned an invalid token lifetime.');
  }
  return {
    idToken: response.idToken,
    refreshToken: response.refreshToken,
    expiresAt: Date.now() + expiresInSeconds * 1000,
  };
}

async function signIn(): Promise<FirebaseSession> {
  const { apiKey, email, password } = getFirebaseTestUserCredentials();
  const response = await firebaseRequest<FirebaseAuthResponse>(
    `${IDENTITY_TOOLKIT_URL}/accounts:signInWithPassword?key=${encodeURIComponent(apiKey)}`,
    { email, password, returnSecureToken: true },
  );
  return parseSession(response);
}

async function refresh(refreshToken: string): Promise<FirebaseSession> {
  const { apiKey } = getFirebaseTestUserCredentials();
  const response = await firebaseRequest<{
    id_token?: string;
    refresh_token?: string;
    expires_in?: string;
  }>(`${SECURE_TOKEN_URL}/token?key=${encodeURIComponent(apiKey)}`, {
    grant_type: 'refresh_token',
    refresh_token: refreshToken,
  });
  return parseSession({
    idToken: response.id_token,
    refreshToken: response.refresh_token,
    expiresIn: response.expires_in,
  });
}

/** Returns a cached test-user ID token, refreshing five minutes before expiry. */
export async function getFirebaseIdToken(): Promise<string> {
  if (session && session.expiresAt - Date.now() > REFRESH_BEFORE_EXPIRY_MS) {
    return session.idToken;
  }
  if (!pendingSession) {
    const current = session;
    pendingSession = (current ? refresh(current.refreshToken).catch(() => signIn()) : signIn())
      .then((next) => {
        session = next;
        return next;
      })
      .finally(() => {
        pendingSession = undefined;
      });
  }
  return (await pendingSession).idToken;
}

export function clearFirebaseSession(): void {
  session = undefined;
  pendingSession = undefined;
}
