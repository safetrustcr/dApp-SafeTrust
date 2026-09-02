import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('firebase-admin/app', () => ({
  initializeApp: vi.fn(),
  getApps: vi.fn(),
  cert: vi.fn((c) => c),
}));

import { initializeApp, getApps, cert } from 'firebase-admin/app';
import { initFirebaseAdmin } from '../firebase-admin.js';

const mockInitializeApp = vi.mocked(initializeApp);
const mockGetApps = vi.mocked(getApps);
const mockCert = vi.mocked(cert);

describe('initFirebaseAdmin', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.FIREBASE_PROJECT_ID;
    delete process.env.FIREBASE_CLIENT_EMAIL;
    delete process.env.FIREBASE_PRIVATE_KEY;
  });

  it('does nothing if already initialised (getApps().length > 0)', () => {
    mockGetApps.mockReturnValue([{} as any]);

    initFirebaseAdmin();

    expect(mockInitializeApp).not.toHaveBeenCalled();
  });

  it('initialises with cert credentials when env vars are provided', () => {
    mockGetApps.mockReturnValue([]);
    process.env.FIREBASE_PROJECT_ID = 'test-proj';
    process.env.FIREBASE_CLIENT_EMAIL = 'test@proj.iam.gserviceaccount.com';
    process.env.FIREBASE_PRIVATE_KEY = '-----BEGIN PRIVATE KEY-----\\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\\n-----END PRIVATE KEY-----\\n';

    initFirebaseAdmin();

    expect(mockCert).toHaveBeenCalledWith({
      projectId: 'test-proj',
      clientEmail: 'test@proj.iam.gserviceaccount.com',
      privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n',
    });
    expect(mockInitializeApp).toHaveBeenCalledWith({
      credential: {
        projectId: 'test-proj',
        clientEmail: 'test@proj.iam.gserviceaccount.com',
        privateKey: '-----BEGIN PRIVATE KEY-----\nMIIEvgIBADANBgkqhkiG9w0BAQEFAASCBKgwggSkAgEAAoIBAQD...\n-----END PRIVATE KEY-----\n',
      },
    });
  });

  it('falls back to Application Default Credentials when credentials are absent', () => {
    mockGetApps.mockReturnValue([]);

    initFirebaseAdmin();

    expect(mockInitializeApp).toHaveBeenCalledWith();
  });
});
