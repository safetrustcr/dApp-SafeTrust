/**
 * Firebase email/password sign-in from the Playwright process.
 *
 * Uses the Identity Toolkit REST API, the same call the Firebase web SDK
 * makes. With FIREBASE_AUTH_EMULATOR_HOST set it talks to the Auth emulator
 * (and apps/api must use the same emulator); otherwise it needs the project's
 * public web API key (NEXT_PUBLIC_FIREBASE_API_KEY).
 *
 * Users and passwords come from `pnpm testnet:provision`
 * (guest@ / host@ / admin@safetrust.local, password E2E_TEST_PASSWORD).
 */

import { e2eConfig } from "./env";

export type SignedInUser = { uid: string; email: string; idToken: string };

export async function signIn(email: string): Promise<SignedInUser> {
  const { firebase } = e2eConfig();
  const base = firebase.emulatorHost
    ? `http://${firebase.emulatorHost}/identitytoolkit.googleapis.com`
    : "https://identitytoolkit.googleapis.com";
  const key = firebase.apiKey ?? (firebase.emulatorHost ? "emulator" : undefined);
  if (!key) {
    throw new Error(
      "[firebase] Set NEXT_PUBLIC_FIREBASE_API_KEY (or FIREBASE_AUTH_EMULATOR_HOST) so the E2E suite can sign in.",
    );
  }

  const res = await fetch(`${base}/v1/accounts:signInWithPassword?key=${encodeURIComponent(key)}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password: firebase.password, returnSecureToken: true }),
    signal: AbortSignal.timeout(15_000),
  });
  const body = (await res.json()) as { localId?: string; idToken?: string; error?: { message?: string } };
  if (!res.ok || !body.idToken || !body.localId) {
    throw new Error(
      `[firebase] sign-in failed for ${email}: ${body.error?.message ?? res.status}. ` +
        "Run `pnpm testnet:provision` and check E2E_TEST_PASSWORD.",
    );
  }
  return { uid: body.localId, email, idToken: body.idToken };
}
