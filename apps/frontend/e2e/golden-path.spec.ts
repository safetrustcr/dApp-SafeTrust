/**
 * SafeTrust golden path on Stellar testnet (issues #448, #599):
 *
 *   deploy → fund → mark completed → approve → host 403 on release
 *   → guest release → idempotent re-submit
 *
 * Roles (single-release escrow, see apps/api/src/services/escrow-authz.ts)
 *   guest    = approver + release signer  (guest@safetrust.local)
 *   host     = service provider + receiver (host@safetrust.local)
 *   platform = dispute resolver            (not used on this path)
 *
 * Each step is checked twice: SafeTrust's escrow row in Hasura, and the
 * contract state from Trustless Work with validateOnChain=true.
 *
 * Runbook and setup: docs/testnet-booking.md
 */

import { test, expect } from "@playwright/test";
import { e2eConfig } from "./lib/env";
import { Booking, apiPost, signInActors, type Actor } from "./lib/booking";
import { createRunApartment, waitForSafeTrustStatus } from "./lib/hasura";
import { reserveTrustlessWorkCalls, waitForEscrowOnChain } from "./lib/trustless-work";
import { fromStroops, paidOut, toStroops, usdcBalanceStroops } from "./lib/stellar";

test.describe.configure({ mode: "serial" });

test.describe("SafeTrust golden path (testnet)", () => {
  test("deploy → fund → complete → approve → release", { tag: "@e2e" }, async ({}, testInfo) => {
    test.setTimeout(12 * 60_000);
    const cfg = e2eConfig();
    const amount = cfg.depositUsdc;
    const amountStroops = toStroops(amount);

    let guest!: Actor;
    let host!: Actor;
    let booking!: Booking;

    try {
      await test.step("Sign in guest and host; create a fresh apartment for this run", async () => {
        ({ guest, host } = await signInActors());
        const apartmentId = await createRunApartment(host.uid, host.address, "golden-path");
        booking = new Booking("Happy path", apartmentId);
      });

      const guestBefore = await usdcBalanceStroops(guest.address);
      const hostBefore = await usdcBalanceStroops(host.address);
      expect(
        guestBefore >= amountStroops,
        `guest needs ≥ ${amount} USDC (has ${fromStroops(guestBefore)}); use https://faucet.circle.com`,
      ).toBe(true);

      await test.step("Guest: deploy escrow → SafeTrust created, contract on chain", async () => {
        const res = await booking.run("deploy", guest, "/api/escrow/deploy", {
          apartmentId: booking.apartmentId,
          senderAddress: guest.address,
        });
        expect(res.action).toBe("initialize");
        expect(booking.contractId, "send-transaction must return the contract id").toMatch(/^C[A-Z0-9]{55}$/);

        const st = await waitForSafeTrustStatus(booking.engagementId, { status: "created", milestoneStatus: "pending" });
        expect(st.contractId).toBe(booking.contractId);
        expect(st.amount).toBe(amount);

        const tw = await waitForEscrowOnChain(booking.contractId, () => true, "deployed");
        expect(tw.engagementId ?? booking.engagementId).toBe(booking.engagementId);
        expect(tw.balance ?? 0).toBe(0);
        expect(tw.flags).toEqual({ disputed: false, released: false, resolved: false });
      });

      await test.step("Guest: fund → SafeTrust funded, contract holds the deposit", async () => {
        await booking.run("fund", guest, "/api/escrow/fund", { engagementId: booking.engagementId });
        await waitForSafeTrustStatus(booking.engagementId, { status: "funded" });
        await waitForEscrowOnChain(booking.contractId, (e) => e.balance === amount, `balance ${amount}`);
        expect(await usdcBalanceStroops(guest.address)).toBe(guestBefore - amountStroops);
      });

      await test.step("Host: mark milestone completed → milestone completed, escrow still funded", async () => {
        await booking.run("mark completed", host, "/api/escrow/milestone-status", {
          engagementId: booking.engagementId,
          milestoneIndex: 0,
          newEvidence: "E2E: guest checked in",
        });
        await waitForSafeTrustStatus(booking.engagementId, { status: "funded", milestoneStatus: "completed" });
        const tw = await waitForEscrowOnChain(
          booking.contractId,
          (e) => e.milestone.status === "completed",
          "milestone completed",
        );
        expect(tw.milestone.approved).toBe(false);
      });

      await test.step("Guest: approve milestone → SafeTrust milestone_approved", async () => {
        await booking.run("approve", guest, "/api/escrow/approve-milestone", {
          engagementId: booking.engagementId,
          milestoneIndex: 0,
        });
        await waitForSafeTrustStatus(booking.engagementId, { status: "milestone_approved", milestoneStatus: "approved" });
        await waitForEscrowOnChain(booking.contractId, (e) => e.milestone.approved, "milestone approved");
      });

      await test.step("Host: release-funds is refused (403) — only the release signer may release", async () => {
        const res = await apiPost(host, "/api/escrow/release-funds", { engagementId: booking.engagementId });
        expect(res.status, JSON.stringify(res.body)).toBe(403);
        // Nothing moved.
        await waitForSafeTrustStatus(booking.engagementId, { status: "milestone_approved" }, 5_000);
      });

      await test.step("Guest: release → SafeTrust completed, host paid", async () => {
        await booking.run("release", guest, "/api/escrow/release-funds", { engagementId: booking.engagementId });
        await waitForSafeTrustStatus(booking.engagementId, { status: "completed", milestoneStatus: "released" });
        await waitForEscrowOnChain(
          booking.contractId,
          (e) => e.flags.released && (e.balance ?? 0) === 0,
          "released, balance 0",
        );

        const received = (await usdcBalanceStroops(host.address)) - hostBefore;
        expect(
          paidOut(received, amountStroops, cfg.payoutFeeTolerance),
          `host received ${fromStroops(received)} USDC, expected ${amount}`,
        ).toBe(true);
      });

      await test.step("Guest: re-submit the same signed release XDR → 200 replay, no second submit", async () => {
        const last = booking.signed.get("release_funds");
        expect(last, "release XDR recorded").toBeTruthy();
        const releaseTx = booking.txs.find((t) => t.action === "release_funds")!;

        // A replay is answered from escrow_pending_actions without calling
        // Trustless Work; reserve a slot anyway in case it is not.
        await reserveTrustlessWorkCalls(1, "replay release");
        const res = await apiPost<{ replay?: boolean; txHash?: string }>(
          guest,
          "/api/escrow/send-transaction",
          { signedXdr: last!.signedXdr },
        );
        expect(res.status, JSON.stringify(res.body)).toBe(200);
        expect(res.body.replay).toBe(true);
        expect(res.body.txHash).toBe(releaseTx.txHash);
        await waitForSafeTrustStatus(booking.engagementId, { status: "completed" }, 5_000);
      });

      await test.step("Reconciliation keeps the final state", async () => {
        await booking.reconcile();
        await waitForSafeTrustStatus(booking.engagementId, { status: "completed" }, 10_000);
      });
    } finally {
      if (booking?.txs.length) {
        const summary = booking.summary([`Deposit: ${amount} USDC`]);
        console.log(`\n${summary}`);
        await testInfo.attach("testnet-transactions.md", { body: summary, contentType: "text/markdown" });
      }
    }
  });
});