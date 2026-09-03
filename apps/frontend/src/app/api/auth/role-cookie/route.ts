import { NextResponse }      from 'next/server';
import { ROLE_COOKIE }       from '@/lib/middleware/roles';

/**
 * DELETE /api/auth/role-cookie
 *
 * Clears the cached role cookie so the next dashboard navigation triggers a
 * fresh Hasura role lookup in the middleware.
 *
 * WHY THIS ROUTE EXISTS:
 * The middleware writes `user-role` as httpOnly — the browser cannot read or
 * write it via document.cookie. Only a server-sent Set-Cookie header with
 * Max-Age=0 can clear it. This route handler runs server-side and issues
 * exactly that header.
 *
 * CALLERS:
 * - GuestDashboard.handleSwitchToHost  — after promote-to-host succeeds
 * - LogoutButton.handleLogout          — on signOut
 *
 * No auth required — clearing a cookie has no privilege escalation risk.
 * The middleware will re-derive the role from Hasura on the next navigation.
 */
export async function DELETE(): Promise<NextResponse> {
  const res = NextResponse.json({ cleared: true });

  res.cookies.set(ROLE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge:   0,           // instructs browser to delete immediately
    path:     '/',
    secure:   process.env.NODE_ENV === 'production',
  });

  return res;
}

/**
 * GET /api/auth/role-cookie
 *
 * Returns whether the role cookie is currently set.
 * Useful for debugging middleware cache state without opening DevTools.
 * Only available in development.
 */
export async function GET(request: Request): Promise<NextResponse> {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const cookie = request.headers.get('cookie') ?? '';
  const hasRole = cookie.includes(`${ROLE_COOKIE}=`);
  const roleMatch = cookie.match(new RegExp(`${ROLE_COOKIE}=([^;]+)`));
  const currentRole = roleMatch?.[1] ?? null;

  return NextResponse.json({
    present:     hasRole,
    role:        currentRole,
    ttlSeconds:  60 * 60,
    note:        'dev-only — not available in production',
  });
}
