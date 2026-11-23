/**
 * Stellar transaction helpers used to bind a signed XDR to the exact
 * transaction apps/api built.
 *
 * Key property: a transaction's hash is computed over the network passphrase
 * and the transaction body — NOT the signatures. The unsigned XDR returned by
 * Trustless Work and the XDR the wallet signs therefore share the same hash.
 */
import {
  FeeBumpTransaction,
  Keypair,
  Networks,
  Transaction,
  TransactionBuilder,
} from '@stellar/stellar-sdk';

/**
 * The one network setting for apps/api (#550): STELLAR_NETWORK_PASSPHRASE,
 * the full passphrase (e.g. "Test SDF Network ; September 2015"). Defaults to
 * testnet. Shorthand labels such as "TESTNET" are rejected: Stellar hashes the
 * passphrase into every transaction, so a label would build XDR that no
 * network accepts.
 */
export function networkPassphraseFromEnv(env: NodeJS.ProcessEnv = process.env): string {
  const value = env.STELLAR_NETWORK_PASSPHRASE?.trim();
  if (!value) return Networks.TESTNET;
  if (/^(testnet|public|mainnet|futurenet|standalone)$/i.test(value)) {
    throw new Error(
      `STELLAR_NETWORK_PASSPHRASE must be the full network passphrase (e.g. "${Networks.TESTNET}"), not "${value}".`,
    );
  }
  return value;
}

export const NETWORK_PASSPHRASE = networkPassphraseFromEnv();

/** Default lifetime for a built transaction that carries no time bounds. */
export const DEFAULT_TTL_MS = 10 * 60_000;

export class InvalidXdrError extends Error {
  constructor(message = 'Not a valid Stellar transaction envelope for this network.') {
    super(message);
    this.name = 'InvalidXdrError';
  }
}

/**
 * Parse an envelope. Fee-bump envelopes resolve to their inner transaction,
 * because the inner transaction is what apps/api built and the user signed.
 */
export function parseTransaction(xdr: string, passphrase = NETWORK_PASSPHRASE): Transaction {
  if (typeof xdr !== 'string' || xdr.trim() === '') throw new InvalidXdrError();
  let tx: Transaction | FeeBumpTransaction;
  try {
    tx = TransactionBuilder.fromXDR(xdr.trim(), passphrase);
  } catch {
    throw new InvalidXdrError();
  }
  return tx instanceof FeeBumpTransaction ? tx.innerTransaction : tx;
}

/** Hex transaction hash, identical for the unsigned and signed envelope. */
export function transactionHash(xdr: string, passphrase = NETWORK_PASSPHRASE): string {
  return Buffer.from(parseTransaction(xdr, passphrase).hash()).toString('hex');
}

/**
 * Best-effort hash extraction for client-side recovery. Returns null instead of
 * throwing, so a malformed or missing XDR never blocks the recovery path.
 */
export function tryTransactionHash(
  xdr: string | null | undefined,
  passphrase = NETWORK_PASSPHRASE,
): string | null {
  if (!xdr) return null;
  try {
    return transactionHash(xdr, passphrase);
  } catch {
    return null;
  }
}

/**
 * Expiry for a built transaction: the XDR's maxTime when set, otherwise
 * now + DEFAULT_TTL_MS.
 */
export function transactionExpiry(
  xdr: string,
  now: number = Date.now(),
  passphrase = NETWORK_PASSPHRASE,
): Date {
  const maxTime = Number(parseTransaction(xdr, passphrase).timeBounds?.maxTime ?? 0);
  if (Number.isFinite(maxTime) && maxTime > 0) return new Date(maxTime * 1000);
  return new Date(now + DEFAULT_TTL_MS);
}

type SignatureLike = { toXDR(format?: 'raw'): Uint8Array };

/**
 * Read a DecoratedSignature through its XDR encoding, which is stable across
 * stellar-sdk versions (accessor methods in older releases, wrapper objects in v17+):
 *   hint:      4 fixed bytes
 *   signature: uint32 length + bytes
 */
function signatureParts(sig: SignatureLike): { hint: Buffer; signature: Buffer } {
  const raw = Buffer.from(sig.toXDR('raw'));
  const length = raw.readUInt32BE(4);
  return { hint: raw.subarray(0, 4), signature: raw.subarray(8, 8 + length) };
}

/** True when the envelope carries a valid signature from `publicKey`. */
export function isSignedBy(
  xdr: string,
  publicKey: string,
  passphrase = NETWORK_PASSPHRASE,
): boolean {
  let keypair: Keypair;
  try {
    keypair = Keypair.fromPublicKey(publicKey);
  } catch {
    return false;
  }
  const tx = parseTransaction(xdr, passphrase);
  const hash = Buffer.from(tx.hash());
  const expectedHint = Buffer.from(keypair.signatureHint());
  return (tx.signatures as unknown as SignatureLike[]).some((sig) => {
    const { hint, signature } = signatureParts(sig);
    return hint.equals(expectedHint) && keypair.verify(hash, signature);
  });
}