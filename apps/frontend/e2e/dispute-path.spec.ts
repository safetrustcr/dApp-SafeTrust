/**
 * SafeTrust dispute path on Stellar testnet (issue #599):
 *
 *   deploy → fund → guest opens dispute → host cannot resolve (403)
 *   → admin resolves 50/50 → both USDC balances match the split
 *
 * Roles
 *   guest    = approver; may open a dispute      (guest@safetrust.local)
 *   host     = service provider; not an admin     (host@safetrust.local)
 *   admin    = admin role + platform wallet, the dispute resolver
 *              (admin@safetrust.local, wallet = PLATFORM_STELLAR_ADDRESS)
 *
 * Runbook and setup: docs/testnet-booking.md
 */

import { test, expect } from "@playwright/test";
import { e2eConfig } from "./lib/env";
import { Booking, apiPost, signInActors, type Actor } from "./lib/booking";
import { createRunApartment, waitForSafeTrustStatus } from "./lib/hasura";
import { waitForEscrowOnChain } from "./lib/trustless-work";
import { fromStroops, paidOut, toStroops, usdcBalanceStroops } from "./lib/stellar";

test.describe.configure({ mode: "serial" });

test.describe("SafeTrust dispute path (testnet)", () => {
  test("deploy → fund → dispute → host 403 → admin resolves 50/50", { tag: "@e2e" }, async ({}, testInfo) => {
    test.setTimeout(12 * 60_000);
    const cfg = e2eConfig();
    const amount = cfg.depositUsdc;
    const amountStroops = toStroops(amount);
    const guestShareStroops = amountStroops / 2n;
    const hostShareStroops = amountStroops - guestShareStroops;
    const distributions = [
      { role: "approver", amount: Number(fromStroops(guestShareStroops)) },
      { role: "serviceProvider", amount: Number(fromStroops(hostShareStroops)) },
    ];

    let guest!: Actor;
    let host!: Actor;
    let admin!: Actor;
    let booking!: Booking;

    try {
      await test.step("Sign in guest, host and admin; create a fresh apartment for this run", async () => {
        ({ guest, host, admin } = await signInActors());
        expect(admin.address, "E2E_PLATFORM_SECRET must be the PLATFORM_STELLAR_ADDRESS wallet").toBe(
          cfg.platformAddress,
        );
        const apartmentId = await createRunApartment(host.uid, host.address, "dispute-path");
        booking = new Booking("Dispute path", apartmentId);
      });

      const guestBefore = await usdcBalanceStroops(guest.address);
      const hostBefore = await usdcBalanceStroops(host.address);
      expect(
        guestBefore >= amountStroops,
        `guest needs ≥ ${amount} USDC (has ${fromStroops(guestBefore)}); use https://faucet.circle.com`,
      ).toBe(true);

      await test.step("Guest: deploy escrow → SafeTrust created", async () => {
        await booking.run("deploy", guest, "/api/escrow/deploy", {
          apartmentId: booking.apartmentId,
          senderAddress: guest.address,
        });
        await waitForSafeTrustStatus(booking.engagementId, { status: "created" });
        const tw = await waitForEscrowOnChain(booking.contractId, () => true, "deployed");
        expect(tw.flags.disputed).toBe(false);
      });

      await test.step("Guest: fund → SafeTrust funded, contract holds the deposit", async () => {
        await booking.run("fund", guest, "/api/escrow/fund", { engagementId: booking.engagementId });
        await waitForSafeTrustStatus(booking.engagementId, { status: "funded" });
        await waitForEscrowOnChain(booking.contractId, (e) => e.balance === amount, `balance ${amount}`);
      });

      const guestAfterFund = await usdcBalanceStroops(guest.address);
      expect(guestAfterFund).toBe(guestBefore - amountStroops);

      await test.step("Guest: open dispute → SafeTrust disputed, contract flagged", async () => {
        await booking.run("dispute", guest, "/api/escrow/dispute", { engagementId: booking.engagementId });
        await waitForSafeTrustStatus(booking.engagementId, { status: "disputed" });
        await waitForEscrowOnChain(booking.contractId, (e) => e.flags.disputed, "disputed");
      });

      await test.step("Host: resolve-dispute is refused (403) — admin only", async () => {
        const res = await apiPost(host, "/api/escrow/resolve-dispute", {
          engagementId: booking.engagementId,
          distributions,
        });
        expect(res.status, JSON.stringify(res.body)).toBe(403);
        await waitForSafeTrustStatus(booking.engagementId, { status: "disputed" }, 5_000);
      });

      await test.step("Admin: resolve 50/50 → SafeTrust resolved, contract empty", async () => {
        await booking.run("resolve 50/50", admin, "/api/escrow/resolve-dispute", {
          engagementId: booking.engagementId,
          distributions,
        });
        await waitForSafeTrustStatus(booking.engagementId, { status: "resolved" });
        await waitForEscrowOnChain(
          booking.contractId,
          (e) => e.flags.resolved && (e.balance ?? 0) === 0,
          "resolved, balance 0",
        );
      });

      await test.step("Balances match the split", async () => {
        const guestReceived = (await usdcBalanceStroops(guest.address)) - guestAfterFund;
        const hostReceived = (await usdcBalanceStroops(host.address)) - hostBefore;
        expect(
          paidOut(guestReceived, guestShareStroops, cfg.payoutFeeTolerance),
          `guest received ${fromStroops(guestReceived)} USDC, expected ${fromStroops(guestShareStroops)}`,
        ).toBe(true);
        expect(
          paidOut(hostReceived, hostShareStroops, cfg.payoutFeeTolerance),
          `host received ${fromStroops(hostReceived)} USDC, expected ${fromStroops(hostShareStroops)}`,
        ).toBe(true);
      });

      await test.step("Reconciliation keeps the final state", async () => {
        await booking.reconcile();
        await waitForSafeTrustStatus(booking.engagementId, { status: "resolved" }, 10_000);
      });
    } finally {
      if (booking?.txs.length) {
        const summary = booking.summary([
          `Deposit: ${amount} USDC, split ${fromStroops(guestShareStroops)} guest / ${fromStroops(hostShareStroops)} host`,
        ]);
        console.log(`\n${summary}`);
        await testInfo.attach("testnet-transactions.md", { body: summary, contentType: "text/markdown" });
      }
    }
  });
});
