"use client";

import { useEffect, useState, useCallback, useTransition } from 'react';
import Link from 'next/link';
import {
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Loader2,
  Wallet,
  RefreshCw,
  Coins,
  ShieldCheck,
  Building,
} from 'lucide-react';
import { useActiveWallet } from '@/hooks/use-active-wallet';
import { useMultiWallet } from '@/components/auth/wallet/hooks/multi-wallet.hook';
import { getWalletKit } from '@/components/auth/wallet/constants/wallet-kit.constant';
import { useGlobalAuthenticationStore } from '@/core/store/data';
import { postAuthenticatedApi } from '@/lib/api/client';
import {
  getReadiness,
  buildTrustlineXdr,
  type WalletReadiness,
} from '@/lib/api/escrow';
import { truncateStellarAddress } from '@/lib/utils';

export type WalletReadinessChecklistProps = {
  apartmentId?: string;
  reservationId?: string;
  bookingKind?: 'apartment' | 'hotel-room';
  onReadyChange?: (ready: boolean) => void;
  className?: string;
};

export function WalletReadinessChecklist({
  apartmentId,
  reservationId,
  bookingKind = 'apartment',
  onReadyChange,
  className = '',
}: WalletReadinessChecklistProps) {
  const { address, isReady } = useActiveWallet();
  const { handleConnect } = useMultiWallet();
  const stellarWalletId = useGlobalAuthenticationStore((state) => state.stellarWalletId);

  const [readiness, setReadiness] = useState<WalletReadiness | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionInProgress, setActionInProgress] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchReadiness = useCallback(async () => {
    if (!apartmentId && !reservationId) return;
    if (typeof getReadiness !== 'function') {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getReadiness({
        ...(bookingKind === 'hotel-room' || reservationId
          ? { reservationId: reservationId ?? apartmentId }
          : { apartmentId }),
      });
      setReadiness(data);
      onReadyChange?.(data.ready);
    } catch {
      setError("Can't check your wallet right now. Try again.");
      onReadyChange?.(false);
    } finally {
      setLoading(false);
    }
  }, [apartmentId, reservationId, bookingKind, onReadyChange]);

  useEffect(() => {
    startTransition(() => {
      void fetchReadiness();
    });
  }, [fetchReadiness, address]);

  // Fix 1: Link this wallet
  const handleLinkWallet = async () => {
    if (!address) {
      handleConnect();
      return;
    }
    setActionInProgress('link-wallet');
    setError(null);
    try {
      await postAuthenticatedApi('/api/auth/sync-wallet', {
        walletAddress: address,
        chainType: 'STELLAR',
        isPrimary: true,
      });
      await fetchReadiness();
    } catch {
      setError("Can't check your wallet right now. Try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Fix 2: Fund with Friendbot
  const handleFundFriendbot = async (targetAddress: string) => {
    setActionInProgress('friendbot');
    setError(null);
    try {
      const url = `https://friendbot.stellar.org?addr=${encodeURIComponent(targetAddress)}`;
      const res = await fetch(url).catch(() => null);
      if (!res || !res.ok) {
        window.open(url, '_blank');
      }
      // Wait for ledger confirmation then refetch
      await new Promise((r) => setTimeout(r, 2000));
      await fetchReadiness();
    } catch {
      setError("Can't check your wallet right now. Try again.");
    } finally {
      setActionInProgress(null);
    }
  };

  // Fix 3: Add USDC Trustline
  const handleAddTrustline = async (targetAddress: string) => {
    setActionInProgress('trustline');
    setError(null);
    try {
      const { unsignedXdr } = await buildTrustlineXdr(targetAddress);

      let signedXdr = '';
      const networkPassphrase =
        process.env.NEXT_PUBLIC_STELLAR_NETWORK ?? 'Test SDF Network ; September 2015';

      if (stellarWalletId) {
        const kit = getWalletKit();
        kit.setWallet(stellarWalletId);
        const { signedTxXdr } = await kit.signTransaction(unsignedXdr, {
          address: targetAddress,
          networkPassphrase,
        });
        signedXdr = signedTxXdr;
      } else if (typeof window !== 'undefined' && (window as unknown as { freighterApi?: unknown }).freighterApi) {
        const api = (window as unknown as {
          freighterApi: {
            signTransaction: (xdr: string, opts: { networkPassphrase: string }) => Promise<{ signedTransaction?: string; [key: string]: unknown }>;
          };
        }).freighterApi;
        const result = await api.signTransaction(unsignedXdr, { networkPassphrase });
        signedXdr = (result.signedTransaction ?? (result as unknown as string)) || '';
      } else {
        throw new Error('No compatible wallet found to sign trustline transaction.');
      }

      if (!signedXdr) {
        throw new Error('Signing trustline transaction was cancelled.');
      }

      // Submit directly to Horizon
      const horizonUrl = (
        process.env.NEXT_PUBLIC_STELLAR_HORIZON_URL ?? 'https://horizon-testnet.stellar.org'
      ).replace(/\/+$/, '');

      const res = await fetch(`${horizonUrl}/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        body: `tx=${encodeURIComponent(signedXdr)}`,
      });

      if (!res.ok) {
        const errJson = (await res.json().catch(() => null)) as {
          extras?: { result_codes?: { transaction?: string } };
        } | null;
        throw new Error(
          errJson?.extras?.result_codes?.transaction ??
            'Failed to submit trustline transaction to Horizon.',
        );
      }

      // Refetch readiness automatically after trustline is added
      await fetchReadiness();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('cancelled') || msg.includes('User declined')) {
        setError('Trustline transaction signing was cancelled.');
      } else {
        setError("Can't check your wallet right now. Try again.");
      }
    } finally {
      setActionInProgress(null);
    }
  };

  if (loading && !readiness) {
    return (
      <div className={`rounded-xl border border-orange-200/80 bg-orange-50/40 p-4 text-sm ${className}`}>
        <div className="flex items-center gap-2.5 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin text-orange-500" />
          <span>Checking wallet readiness…</span>
        </div>
      </div>
    );
  }

  if (error && !readiness) {
    return (
      <div className={`rounded-xl border border-destructive/20 bg-destructive/5 p-4 text-sm ${className}`}>
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-4 w-4 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            type="button"
            onClick={() => void fetchReadiness()}
            className="inline-flex items-center gap-1 text-xs font-semibold text-orange-600 hover:text-orange-700"
          >
            <RefreshCw className="h-3 w-3" />
            Try again
          </button>
        </div>
      </div>
    );
  }

  if (!readiness) return null;

  const guestWallet = readiness.guest.wallet;
  const checks = readiness.guest.checks;
  const isRegisteredWalletOk = Boolean(checks.registeredWallet.ok);
  const isConnectedMatchesRegistered =
    Boolean(address && guestWallet && address.toLowerCase() === guestWallet.toLowerCase());
  const isWalletOk = isRegisteredWalletOk && isConnectedMatchesRegistered;

  const isAccountExistsOk = Boolean(checks.accountExists?.ok);
  const isXlmOk = isAccountExistsOk && Boolean(checks.xlmForFees?.ok);
  const isTrustlineOk = Boolean(checks.trustline?.ok);
  const isBalanceOk = Boolean(checks.assetBalance?.ok);
  const isHostOk = Boolean(readiness.counterparties.hostCanReceive.ok);
  const isPlatformOk = Boolean(readiness.counterparties.platformCanReceive.ok);

  const isTestnet = readiness.network === 'testnet';

  return (
    <div
      className={`rounded-xl border border-orange-200/80 bg-card p-4 shadow-sm ${className}`}
      data-testid="wallet-readiness-checklist"
    >
      <div className="flex items-center justify-between border-b pb-3 mb-3">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-4 w-4 text-orange-600" />
          <h3 className="text-sm font-semibold text-foreground">Escrow Wallet Readiness</h3>
        </div>
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
              readiness.ready
                ? 'bg-emerald-100 text-emerald-800'
                : 'bg-orange-100 text-orange-800'
            }`}
          >
            {readiness.ready ? 'Ready to Deploy' : 'Setup Required'}
          </span>
          <button
            type="button"
            onClick={() => void fetchReadiness()}
            disabled={loading || Boolean(actionInProgress)}
            title="Refresh checks"
            className="text-muted-foreground hover:text-foreground transition-colors p-1"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {error && (
        <div className="mb-3 rounded-lg border border-destructive/20 bg-destructive/5 p-2.5 text-xs text-destructive flex items-center justify-between">
          <span>{error}</span>
          <button
            type="button"
            onClick={() => void fetchReadiness()}
            className="font-semibold underline ml-2"
          >
            Try again
          </button>
        </div>
      )}

      <ul className="space-y-3 text-xs">
        {/* Check 1: Wallet linked and connected */}
        <li className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {isWalletOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-foreground">Wallet linked and connected</p>
              {!isReady || !address ? (
                <p className="text-muted-foreground">No Stellar wallet connected in this browser.</p>
              ) : !isRegisteredWalletOk ? (
                <p className="text-muted-foreground">
                  Connected: <span className="font-mono">{truncateStellarAddress(address)}</span> (not linked).
                </p>
              ) : !isConnectedMatchesRegistered ? (
                <p className="text-muted-foreground">
                  Connected wallet does not match registered: <span className="font-mono">{truncateStellarAddress(guestWallet ?? '')}</span>.
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Registered: <span className="font-mono">{truncateStellarAddress(guestWallet ?? '')}</span>.
                </p>
              )}
            </div>
          </div>
          <div>
            {!isReady || !address ? (
              <button
                type="button"
                onClick={handleConnect}
                className="rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-600 transition-colors"
              >
                Connect wallet
              </button>
            ) : !isRegisteredWalletOk ? (
              <button
                type="button"
                onClick={() => void handleLinkWallet()}
                disabled={actionInProgress === 'link-wallet'}
                className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {actionInProgress === 'link-wallet' && <Loader2 className="h-3 w-3 animate-spin" />}
                Link this wallet
              </button>
            ) : !isConnectedMatchesRegistered ? (
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] text-orange-700">
                  Switch to {truncateStellarAddress(guestWallet ?? '')}
                </span>
                <button
                  type="button"
                  onClick={() => void handleLinkWallet()}
                  disabled={actionInProgress === 'link-wallet'}
                  className="rounded-md border border-orange-300 bg-orange-50 px-2 py-0.5 text-[11px] font-semibold text-orange-800 hover:bg-orange-100"
                >
                  Or link this one
                </button>
              </div>
            ) : (
              <span className="text-emerald-700 font-medium">OK</span>
            )}
          </div>
        </li>

        {/* Check 2: XLM for Fees & Account Existence */}
        <li className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {isXlmOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-foreground">Stellar account & XLM for fees</p>
              {!isAccountExistsOk ? (
                <p className="text-muted-foreground">Account does not exist on Stellar yet.</p>
              ) : !isXlmOk ? (
                <p className="text-muted-foreground">
                  Balance: {checks.xlmForFees?.balance ?? '0'} XLM (needs base reserve + fees).
                </p>
              ) : (
                <p className="text-muted-foreground">
                  Balance: {checks.xlmForFees?.balance} XLM.
                </p>
              )}
            </div>
          </div>
          <div>
            {!isXlmOk ? (
              isTestnet ? (
                <button
                  type="button"
                  onClick={() => void handleFundFriendbot(guestWallet ?? address ?? '')}
                  disabled={actionInProgress === 'friendbot' || (!guestWallet && !address)}
                  className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
                >
                  {actionInProgress === 'friendbot' && <Loader2 className="h-3 w-3 animate-spin" />}
                  Fund with Friendbot
                </button>
              ) : (
                <span className="text-muted-foreground text-[11px]">Deposit XLM</span>
              )
            ) : (
              <span className="text-emerald-700 font-medium">OK</span>
            )}
          </div>
        </li>

        {/* Check 3: USDC Trustline */}
        <li className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {isTrustlineOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-foreground">USDC trustline</p>
              <p className="text-muted-foreground">
                {isTrustlineOk
                  ? `Configured for issuer ${truncateStellarAddress(readiness.asset.issuer)}.`
                  : `Required for issuer ${truncateStellarAddress(readiness.asset.issuer)}.`}
              </p>
            </div>
          </div>
          <div>
            {!isTrustlineOk ? (
              <button
                type="button"
                onClick={() => void handleAddTrustline(guestWallet ?? address ?? '')}
                disabled={actionInProgress === 'trustline' || !isAccountExistsOk}
                title={!isAccountExistsOk ? 'Fund with Friendbot first' : undefined}
                className="inline-flex items-center gap-1 rounded-md bg-orange-500 px-2.5 py-1 text-xs font-semibold text-white hover:bg-orange-600 disabled:opacity-50 transition-colors"
              >
                {actionInProgress === 'trustline' && <Loader2 className="h-3 w-3 animate-spin" />}
                Add USDC trustline
              </button>
            ) : (
              <span className="text-emerald-700 font-medium">OK</span>
            )}
          </div>
        </li>

        {/* Check 4: USDC Balance */}
        <li className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {isBalanceOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-orange-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-foreground">USDC balance</p>
              <p className="text-muted-foreground">
                {isBalanceOk
                  ? `Balance: ${checks.assetBalance?.balance} USDC.`
                  : `Have: ${checks.assetBalance?.balance ?? '0'} USDC · Need: ${checks.assetBalance?.required ?? readiness.amount} USDC.`}
              </p>
            </div>
          </div>
          <div>
            {!isBalanceOk ? (
              isTestnet ? (
                <a
                  href="https://faucet.circle.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1 rounded-md border border-orange-300 bg-orange-50 px-2.5 py-1 text-xs font-semibold text-orange-800 hover:bg-orange-100 transition-colors"
                >
                  <Coins className="h-3 w-3" />
                  Get test USDC
                  <ExternalLink className="h-2.5 w-2.5 ml-0.5" />
                </a>
              ) : (
                <span className="text-muted-foreground text-[11px]">Deposit USDC</span>
              )
            ) : (
              <span className="text-emerald-700 font-medium">OK</span>
            )}
          </div>
        </li>

        {/* Check 5: Host Can Receive */}
        <li className="flex items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            {isHostOk ? (
              <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
            ) : (
              <AlertCircle className="h-4 w-4 text-rose-500 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-foreground">Host can receive</p>
              {!isHostOk ? (
                <p className="text-rose-700">The host hasn&apos;t finished wallet setup yet.</p>
              ) : (
                <p className="text-muted-foreground">Host wallet is verified with USDC trustline.</p>
              )}
            </div>
          </div>
          <div>
            {!isHostOk ? (
              <Link
                href="/dashboard/messages"
                className="inline-flex items-center gap-1 rounded-md border border-rose-300 bg-rose-50 px-2.5 py-1 text-xs font-semibold text-rose-800 hover:bg-rose-100 transition-colors"
              >
                Message host
              </Link>
            ) : (
              <span className="text-emerald-700 font-medium">OK</span>
            )}
          </div>
        </li>
      </ul>
    </div>
  );
}
