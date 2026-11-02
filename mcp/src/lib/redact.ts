/**
 * Output hygiene for every tool.
 *
 * - Unsigned XDRs are only ever returned by the build tools (deploy-escrow,
 *   fund-escrow). Everything else replaces them, so a signable transaction
 *   cannot leak into a chat transcript through a status or diagnostic read.
 * - Wallet addresses are shortened: enough to recognise a wallet, not enough
 *   to copy it into a payment. Emails and phone numbers are masked.
 */
import { showFullIds } from '../config.js';

export type RedactOptions = {
  /** Only deploy/fund tools may deliberately return an unsigned XDR. */
  allowUnsignedXdr?: boolean;
};

const STELLAR_ADDRESS = /\bG[A-Z2-7]{55}\b/g;
const EMAIL = /\b([A-Z0-9._%+-])(?:[A-Z0-9._%+-]*)@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi;
/**
 * Free text only masks digit runs written like a phone number (a leading `+` or
 * grouped with separators), so UUID segments, stroop amounts and timestamps pass
 * through. Bare digits are masked by key instead — see PHONE_KEY.
 */
const PHONE = /(?<![\w+.-])(?:\+\d[\d .()-]{5,}\d|\(?\d{2,4}\)?[ .-]\d[\d .-]{3,}\d)(?![\w-])/g;
const PHONE_KEY = /phone|mobile/i;
// Lookarounds, not \b: `+`, `/` and `=` padding are non-word characters.
const BASE64_BLOB = /(?<![A-Za-z0-9+/])[A-Za-z0-9+/]{200,}={0,2}(?![A-Za-z0-9+/=])/g;

const XDR_KEY = /xdr|unsigned_?transaction/i;
/** Base64 transaction envelopes start with AAAA and are long. */
const XDR_VALUE = /^AAAA[A-Za-z0-9+/]{40,}={0,2}$/;

export const REDACTED_XDR = '[unsigned XDR withheld — only the build tools return it]';

function abbreviatedStellarAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

/** PHONE also matches dates and amounts; only digit runs shaped like a phone number are masked. */
function looksLikePhone(value: string): boolean {
  const digits = value.replace(/\D/g, '');
  if (digits.length < 7 || digits.length > 15) return false;
  if (/^\d{4}-\d{2}(-\d{2})?$/.test(value)) return false;
  return !/^\d+\.\d+$/.test(value);
}

function maskedPhone(value: string): string {
  if (!looksLikePhone(value)) return value;
  const digits = value.replace(/\D/g, '');
  return `***${digits.slice(-4)}`;
}

function xdrPlaceholder(value: string): string {
  return `<xdr ${(Buffer.byteLength(value, 'utf8') / 1024).toFixed(1)} KB>`;
}

/** Redacts sensitive values before MCP text is added to model context/logs. */
export function redactText(value: string, options: RedactOptions = {}): string {
  let result = value;

  if (!showFullIds()) {
    result = result.replace(STELLAR_ADDRESS, abbreviatedStellarAddress);
  }

  result = result.replace(EMAIL, (_match, first: string, domain: string) => `${first}***@${domain}`);
  result = result.replace(PHONE, maskedPhone);

  if (!options.allowUnsignedXdr) {
    result = result.replace(BASE64_BLOB, xdrPlaceholder);
  }

  return result;
}

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

/**
 * An upstream (Hasura / apps/api) error reduced to its message: first line only,
 * capped, so a stack trace, SQL statement or echoed header never reaches the client.
 */
export function errorMessageOnly(value: unknown, fallback = 'unknown error'): string {
  if (typeof value !== 'string') return fallback;
  const line = value.split(/\r?\n/)[0].trim();
  if (!line) return fallback;
  return line.length > 200 ? `${line.slice(0, 200)}…` : line;
}

/** Deep copy with every phone-like field (`phone`, `phone_number`, `mobile`) masked. */
export function redactPhoneFields<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item) => redactPhoneFields(item)) as T;
  if (value && typeof value === 'object') {
    const out: Record<string, unknown> = {};
    for (const [key, inner] of Object.entries(value as Record<string, unknown>)) {
      const scalar = typeof inner === 'string' || typeof inner === 'number';
      out[key] = PHONE_KEY.test(key) && scalar
        ? `***${String(inner).replace(/\D/g, '').slice(-4)}`
        : redactPhoneFields(inner);
    }
    return out as T;
  }
  return value;
}

/** `GABC…WXYZ` — first 4 and last 4 characters of a Stellar public key. */
export function redactWallet(address: string | null | undefined): string | null {
  if (!address) return null;
  return address.length > 10 ? abbreviatedStellarAddress(address) : address;
}

/** Short form of a transaction hash for prose (`abcd1234…`). */
export function shortHash(hash: string | null | undefined): string {
  return hash ? `${hash.slice(0, 8)}…` : '(none)';
}
