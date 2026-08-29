import { NextResponse } from 'next/server';

import { ROLE_COOKIE, ROLE_COOKIE_MAX_AGE } from '@/lib/middleware/roles';

/**
 * Invalidates the cached role cookie so the next dashboard navigation re-reads
 * the role from Hasura.
 *
 * The middleware writes `user-role` as httpOnly, which means the browser cannot
 * clear it via `document.cookie` — only a server-sent Set-Cookie can. The
 * "Switch to Host view" flow calls this right after promotion so the new role
 * takes effect immediately instead of waiting out the 1h TTL.
 */
export async function DELETE() {
  const response = NextResponse.json({ cleared: true });
  response.cookies.set(ROLE_COOKIE, '', {
    httpOnly: true,
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}

/**
 * Dev-only debugging aid: reports whether the role cookie is currently set
 * and what it holds, without needing to open DevTools to inspect an httpOnly
 * cookie. Disabled in production.
 */
export async function GET(request: Request) {
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available in production' }, { status: 404 });
  }

  const cookieHeader = request.headers.get('cookie') ?? '';
  const roleMatch = cookieHeader.match(new RegExp(`${ROLE_COOKIE}=([^;]+)`));
  const currentRole = roleMatch?.[1] ?? null;

  return NextResponse.json({
    present: currentRole !== null,
    role: currentRole,
    ttlSeconds: ROLE_COOKIE_MAX_AGE,
    note: 'dev-only — not available in production',
  });
}
