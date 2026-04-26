type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === 'object' && value !== null;
}

function collectMessages(value: unknown, messages: string[]) {
  if (!value) {
    return;
  }

  if (typeof value === 'string') {
    messages.push(value);
    return;
  }

  if (Array.isArray(value)) {
    value.forEach((entry) => collectMessages(entry, messages));
    return;
  }

  if (!isRecord(value)) {
    return;
  }

  const directKeys = ['message', 'error', 'detail', 'description'] as const;
  directKeys.forEach((key) => {
    const entry = value[key];
    if (typeof entry === 'string') {
      messages.push(entry);
    }
  });

  if ('errors' in value) {
    collectMessages(value.errors, messages);
  }

  if ('details' in value) {
    collectMessages(value.details, messages);
  }
}

export function extractTrustlessWorkMessages(value: unknown): string[] {
  const messages: string[] = [];
  collectMessages(value, messages);

  return [...new Set(messages.map((message) => message.trim()).filter(Boolean))];
}

export function getErrorMessages(value: unknown, fallback: string): string[] {
  const messages = extractTrustlessWorkMessages(value);
  return messages.length > 0 ? messages : [fallback];
}