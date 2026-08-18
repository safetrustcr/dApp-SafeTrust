import { NextResponse } from 'next/server';

import { ROLE_COOKIE } from '@/lib/middleware/roles';

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
