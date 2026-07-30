import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchUserRole } from '@/lib/middleware/fetch-user-role';

const HOST_ONLY_ROUTES = ['/dashboard/apartments'];

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
    let role = request.cookies.get('user-role')?.value;
    let roleFetched = false;

    if (!role) {
      try {
        const segments = token.split('.');
        if (segments.length !== 3 || !segments[1]) {
          throw new Error('Invalid token format');
        }
        const payloadB64 = segments[1]
          .replace(/-/g, '+')
          .replace(/_/g, '/')
          .padEnd(Math.ceil(segments[1].length / 4) * 4, '=');
        const payload = JSON.parse(atob(payloadB64)) as { uid?: string; sub?: string };
        const uid = payload.uid ?? payload.sub ?? '';
        role = await fetchUserRole(uid);
        roleFetched = true;
      } catch {
        role = 'guest';
        roleFetched = true;
      }
    }

    const setRoleCookie = (res: NextResponse) => {
      if (roleFetched) {
        res.cookies.set('user-role', role!, {
          httpOnly: true,
          sameSite: 'lax',
          maxAge: 3600,
          path: '/',
          secure: true,
        });
      }
      return res;
    };

    if (pathname === '/dashboard') {
      const dest = role === 'host'
        ? '/dashboard/escrow-dashboard'
        : '/dashboard/guest';
      return setRoleCookie(NextResponse.redirect(new URL(dest, request.url)));
    }

    if (HOST_ONLY_ROUTES.some((p) => pathname.startsWith(p)) && role !== 'host') {
      return setRoleCookie(NextResponse.redirect(new URL('/dashboard/guest', request.url)));
    }

    return setRoleCookie(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};