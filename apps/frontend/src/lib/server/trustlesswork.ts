// Minimal server-side client for the TrustlessWork API.
//
// STATUS: stubbed for local/UI development. NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY
// is not set in most local environments yet (see TrustlessWorkProvider's
// console warning on boot), so real requests would 401 anyway. This client
// still makes a real HTTP call when the key IS configured; when it's not,
// it throws a TrustlessWorkRequestError with a clear message instead of
// silently faking a successful deploy.

const TRUSTLESS_WORK_BASE_URL =
  process.env.TRUSTLESS_WORK_API_URL ?? "https://api.trustlesswork.com";

export class TrustlessWorkRequestError extends Error {
  statusCode: number;
  messages?: string[];
  payload?: unknown;

  constructor(message: string, statusCode: number, messages?: string[], payload?: unknown) {
    super(message);
    this.name = "TrustlessWorkRequestError";
    this.statusCode = statusCode;
    this.messages = messages;
    this.payload = payload;
  }
}

type TrustlessWorkRequestOptions = {
  method?: "GET" | "POST" | "PUT" | "DELETE";
  body?: unknown;
};

export async function trustlessWorkRequest<T>(
  path: string,
  options: TrustlessWorkRequestOptions = {},
): Promise<T> {
  //const apiKey = process.env.TRUSTLESS_WORK_API_KEY ?? process.env.NEXT_PUBLIC_TRUSTLESS_WORK_API_KEY;
  const apiKey = process.env.TRUSTLESS_WORK_API_KEY
  if (!apiKey) {
    throw new TrustlessWorkRequestError(
      "TrustlessWork API key is not configured. Set TRUSTLESS_WORK_API_KEY to enable real escrow deployment.",
      401,
      ["TrustlessWork API key is not configured."],
    );
  }

  const response = await fetch(`${TRUSTLESS_WORK_BASE_URL}${path}`, {
    method: options.method ?? "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: options.body ? JSON.stringify(options.body) : undefined,
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new TrustlessWorkRequestError(
      payload && typeof payload === "object" && "message" in payload && typeof payload.message === "string"
        ? payload.message
        : `TrustlessWork request to ${path} failed with status ${response.status}.`,
      response.status,
      undefined,
      payload,
    );
  }

  if (payload === null) {
      throw new TrustlessWorkRequestError(
          `TrustlessWork request to ${path} returned invalid JSON.`,
          500,
          ["Response body is not valid JSON."],
        );
  }

  return payload as T;
}