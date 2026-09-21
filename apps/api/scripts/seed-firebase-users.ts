import { config } from 'dotenv';
import { getAuth } from 'firebase-admin/auth';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { initFirebaseAdmin } from '../src/lib/firebase-admin.js';

const scriptDir = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(scriptDir, '../..');

// Backend startup is normally run from infra/backend. Load its local config
// first, while allowing shell variables to take precedence.
for (const envPath of [
  join(repositoryRoot, 'infra/backend/.env'),
  join(repositoryRoot, 'apps/api/.env'),
  join(repositoryRoot, '.env'),
]) {
  config({ path: envPath, override: false, quiet: true });
}

type DemoUser = {
  uid: string;
  email: string;
  displayName: string;
  role: 'guest' | 'host' | 'admin';
};

const demoUsers: DemoUser[] = [
  {
    uid: 'demo-tenant-uid-001',
    email: 'john_s@gmail.com',
    displayName: 'John Smith',
    role: 'guest',
  },
  {
    uid: 'demo-owner-uid-002',
    email: 'albertoCasas100@gmail.com',
    displayName: 'Alberto Casas',
    role: 'host',
  },
  {
    uid: 'demo-admin-uid-003',
    email: 'admin@safetrust.local',
    displayName: 'Ada Admin',
    role: 'admin',
  },
];

function hasServiceAccountConfig(): boolean {
  return Boolean(
    process.env.FIREBASE_PROJECT_ID &&
      process.env.FIREBASE_CLIENT_EMAIL &&
      process.env.FIREBASE_PRIVATE_KEY,
  );
}

async function provisionUser(user: DemoUser, password: string): Promise<'created' | 'updated'> {
  const auth = getAuth();

  try {
    const existing = await auth.getUser(user.uid);
    await auth.updateUser(user.uid, {
      displayName: user.displayName,
      email: user.email,
      emailVerified: true,
    });
    await auth.setCustomUserClaims(user.uid, {
      ...existing.customClaims,
      safetrustRole: user.role,
    });
    return 'updated';
  } catch (error: unknown) {
    if (!(error && typeof error === 'object' && 'code' in error && error.code === 'auth/user-not-found')) {
      throw error;
    }
  }

  try {
    await auth.createUser({
      uid: user.uid,
      email: user.email,
      password,
      displayName: user.displayName,
      emailVerified: true,
    });
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'code' in error && error.code === 'auth/email-already-exists') {
      const existing = await auth.getUserByEmail(user.email);
      throw new Error(
        `Cannot provision ${user.email}: it already belongs to Firebase UID '${existing.uid}', not '${user.uid}'.`,
      );
    }
    throw error;
  }

  await auth.setCustomUserClaims(user.uid, { safetrustRole: user.role });
  return 'created';
}

async function main(): Promise<void> {
  if (process.env.FIREBASE_SEED_USERS === 'false') {
    console.log('[firebase-seed] Skipped (FIREBASE_SEED_USERS=false).');
    return;
  }

  if (!hasServiceAccountConfig()) {
    console.log('[firebase-seed] Skipped: Firebase Admin credentials are not configured.');
    return;
  }

  const password = process.env.FIREBASE_SEED_PASSWORD;
  if (!password || password.length < 6) {
    throw new Error(
      'FIREBASE_SEED_PASSWORD must be set to a development-only password of at least 6 characters.',
    );
  }

  initFirebaseAdmin();

  for (const user of demoUsers) {
    const action = await provisionUser(user, password);
    console.log(`[firebase-seed] ${action}: ${user.email} (${user.role})`);
  }
}

void main().catch((error: unknown) => {
  console.error('[firebase-seed] Failed to provision demo users:', error);
  process.exitCode = 1;
});
