/**
 * RFC 7807-style ApiError — the single error type all escrow handlers throw.
 *
 * Handlers must never surface raw Error messages, stack traces, upstream
 * payloads, tokens, or signed XDRs to the browser. They throw ApiError with
 * a detail string that is safe to show a user, then errorMiddleware serialises
 * it into a Problem Details response body.
 */
export class ApiError extends Error {
  readonly status: number;
  readonly code: string;
  readonly detail: string; // must be safe to show a user
  readonly options: { retryable?: boolean; cause?: unknown };

  constructor(
    status: number,
    code: string,
    detail: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(detail);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.options = options;
  }
}

/**
 * Convenience factory for 400 validation failures.
 * Keeps handler code concise:  throw validationError('MISSING_CONTRACT_ID', 'contractId is required.')
 */
export const validationError = (code: string, detail: string): ApiError =>
  new ApiError(400, code, detail);
