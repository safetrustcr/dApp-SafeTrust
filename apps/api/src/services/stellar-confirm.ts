const DEFAULT_HORIZON = 'https://horizon-testnet.stellar.org';

export type TransactionConfirmation = 'success' | 'failed' | 'unknown';

export function getStellarHorizonUrl(): string {
  const configuredValue = process.env.STELLAR_HORIZON_URL?.trim();
  return configuredValue && configuredValue.length > 0 ? configuredValue : DEFAULT_HORIZON;
}

export async function confirmTransaction(txHash: string): Promise<TransactionConfirmation> {
  const hash = (txHash ?? '').trim();
  if (!hash) {
    return 'unknown';
  }

  const url = `${getStellarHorizonUrl().replace(/\/+$/, '')}/transactions/${encodeURIComponent(hash)}`;

  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(5_000),
      headers: {
        'Accept': 'application/json',
      },
    });

    if (!res.ok) {
      return 'unknown';
    }

    const payload = (await res.json()) as { successful?: boolean };
    if (typeof payload.successful === 'boolean') {
      return payload.successful ? 'success' : 'failed';
    }

    return 'unknown';
  } catch {
    return 'unknown';
  }
}

export async function confirmTransactionWithRetry(
  txHash: string,
  options: { maxAttempts?: number; intervalMs?: number } = {},
): Promise<TransactionConfirmation> {
  const maxAttempts = options.maxAttempts ?? 5;
  const intervalMs = options.intervalMs ?? 2000;

  for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
    const result = await confirmTransaction(txHash);
    if (result !== 'unknown') {
      return result;
    }

    if (attempt < maxAttempts) {
      await new Promise((resolve) => setTimeout(resolve, intervalMs));
    }
  }

  return 'unknown';
}
