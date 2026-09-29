/**
 * E2E user fixtures.
 *
 * The host and guest use separate browser contexts so their sessions and
 * wallet states are fully isolated throughout the golden-path scenario.
 *
 * All account secrets come from environment variables — never hardcoded here.
 * They are populated by the testnet:provision script and stored as CI secrets.
 */

import type { Browser, BrowserContext, Page } from "@playwright/test";
import { createWalletFixture, type WalletFixture } from "./wallet";

export type UserFixture = {
  context: BrowserContext;
  page: Page;
  wallet: WalletFixture;
  email: string;
};

/**
 * Create isolated browser contexts for the guest and host roles.
 *
 * Each context gets its own cookie jar and localStorage so the two users
 * can be simultaneously "logged in" without interfering with each other.
 */
export async function createUserFixtures(browser: Browser): Promise<{
  guest: UserFixture;
  host: UserFixture;
}> {
  const guestSecret = process.env.E2E_GUEST_SECRET!;
  const hostSecret = process.env.E2E_HOST_SECRET!;
  const guestEmail = process.env.E2E_GUEST_EMAIL ?? "guest@safetrust-e2e.test";
  const hostEmail = process.env.E2E_HOST_EMAIL ?? "host@safetrust-e2e.test";

  // Separate browser contexts → separate sessions
  const guestContext = await browser.newContext();
  const hostContext = await browser.newContext();

  const guestPage = await guestContext.newPage();
  const hostPage = await hostContext.newPage();

  const guestWallet = createWalletFixture(guestSecret);
  const hostWallet = createWalletFixture(hostSecret);

  // Install the test signer BEFORE navigating anywhere so addInitScript
  // runs before the React app initialises.
  await guestWallet.install(guestPage);
  await hostWallet.install(hostPage);

  return {
    guest: {
      context: guestContext,
      page: guestPage,
      wallet: guestWallet,
      email: guestEmail,
    },
    host: {
      context: hostContext,
      page: hostPage,
      wallet: hostWallet,
      email: hostEmail,
    },
  };
}
