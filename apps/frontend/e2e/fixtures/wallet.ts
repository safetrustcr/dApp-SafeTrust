/**
 * E2E wallet fixture — signs Stellar transactions inside the Playwright process.
 *
 * Freighter cannot be automated reliably in a headless browser because it is a
 * browser extension. Instead, we expose a signing function directly on the
 * window object from the Node.js Playwright process, where we have access to
 * the test keypair's secret key.
 *
 * The web app reads `window.__e2eAddress` to pre-fill the wallet address and
 * calls `window.__e2eSign(xdr)` to get a signed XDR back, all without ever
 * shipping the secret key into the browser bundle.
 *
 * SECURITY NOTE: This provider is gated behind `NEXT_PUBLIC_E2E_WALLET=true`.
 * The build script (`scripts/check-client-secrets.sh`) must refuse to produce
 * a production build when that flag is set.
 */

import { Keypair, TransactionBuilder, Networks } from "@stellar/stellar-sdk";
import type { Page } from "@playwright/test";

export type WalletFixture = {
  publicKey: string;
  install: (page: Page) => Promise<void>;
};

/**
 * Creates a wallet fixture from a Stellar secret key.
 *
 * @param secret  – The secp256k1 secret (S…) for the test account.
 *                  Sourced from CI secrets / local .env.e2e — never hardcoded.
 */
export function createWalletFixture(secret: string): WalletFixture {
  const kp = Keypair.fromSecret(secret);

  return {
    publicKey: kp.publicKey(),

    /**
     * Installs the test signer into a Playwright page context.
     *
     * Must be called before the page navigates to any app URL so that
     * `addInitScript` runs before the React app boots.
     */
    async install(page: Page): Promise<void> {
      // Expose a Node.js function that signs a transaction XDR and returns
      // the signed XDR.  The secret key lives only in the Node.js process.
      await page.exposeFunction(
        "__e2eSign",
        (unsignedXDR: string): string => {
          const tx = TransactionBuilder.fromXDR(
            unsignedXDR,
            Networks.TESTNET,
          );
          tx.sign(kp);
          return tx.toXDR();
        },
      );

      // Inject the public address into the page so the app can read it from
      // window.__e2eAddress without needing Freighter to be connected.
      await page.addInitScript((address: string) => {
        (window as unknown as Record<string, unknown>).__e2eAddress = address;
      }, kp.publicKey());
    },
  };
}
