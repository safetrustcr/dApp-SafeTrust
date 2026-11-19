/** RFC 7807 Problem Details interface */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  retryable?: boolean;
  requestId?: string;
  /**
   * Hash of the transaction that was broadcast before the failure.
   * Set when a submit fails or times out after the signed XDR was accepted,
   * so the client can run recovery via /api/escrow/recover-from-txhash.
   */
  txHash?: string;
  [key: string]: unknown;
}
