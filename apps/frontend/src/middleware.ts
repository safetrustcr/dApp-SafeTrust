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
 * Routes reserved for hosts and admins.
 * Guests hitting one are bounced back to /dashboard/guest?blocked=true.
 */
const HOST_ONLY_ROUTES = [
  '/dashboard/apartments',
  '/dashboard/escrow-dashboard',
  '/dashboard/manager',
  '/dashboard/users',
];

/**
 * Routes reserved for guests.
 * Hosts hitting one are redirected to /dashboard/escrow-dashboard.
 */
const GUEST_ONLY_ROUTES = [
  '/dashboard/guest',
];

const GUEST_HOME = '/dashboard/guest';

/**
 * Decode Firebase UID from JWT without verifying signature.
 *
 * TODO(SECURITY): JWKS signature verification is not implemented.
 * A forged token with a chosen uid bypasses role gating and is cached for an
 * hour. Follow-up: verify Firebase ID tokens against Google's JWKS endpoint
 * (https://www.googleapis.com/service_accounts/v1/jwk/securetoken@system.gserviceaccount.com)
 * using the `jose` library before trusting the payload.
 */
function decodeUid(token: string): string {
  const segments = token.split('.');
  if (segments.length !== 3 || !segments[1]) {
    throw new Error('Invalid token format');
  }
  const payloadB64 = segments[1]
    .replace(/-/g, '+')
    .replace(/_/g, '/')
    .padEnd(Math.ceil(segments[1].length / 4) * 4, '=');
  const payload = JSON.parse(atob(payloadB64)) as {
    uid?: string;
    sub?: string;
    user_id?: string;
  };
  return payload.uid ?? payload.user_id ?? payload.sub ?? '';
}

export async function middleware(request: NextRequest): Promise<NextResponse> {
  const { pathname } = request.nextUrl;

  const token =
    request.cookies.get('firebase-token')?.value ||
    request.cookies.get('auth-token')?.value;

  const isProtectedRoute = pathname.startsWith('/dashboard');
  const isAuthRoute      = pathname === '/login' || pathname === '/register';

  // ── Unauthenticated user hitting a protected route ─────────────────────────
  if (isProtectedRoute && !token) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('redirect', pathname);
    loginUrl.searchParams.set('reason', 'unauthenticated');
    return NextResponse.redirect(loginUrl);
  }

  // ── Already authenticated user hitting login/register ──────────────────────
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  // ── Authenticated user on a dashboard route ────────────────────────────────
  if (isProtectedRoute && token) {
    // Cookie cache first: a hit costs nothing, a miss costs one Hasura query.
    // Unrecognised values are treated as a miss, not trusted.
    const cachedRole = request.cookies.get(ROLE_COOKIE)?.value;
    let role: UserRole;
    let roleFetched = false;

    if (isUserRole(cachedRole)) {
      role = cachedRole;
    } else {
      try {
        const uid = decodeUid(token);
        role = await fetchUserRole(uid);
      } catch (error) {
        console.error(
          'middleware: failed to resolve user role, defaulting to guest',
          error,
        );
        role = DEFAULT_ROLE;
      }
      roleFetched = true;
    }

    // Only write cookie on a cache miss — TTL measures age since the lookup,
    // not sliding forward on every navigation.
    const setRoleCookie = (res: NextResponse): NextResponse => {
      if (roleFetched) {
        res.cookies.set(ROLE_COOKIE, role, {
          httpOnly: true,
          sameSite: 'lax',
          maxAge:   ROLE_COOKIE_MAX_AGE,
          path:     '/',
          secure:   process.env.NODE_ENV === 'production',
        });
      }
      return res;
    };

    // /dashboard → redirect to role-appropriate home
    if (pathname === '/dashboard') {
      return setRoleCookie(
        NextResponse.redirect(
          new URL(dashboardHomeForRole(role), request.url),
        ),
      );
    }

    // Guest hitting host-only route → bounce to guest home with blocked flag
    if (HOST_ONLY_ROUTES.some((p) => pathname.startsWith(p)) && role === 'guest') {
      const blockedUrl = new URL(GUEST_HOME, request.url);
      blockedUrl.searchParams.set('blocked', 'true');
      return setRoleCookie(NextResponse.redirect(blockedUrl));
    }

    // Host hitting guest-only route → redirect to escrow dashboard
    if (GUEST_ONLY_ROUTES.some((p) => pathname.startsWith(p)) && role === 'host') {
      return setRoleCookie(
        NextResponse.redirect(
          new URL('/dashboard/escrow-dashboard', request.url),
        ),
      );
    }

    return setRoleCookie(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};