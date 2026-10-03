/**
 * RFC 7807 Problem Details representation
 */
export type ProblemDetails = {
  type: string;
  title: string;
  status: number;
  detail: string;
  retryable?: boolean;
  requestId?: string;
  [key: string]: unknown;
};
