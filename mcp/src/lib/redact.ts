import { showFullIds } from '../config.js';

export type RedactOptions = {
  /** Only deploy/fund tools may deliberately return an unsigned XDR. */
  allowUnsignedXdr?: boolean;
};

const STELLAR_ADDRESS = /\bG[A-Z2-7]{55}\b/g;
const EMAIL = /\b([A-Z0-9._%+-])(?:[A-Z0-9._%+-]*)@([A-Z0-9.-]+\.[A-Z]{2,})\b/gi;
const PHONE = /(?<![\w])(?:\+?\d[\d .()\-]{5,}\d)(?![\w])/g;
const BASE64_BLOB = /\b[A-Za-z0-9+/]{200,}={0,2}\b/g;

function abbreviatedStellarAddress(address: string): string {
  return `${address.slice(0, 4)}…${address.slice(-4)}`;
}

function maskedPhone(value: string): string {
  const digits = value.replace(/\D/g, '');
  return digits.length >= 4 ? `***${digits.slice(-4)}` : '***';
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
