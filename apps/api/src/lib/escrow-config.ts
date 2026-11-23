/**
 * Server configuration that rental/hotel escrows need on Stellar (#550).
 *
 * Missing values used to surface as "Authentication is temporarily
 * unavailable", which sent operators to debug Firebase. They now fail with
 * ESCROW_NOT_CONFIGURED; the response stays generic for the browser and the
 * missing variable names go to the server log.
 */
import { ApiError } from '../http/api-error.js';

type EscrowStellarConfig = {
  /** Funded Stellar account that receives platform fees and resolves disputes. */
  platformAddress: string;
  /** Issuer of the USDC asset escrows are denominated in. */
  usdcIssuer: string;
};

function notConfigured(missing: string[]): ApiError {
  console.error(`[escrow-config] Missing ${missing.join(', ')} in apps/api environment.`);
  return new ApiError(
    503,
    'ESCROW_NOT_CONFIGURED',
    'Escrow payments are not configured on this server. Contact the SafeTrust operator.',
  );
}

export function requireUsdcIssuer(): string {
  const usdcIssuer = process.env.USDC_TRUSTLINE_ADDRESS?.trim();
  if (!usdcIssuer) throw notConfigured(['USDC_TRUSTLINE_ADDRESS']);
  return usdcIssuer;
}

export function requireEscrowStellarConfig(): EscrowStellarConfig {
  const platformAddress = process.env.PLATFORM_STELLAR_ADDRESS?.trim();
  const usdcIssuer = process.env.USDC_TRUSTLINE_ADDRESS?.trim();
  if (!platformAddress || !usdcIssuer) {
    throw notConfigured([
      ...(platformAddress ? [] : ['PLATFORM_STELLAR_ADDRESS']),
      ...(usdcIssuer ? [] : ['USDC_TRUSTLINE_ADDRESS']),
    ]);
  }
  return { platformAddress, usdcIssuer };
}
