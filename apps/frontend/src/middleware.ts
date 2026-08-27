import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchUserRole } from '@/lib/middleware/fetch-user-role';
import {
  DEFAULT_ROLE,
  ROLE_COOKIE,
  ROLE_COOKIE_MAX_AGE,
  dashboardHomeForRole,
  isUserRole,
  type UserRole,
} from '@/lib/middleware/roles';

/**
 * Routes reserved for listing-side users. Guests hitting one are bounced back
 * to their own dashboard; admins are allowed through.
 */
const HOST_ONLY_ROUTES = [
  '/dashboard/apartments',
  '/dashboard/escrow-dashboard',
  '/dashboard/manager',
  '/dashboard/users',
];

/**
 * Routes reserved for guest users. Hosts hitting one are redirected to their
 * escrow dashboard.
 */
const GUEST_ONLY_ROUTES = [
  '/dashboard/guest',
];

const GUEST_HOME = '/dashboard/guest';

function decodeUid(token: string): string {
  const segments = token.split('.');
  if (segments.length !== 3 || !segments[1]) {
    throw new Error('Invalid token format');
  }
  const payloadB64 = segments[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(segments[1].length / 4) * 4, '=');
  const payload = JSON.parse(atob(payloadB64)) as { uid?: string; sub?: string; user_id?: string };
  return payload.uid ?? payload.user_id ?? payload.sub ?? '';
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  // TODO(SECURITY): JWKS signature verification is not implemented.
  // Currently we only validate token structure (3 segments) and decode the payload.
  // A forged token with a chosen uid bypasses role gating and is cached for an hour.
  // Follow-up: verify Firebase ID tokens against Google's JWKS endpoint
  // (https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com)
  // using the `jose` library before trusting the payload.
  const { pathname } = request.nextUrl;

  const token =
    request.cookies.get('firebase-token')?.value ||
    request.cookies.get('auth-token')?.value;

  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isAuthRoute = pathname === '/login' || pathname === '/register';

  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('reason', 'unauthenticated');
    return NextResponse.redirect(loginUrl);
  }

  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtectedRoute && token) {
    // Cookie cache first: a hit costs nothing, a miss costs one Hasura query
    // per hour. An unrecognised value is treated as a miss rather than trusted.
    const cachedRole = request.cookies.get(ROLE_COOKIE)?.value;
    let role: UserRole;
    let roleFetched = false;

    if (isUserRole(cachedRole)) {
      role = cachedRole;
    } else {
      try {
        role = await fetchUserRole(decodeUid(token));
      } catch (error) {
        console.error('middleware: failed to resolve user role, defaulting to guest', error);
        role = DEFAULT_ROLE;
      }
      roleFetched = true;
    }

    // Only written on a cache miss, so the TTL measures age since the lookup
    // rather than sliding forward on every navigation — that bounds how long a
    // role change can take to propagate.
    const setRoleCookie = (res: NextResponse) => {
      if (roleFetched) {
        res.cookies.set(ROLE_COOKIE, role, {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: ROLE_COOKIE_MAX_AGE,
          path: '/',
          secure: process.env.NODE_ENV === 'production',
        });
      }
      return res;
    };

    if (pathname === '/dashboard') {
      return setRoleCookie(
        NextResponse.redirect(new URL(dashboardHomeForRole(role), request.url)),
      );
    }

    if (HOST_ONLY_ROUTES.some((p) => pathname.startsWith(p)) && role === 'guest') {
      const blockedUrl = new URL(GUEST_HOME, request.url);
      blockedUrl.searchParams.set('blocked', 'true');
      return setRoleCookie(NextResponse.redirect(blockedUrl));
    }

    if (GUEST_ONLY_ROUTES.some((p) => pathname.startsWith(p)) && role === 'host') {
      return setRoleCookie(
        NextResponse.redirect(new URL('/dashboard/escrow-dashboard', request.url)),
      );
    }

    return setRoleCookie(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};
