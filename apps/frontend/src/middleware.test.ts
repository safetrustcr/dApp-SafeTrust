import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.stubGlobal('fetch', vi.fn());

vi.mock('@/lib/middleware/fetch-user-role', () => ({
  fetchUserRole: vi.fn(),
}));

import { NextResponse } from 'next/server';
import { middleware } from './middleware';
import { fetchUserRole } from '@/lib/middleware/fetch-user-role';

const mockFetchUserRole = vi.mocked(fetchUserRole);

function makeRequest(url: string, cookies: Record<string, string> = {}) {
  const cookieHeader = Object.entries(cookies)
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
  return {
    url,
    nextUrl: {
      pathname: new URL(url).pathname,
      searchParams: new URL(url).searchParams,
    },
    cookies: {
      get: (name: string) => {
        const value = cookies[name];
        return value ? { name, value } : undefined;
      },
    },
    headers: cookieHeader ? { cookie: cookieHeader } : {},
  } as unknown as Parameters<typeof middleware>[0];
}

const FAKE_JWT =
  'header.' + btoa(JSON.stringify({ uid: 'test-uid-123' })).replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '') + '.sig';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('middleware', () => {
  it('unauthenticated user on /dashboard redirects to /login', async () => {
    const request = makeRequest('http://localhost/dashboard');
    const response = await middleware(request);
    expect(response.status).toBe(307);
    const redirectUrl = response.headers.get('Location');
    expect(redirectUrl).toContain('/login');
    const url = new URL(redirectUrl!);
    expect(url.searchParams.get('redirect')).toBe('/dashboard');
    expect(url.searchParams.get('reason')).toBe('unauthenticated');
  });

  it('authenticated user on /login redirects to /dashboard', async () => {
    const request = makeRequest('http://localhost/login', {
      'firebase-token': FAKE_JWT,
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/dashboard');
  });

  it('authenticated on /dashboard with user-role cookie guest redirects to /dashboard/guest', async () => {
    const request = makeRequest('http://localhost/dashboard', {
      'firebase-token': FAKE_JWT,
      'user-role': 'guest',
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/dashboard/guest');
    expect(mockFetchUserRole).not.toHaveBeenCalled();
  });

  it('authenticated on /dashboard with user-role cookie host redirects to /dashboard/escrow-dashboard', async () => {
    const request = makeRequest('http://localhost/dashboard', {
      'firebase-token': FAKE_JWT,
      'user-role': 'host',
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/dashboard/escrow-dashboard');
    expect(mockFetchUserRole).not.toHaveBeenCalled();
  });

  it('authenticated on /dashboard with no role cookie and fetchUserRole returns guest redirects to /dashboard/guest and sets cookie', async () => {
    mockFetchUserRole.mockResolvedValueOnce('guest');
    const request = makeRequest('http://localhost/dashboard', {
      'firebase-token': FAKE_JWT,
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/dashboard/guest');
    expect(mockFetchUserRole).toHaveBeenCalledWith('test-uid-123');
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('user-role=guest');
  });

  it('authenticated on /dashboard with no role cookie and fetchUserRole returns host redirects to /dashboard/escrow-dashboard and sets cookie', async () => {
    mockFetchUserRole.mockResolvedValueOnce('host');
    const request = makeRequest('http://localhost/dashboard', {
      'firebase-token': FAKE_JWT,
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/dashboard/escrow-dashboard');
    expect(mockFetchUserRole).toHaveBeenCalledWith('test-uid-123');
    const setCookie = response.headers.get('set-cookie');
    expect(setCookie).toContain('user-role=host');
  });

  it('authenticated on /dashboard/apartments/new with user-role cookie guest redirects to /dashboard/guest', async () => {
    const request = makeRequest('http://localhost/dashboard/apartments/new', {
      'firebase-token': FAKE_JWT,
      'user-role': 'guest',
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/dashboard/guest');
  });

  it('authenticated on /dashboard/apartments/new with user-role cookie host allows through', async () => {
    const request = makeRequest('http://localhost/dashboard/apartments/new', {
      'firebase-token': FAKE_JWT,
      'user-role': 'host',
    });
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });

  it('authenticated on /dashboard with fetchUserRole throwing fails open to guest', async () => {
    mockFetchUserRole.mockRejectedValueOnce(new Error('Network error'));
    const request = makeRequest('http://localhost/dashboard', {
      'firebase-token': FAKE_JWT,
    });
    const response = await middleware(request);
    expect(response.status).toBe(307);
    expect(new URL(response.headers.get('Location')!).pathname).toBe('/dashboard/guest');
  });

  it('authenticated on /dashboard/escrow-dashboard with user-role cookie host allows through', async () => {
    const request = makeRequest('http://localhost/dashboard/escrow-dashboard', {
      'firebase-token': FAKE_JWT,
      'user-role': 'host',
    });
    const response = await middleware(request);
    expect(response.status).toBe(200);
  });
});