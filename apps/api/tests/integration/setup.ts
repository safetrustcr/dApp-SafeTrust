import { beforeAll } from 'vitest';

export const INTEGRATION_ENABLED =
  Boolean(process.env.TRUSTLESS_WORK_API_KEY) &&
  Boolean(process.env.INTEGRATION_SENDER_ADDRESS) &&
  Boolean(process.env.INTEGRATION_RECEIVER_ADDRESS);

beforeAll(() => {
  if (!INTEGRATION_ENABLED) {
    console.warn(
      '[integration] Skipping — set TRUSTLESS_WORK_API_KEY, ' +
      'INTEGRATION_SENDER_ADDRESS, INTEGRATION_RECEIVER_ADDRESS to run'
    );
  }
});
