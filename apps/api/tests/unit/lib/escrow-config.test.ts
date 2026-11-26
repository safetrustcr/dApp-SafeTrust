import { Networks } from '@stellar/stellar-sdk';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { requireEscrowStellarConfig, requireUsdcIssuer } from '../../../src/lib/escrow-config.js';
import { networkPassphraseFromEnv } from '../../../src/lib/stellar-xdr.js';
import { ApiError } from '../../../src/http/api-error.js';

describe('requireEscrowStellarConfig (#550)', () => {
  beforeEach(() => {
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });
  afterEach(() => {
    vi.unstubAllEnvs();
    vi.restoreAllMocks();
  });

  it('returns the platform address and USDC issuer when both are set', () => {
    vi.stubEnv('PLATFORM_STELLAR_ADDRESS', ' GPLATFORM ');
    vi.stubEnv('USDC_TRUSTLINE_ADDRESS', 'GISSUER');
    expect(requireEscrowStellarConfig()).toEqual({ platformAddress: 'GPLATFORM', usdcIssuer: 'GISSUER' });
  });

  it('fails with ESCROW_NOT_CONFIGURED, not an authentication error, and logs what is missing', () => {
    vi.stubEnv('PLATFORM_STELLAR_ADDRESS', '');
    vi.stubEnv('USDC_TRUSTLINE_ADDRESS', 'GISSUER');

    let thrown: unknown;
    try {
      requireEscrowStellarConfig();
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ApiError);
    expect(thrown).toMatchObject({ status: 503, code: 'ESCROW_NOT_CONFIGURED' });
    expect((thrown as ApiError).detail).not.toMatch(/authentication/i);
    expect((thrown as ApiError).detail).not.toMatch(/PLATFORM_STELLAR_ADDRESS/);
    expect(console.error).toHaveBeenCalledWith(expect.stringContaining('PLATFORM_STELLAR_ADDRESS'));
  });

  it('requireUsdcIssuer only needs the issuer', () => {
    vi.stubEnv('PLATFORM_STELLAR_ADDRESS', '');
    vi.stubEnv('USDC_TRUSTLINE_ADDRESS', 'GISSUER');
    expect(requireUsdcIssuer()).toBe('GISSUER');

    vi.stubEnv('USDC_TRUSTLINE_ADDRESS', '');
    expect(() => requireUsdcIssuer()).toThrow(expect.objectContaining({ code: 'ESCROW_NOT_CONFIGURED' }));
  });
});

describe('networkPassphraseFromEnv (#550)', () => {
  it('defaults to testnet', () => {
    expect(networkPassphraseFromEnv({})).toBe(Networks.TESTNET);
  });

  it('accepts a full passphrase', () => {
    expect(networkPassphraseFromEnv({ STELLAR_NETWORK_PASSPHRASE: Networks.PUBLIC })).toBe(Networks.PUBLIC);
  });

  it.each(['TESTNET', 'testnet', 'PUBLIC', 'mainnet'])('rejects the shorthand label %s', (label) => {
    expect(() => networkPassphraseFromEnv({ STELLAR_NETWORK_PASSPHRASE: label })).toThrow(/full network passphrase/);
  });
});
