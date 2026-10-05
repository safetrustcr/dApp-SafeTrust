import { ProblemDetails } from './problem-details.js';

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
  readonly detail: string;
  readonly retryable?: boolean;
  readonly requestId?: string;
  readonly problemDetails: ProblemDetails;

  constructor(
    status: number,
    code: string,
    detail: string,
    options: {
      retryable?: boolean;
      requestId?: string;
      cause?: unknown;
    } = {},
  ) {
    super(detail, { cause: options.cause });
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.detail = detail;
    this.retryable = options.retryable;
    this.requestId = options.requestId;
    this.problemDetails = {
      type: `https://api.safetrust.dev/problems/${code.toLowerCase().replace(/_/g, '-')}`,
      title: this.getTitle(),
      status,
      detail,
      ...(this.retryable && { retryable: true }),
      ...(this.requestId && { requestId: this.requestId }),
    };
  }

  private getTitle(): string {
    const titles: Record<string, string> = {
      UPSTREAM_FAILURE: 'Upstream service failure',
      TRUSTLESS_WORK_UNAVAILABLE: 'Trustless Work unavailable',
      AUTHENTICATION_FAILED: 'Authentication failed',
      VALIDATION_ERROR: 'Input validation failed',
      INTERNAL_SERVER_ERROR: 'Internal server error',
    };
    return titles[this.code] || 'API error';
  }
}

/**
 * Convenience factory for 400 validation failures.
 * Keeps handler code concise:  throw validationError('MISSING_CONTRACT_ID', 'contractId is required.')
 */
export const validationError = (code: string, detail: string) =>
  new ApiError(400, code, detail, { retryable: false });
