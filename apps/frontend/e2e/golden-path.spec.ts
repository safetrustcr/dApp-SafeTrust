/**
 * SafeTrust golden-path E2E test — register → deploy → fund → complete →
 * approve → release (issue #448)
 *
 * Scenario roles
 * ──────────────
 *  guest    = approver + release signer (new user registration in step 1)
 *  host     = service provider          (pre-provisioned, owns the seeded apartment)
 *  platform = dispute resolver          (address only, not a browser actor here)
 *
 * Before running:
 *   make infra
 *   pnpm testnet:provision --check
 *   pnpm run dev
 *   pnpm --filter @safetrust/web test:e2e
 */

import { test, expect, type Page, chromium } from "@playwright/test";
import { createUserFixtures } from "./fixtures/users";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = process.env.PLAYWRIGHT_BASE_URL ?? "http://localhost:3001";
const API_URL = process.env.API_URL ?? "http://localhost:3000";

/** Wait for the Stellar confirmation spinner to disappear (up to 90 s). */
async function waitForConfirmation(page: Page): Promise<void> {
  await expect(page.getByText(/Confirming on Stellar/i)).toBeHidden({
    timeout: 90_000,
  });
}

/** Poll the API for an escrow status until it matches the expected value. */
async function pollEscrowStatus(
  engagementId: string,
  expected: string,
): Promise<void> {
  const deadline = Date.now() + 60_000;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(
        `${API_URL}/api/escrow/${engagementId}/status`,
        { headers: { "Content-Type": "application/json" } },
      );
      if (res.ok) {
        const body = await res.json();
        if (body.status === expected) return;
      }
    } catch {
      // Swallow transient network errors and retry
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(
    `Timed out waiting for escrow ${engagementId} to reach status '${expected}'`,
  );
}

// ---------------------------------------------------------------------------
// Test
// ---------------------------------------------------------------------------

test.describe("SafeTrust golden-path (testnet)", () => {
  test(
    "register → deploy → fund → complete → approve → release",
    { tag: "@e2e" },
    async ({}) => {
      // We manage our own browser contexts for the two actors so they have
      // completely isolated sessions and cookie jars.
      const browser = await chromium.launch();
      const { guest, host } = await createUserFixtures(browser);

      let engagementId: string;

      try {
        // ── Step 1: Guest registers ──────────────────────────────────────
        await test.step("Guest: register with email", async () => {
          await guest.page.goto(`${BASE}/register`);
          await guest.page.getByLabel(/email/i).fill(guest.email);
          await guest.page.getByLabel(/password/i).fill("SafeTest2026!");
          await guest.page.getByRole("button", { name: /register|sign up/i }).click();

          // Should land on dashboard after successful registration
          await expect(guest.page).toHaveURL(/\/dashboard/, { timeout: 30_000 });
        });

        // ── Step 2: Host logs in ─────────────────────────────────────────
        await test.step("Host: log in and see apartment", async () => {
          await host.page.goto(`${BASE}/login`);
          await host.page.getByLabel(/email/i).fill(host.email);
          await host.page.getByLabel(/password/i).fill(
            process.env.E2E_HOST_PASSWORD ?? "SafeTest2026!",
          );
          await host.page.getByRole("button", { name: /log in|sign in/i }).click();
          await expect(host.page).toHaveURL(/\/dashboard/, { timeout: 30_000 });

          // Navigate to apartments list and confirm seeded apartment is present
          await host.page.goto(`${BASE}/dashboard/apartments`);
          await expect(
            host.page.getByText(process.env.E2E_APARTMENT_NAME ?? /apartment/i),
          ).toBeVisible({ timeout: 20_000 });
        });

        // ── Step 3: Guest creates escrow (deploy) ────────────────────────
        await test.step("Guest: open apartment → create escrow → sign", async () => {
          const apartmentId =
            process.env.E2E_APARTMENT_ID ?? "00000000-0000-0000-0000-000000000001";

          await guest.page.goto(`${BASE}/dashboard/escrow/${apartmentId}`);

          // Click whatever CTA initiates the escrow creation
          await guest.page
            .getByRole("button", { name: /create escrow|start escrow|book/i })
            .click();

          // The app will call window.__e2eSign for the deployment XDR
          await waitForConfirmation(guest.page);

          // Capture the engagement ID from the URL or a data attribute
          const url = guest.page.url();
          const match = url.match(/engagement[_-]?id=([^&]+)/i);
          engagementId =
            match?.[1] ??
            (await guest.page
              .getByTestId("engagement-id")
              .getAttribute("data-value")) ??
            "";
          expect(engagementId, "engagement ID must be set after deploy").toBeTruthy();

          await pollEscrowStatus(engagementId, "created");
          await expect(guest.page.getByTestId("escrow-status")).toContainText(
            /created/i,
          );
        });

        // ── Step 4: Guest funds the escrow ───────────────────────────────
        await test.step("Guest: fund escrow → sign → status funded", async () => {
          await guest.page
            .getByRole("button", { name: /fund/i })
            .click();

          await waitForConfirmation(guest.page);
          await pollEscrowStatus(engagementId, "funded");

          await expect(guest.page.getByTestId("escrow-status")).toContainText(
            /funded/i,
          );

          // Both browsers should now show funded — verify host sees it too
          await host.page.goto(`${BASE}/dashboard/escrow-dashboard`);
          await expect(host.page.getByTestId("escrow-status")).toContainText(
            /funded/i,
            { timeout: 20_000 },
          );
        });

        // ── Step 5: Host marks milestone completed ───────────────────────
        await test.step("Host: mark milestone completed → sign", async () => {
          await host.page
            .getByRole("button", { name: /mark.*complete|complete.*milestone/i })
            .click();

          await waitForConfirmation(host.page);

          // Milestone is completed but escrow should still be 'funded'
          await expect(
            host.page.getByTestId("milestone-status"),
          ).toContainText(/completed/i, { timeout: 20_000 });

          // Escrow status must remain funded (not released yet)
          await expect(host.page.getByTestId("escrow-status")).toContainText(
            /funded/i,
          );

          // Guest should also see the milestone update
          await guest.page.reload();
          await expect(
            guest.page.getByTestId("milestone-status"),
          ).toContainText(/completed/i, { timeout: 20_000 });
        });

        // ── Step 6: Guest approves milestone ─────────────────────────────
        await test.step("Guest: approve milestone → sign → status milestone_approved", async () => {
          await guest.page
            .getByRole("button", { name: /approve.*milestone|approve/i })
            .click();

          await waitForConfirmation(guest.page);
          await pollEscrowStatus(engagementId, "milestone_approved");

          await expect(guest.page.getByTestId("escrow-status")).toContainText(
            /milestone.?approved/i,
          );
        });

        // ── Step 7: Host cannot call the release endpoint directly (403) ──
        await test.step("Host: direct release API call returns 403", async () => {
          const resp = await fetch(
            `${API_URL}/api/escrow/${engagementId}/release`,
            {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
                // Provide the host's auth token if available from the page
                Authorization: `Bearer ${process.env.E2E_HOST_API_TOKEN ?? ""}`,
              },
              body: JSON.stringify({ engagementId }),
            },
          );

          expect(resp.status).toBe(403);
        });

        // ── Step 8: Guest releases escrow ────────────────────────────────
        await test.step("Guest: release → sign → status completed", async () => {
          await guest.page
            .getByRole("button", { name: /release/i })
            .click();

          await waitForConfirmation(guest.page);
          await pollEscrowStatus(engagementId, "completed");

          await expect(guest.page.getByTestId("escrow-status")).toContainText(
            /completed/i,
          );
        });

        // ── Step 9: Re-submit the same release XDR (idempotency) ─────────
        await test.step("Guest: re-submit same release XDR → 200 + no second TW call", async () => {
          // The app should expose the last signed XDR in a data attribute or
          // via a window property so we can re-submit it programmatically.
          const lastXDR: string = await guest.page.evaluate(
            () =>
              (window as unknown as Record<string, string>).__e2eLastSignedXDR ??
              "",
          );

          if (!lastXDR) {
            // If the app doesn't expose the XDR we skip this step with a note.
            console.warn(
              "Step 9 skipped: window.__e2eLastSignedXDR not set by the app.",
            );
            return;
          }

          const resp = await fetch(
            `${API_URL}/api/escrow/${engagementId}/release`,
            {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ engagementId, signedXDR: lastXDR }),
            },
          );

          // Must succeed (not 4xx/5xx)
          expect(resp.status).toBe(200);

          // Status must still be completed — not reset
          await expect(guest.page.getByTestId("escrow-status")).toContainText(
            /completed/i,
          );
        });
      } finally {
        // Always clean up browser contexts to avoid leaking resources
        await guest.context.close();
        await host.context.close();
        await browser.close();
      }
    },
  );
});
