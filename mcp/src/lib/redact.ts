/**
 * Output hygiene for every read tool.
 *
 * - Unsigned XDRs are only ever returned by the build tools (deploy-escrow,
 *   fund-escrow). Everything else replaces them, so a signable transaction
 *   cannot leak into a chat transcript through a status or diagnostic read.
 * - Wallet addresses in booking context are shortened: enough to recognise a
 *   wallet, not enough to copy it into a payment.
 */

const XDR_KEY = /xdr|unsigned_?transaction/i;
/** Base64 transaction envelopes start with AAAA and are long. */
const XDR_VALUE = /^AAAA[A-Za-z0-9+/]{40,}={0,2}$/;

export const REDACTED_XDR = '[unsigned XDR withheld — only the build tools return it]';

export function looksLikeXdr(value: unknown): boolean {
  return typeof value === 'string' && XDR_VALUE.test(value.trim());
}

/** Deep copy with every XDR-looking key or value replaced. */
export function redactXdr<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactXdr(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      out[key] = XDR_KEY.test(key) && inner ? REDACTED_XDR : redactXdr(inner);
    }
    return out as T;
  }
  return (looksLikeXdr(value) ? REDACTED_XDR : value) as T;
}

/** `GABC…WXYZ` — first 4 and last 4 characters of a Stellar public key. */
export function redactWallet(address: string | null | undefined): string | null {
  if (!address) return null;
  return address.length > 10 ? `${address.slice(0, 4)}…${address.slice(-4)}` : address;
}

/** Short form of a transaction hash for prose (`abcd1234…`). */
export function shortHash(hash: string | null | undefined): string {
  return hash ? `${hash.slice(0, 8)}…` : '(none)';
}
