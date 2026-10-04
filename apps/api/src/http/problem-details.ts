/** RFC 7807 Problem Details interface */
export interface ProblemDetails {
  type: string;
  title: string;
  status: number;
  detail: string;
  instance?: string;
  retryable?: boolean;
  requestId?: string;
  [key: string]: unknown;
}
