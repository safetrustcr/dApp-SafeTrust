export async function GET() {
  const signingKey = process.env.NEXT_PUBLIC_STELLAR_SIGNING_KEY || "GXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXXX";
  const webAuthDomain = process.env.NEXT_PUBLIC_SEP10_WEB_AUTH_DOMAIN || "api.safetrust.app";
  const homeDomain = process.env.NEXT_PUBLIC_SEP10_HOME_DOMAIN || "safetrust.app";

  const body = `SIGNING_KEY="${signingKey}"
WEB_AUTH_ENDPOINT="https://${webAuthDomain}/api/auth/wallet/verify"
HOME_DOMAIN="${homeDomain}"
`;

  return new Response(body, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "public, max-age=300",
    },
  });
}
