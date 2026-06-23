// Normalizes errors from TrustlessWork API responses, fetch() failures, and
// caught exceptions into a flat string array suitable for rendering in the UI.
//
// Consumers pass either:
//   - a parsed JSON payload (e.g. { error, message, messages }) returned from
//     our own API routes (/api/escrow/deploy, /helper/send-transaction), or
//   - a caught `unknown` error from a try/catch block.

type ErrorLikePayload = {
  error?: unknown;
  message?: unknown;
  messages?: unknown;
};

function isErrorLikePayload(value: unknown): value is ErrorLikePayload {
  return typeof value === "object" && value !== null;
}

// Keeps only non-empty strings and returns them trimmed, so blank-looking
// messages never reach the UI.
function toMessages(values: unknown[]): string[] {
  return values
    .filter((item): item is string => typeof item === "string")
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

export function getErrorMessages(source: unknown, fallback: string): string[] {
  const safeFallback = fallback.trim() || "Something went wrong.";

  if (Array.isArray(source)) {
    const messages = toMessages(source);
    return messages.length > 0 ? messages : [safeFallback];
  }

  if (isErrorLikePayload(source)) {
    if (Array.isArray(source.messages)) {
      const messages = toMessages(source.messages);
      if (messages.length > 0) return messages;
    }

    if (typeof source.error === "string" && source.error.trim()) {
      return [source.error.trim()];
    }

    if (typeof source.message === "string" && source.message.trim()) {
      return [source.message.trim()];
    }
  }

  if (source instanceof Error && source.message.trim()) {
    return [source.message.trim()];
  }

  if (typeof source === "string" && source.trim()) {
    return [source.trim()];
  }

  return [safeFallback];
}