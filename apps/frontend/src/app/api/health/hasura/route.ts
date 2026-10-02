import { NextResponse } from 'next/server';

const HASURA_HEALTH_FALLBACK = 'http://localhost:8080/healthz';
const HEALTH_REQUEST_TIMEOUT_MS = 1500;

export async function GET() {
  // The health endpoint is a dev-only convenience. Never expose it in
  // production builds.
  if (process.env.NODE_ENV === 'production') {
    return NextResponse.json({ error: 'Not available' }, { status: 404 });
  }

  const hasuraUrl =
    process.env.HASURA_GRAPHQL_URL?.replace('/v1/graphql', '/healthz') ??
    HASURA_HEALTH_FALLBACK;

  try {
    const res = await fetch(hasuraUrl, {
      // Bound the wait so a down/unreachable Hasura doesn't hang the request.
      signal: AbortSignal.timeout(HEALTH_REQUEST_TIMEOUT_MS),
    });

    if (!res.ok) {
      return NextResponse.json({ healthy: false }, { status: 503 });
    }

    return NextResponse.json({ healthy: true });
  } catch {
    return NextResponse.json({ healthy: false }, { status: 503 });
  }
}
