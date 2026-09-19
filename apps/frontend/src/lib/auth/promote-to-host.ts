/**
 * Promotes the signed-in user to the 'host' role and invalidates the cached
 * role cookie so the change takes effect on the very next navigation.
 *
 * Two calls are required: the Express API owns the role assignment, while the
 * `user-role` cookie is httpOnly and can only be cleared by a Set-Cookie from
 * the Next.js server.
 */
export async function promoteToHost(token: string): Promise<void> {
  const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL;
  if (!backendUrl) {
    throw new Error('Server configuration error — please contact support');
  }

  const response = await fetch(`${backendUrl}/api/auth/promote-to-host`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
    signal: AbortSignal.timeout(8000),
  });

  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as { error?: string } | null;
    throw new Error(body?.error ?? 'Failed to switch to host view');
  }

  // Best-effort: if the cookie survives, the user keeps the guest view until
  // the 1h TTL lapses, which is recoverable — the promotion itself is done.
  await fetch('/api/auth/role-cookie', { method: 'DELETE' }).catch(() => undefined);
}
