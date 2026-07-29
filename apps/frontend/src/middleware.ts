import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { fetchUserRole } from '@/lib/middleware/fetch-user-role';

const HOST_ONLY_ROUTES = ['/dashboard/apartments'];

export async function middleware(request: NextRequest): Promise<NextResponse> {
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
        const payloadB64 = token.split('.')[1];
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
      return NextResponse.redirect(new URL('/dashboard/guest', request.url));
    }

    return setRoleCookie(NextResponse.next());
  }

  return NextResponse.next();
}

export const config = {
  matcher: ['/dashboard/:path*', '/login', '/register'],
};