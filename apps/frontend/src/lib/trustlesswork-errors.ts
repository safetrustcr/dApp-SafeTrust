// Normalizes errors/payloads coming back from the TrustlessWork API (and thrown
// Errors) into a non-empty list of human-readable messages.
//
// Call sites expect `string[]` and use `messages[0]` as the primary error, so a
// fallback is always returned when nothing usable can be extracted.

type ErrorLike =
  | string
  | Error
  | { messages?: unknown; message?: unknown; error?: unknown }
  | null
  | undefined;

export function getErrorMessages(input: ErrorLike, fallback: string): string[] {
  const safeFallback = fallback.trim() || 'Something went wrong.';

  if (!input) {
    return [safeFallback];
  }

  if (typeof input === 'string') {
    return input.trim() ? [input] : [safeFallback];
  }

  if (input instanceof Error) {
    return [input.message || safeFallback];
  }

  const obj = input as Record<string, unknown>;

  if (Array.isArray(obj.messages)) {
    const messages = obj.messages.filter(
      (m): m is string => typeof m === 'string' && m.trim().length > 0,
    );
    if (messages.length > 0) {
      return messages;
    }
  }

  if (typeof obj.message === 'string' && obj.message.trim()) {
    return [obj.message];
  }

  if (typeof obj.error === 'string' && obj.error.trim()) {
    return [obj.error];
  }

  return [fallback];
}
