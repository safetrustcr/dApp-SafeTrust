/**
 * Read-only tools that answer "where is this booking, and why is it stuck?"
 * against the escrow model apps/api actually runs: apartment deposits and
 * hotel reservations, escrow_pending_actions, the escrow_transactions
 * transition log and the reconciler. None of them returns an unsigned XDR.
 */
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { STELLAR_ADDRESS_REGEX, USDC_ADDRESS } from '../config.js';
import {
  apartmentContext,
  presentContext,
  readinessChecks,
  reservationContext,
  type BookingContext,
} from '../lib/booking.js';
import { diagnose, type DiagnosisSnapshot } from '../lib/diagnose.js';
import {
  getApartmentTerms,
  getEscrow,
  getEscrowsForApartment,
  getHotelReservation,
  getLastReconcilerWrite,
  getPendingActions,
  getTransitions,
  getTrustlessWorkMirrorStatus,
  isHotelWalletRegistered,
  isWalletRegistered,
} from '../lib/escrow-data.js';
import { getAccount, getTransactionStatus } from '../lib/horizon.js';
import { apiRequest } from '../lib/api.js';
import { routeUrl } from '../lib/api-contract.js';
import { formatApiReadiness, isApiReadiness } from '../lib/readiness.js';
import { apiFailure, type ApiFailure } from './escrow.js';
import { redactWallet } from '../lib/redact.js';
import { describeError, errorResult, jsonBlock, textResult } from '../lib/response.js';

const booking = {
  apartmentId: z.string().uuid().optional().describe('Apartment (deposit escrow)'),
  reservationId: z.string().uuid().optional().describe('Hotel reservation'),
};

async function loadContext(apartmentId?: string, reservationId?: string): Promise<BookingContext | string> {
  if (Boolean(apartmentId) === Boolean(reservationId)) return 'Provide exactly one of apartmentId or reservationId.';
  if (apartmentId) {
    return apartmentContext(apartmentId, await getApartmentTerms(apartmentId), USDC_ADDRESS) ?? `Apartment ${apartmentId} not found.`;
  }
  return reservationContext(await getHotelReservation(reservationId!), USDC_ADDRESS) ?? `Hotel reservation ${reservationId} not found.`;
}

export async function collectDiagnosis(engagementId: string, now = new Date()): Promise<DiagnosisSnapshot> {
  const escrow = await getEscrow({ engagementId });
  const contractId = escrow?.contract_id && escrow.contract_id !== engagementId ? escrow.contract_id : null;
  const [pendingActions, transitions, twMirrorStatus, lastReconcilerWrite] = await Promise.all([
    getPendingActions(engagementId),
    getTransitions(engagementId, contractId),
    getTrustlessWorkMirrorStatus(contractId),
    getLastReconcilerWrite(),
  ]);
  const chain: DiagnosisSnapshot['chain'] = {};
  for (const row of pendingActions.filter((r) => r.status === 'submitted' || r.status === 'confirmed').slice(0, 3)) {
    chain[row.tx_hash] = await getTransactionStatus(row.tx_hash);
  }
  return { engagementId, escrow, pendingActions, transitions, twMirrorStatus, chain, lastReconcilerWrite, now };
}

export function registerEscrowDiagnosticsTools(server: McpServer) {
  server.registerTool(
    'get-booking-context',
    {
      title: 'Get booking context',
      description:
        'Escrow terms for an apartment deposit or a hotel reservation, as apps/api derives them: property, ' +
        'dates, amount and asset, host and guest wallets (shortened), any existing escrow, and anything that ' +
        'would make apps/api refuse to deploy.',
      inputSchema: booking,
      annotations: { readOnlyHint: true },
    },
    async ({ apartmentId, reservationId }) => {
      try {
        const context = await loadContext(apartmentId, reservationId);
        if (typeof context === 'string') return errorResult(context);
        const escrows = apartmentId
          ? await getEscrowsForApartment(apartmentId)
          : (await getEscrow({ engagementId: context.engagementId! }).then((e) => (e ? [e] : [])));
        const view = presentContext(context, escrows);
        return textResult(
          `${view.kind === 'apartment' ? 'Apartment' : 'Hotel reservation'}: ${view.property}`,
          view.deployable ? 'apps/api would accept a deploy for this booking.' : 'apps/api would refuse a deploy — see blockers.',
          jsonBlock(view),
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  server.registerTool(
    'get-escrow-status',
    {
      title: 'Get escrow status',
      description:
        'Status of one escrow by engagementId or contractId: the DB row, the last 10 transitions from the ' +
        'escrow_transactions audit log, and the Trustless Work mirror status stored in the DB.',
      inputSchema: {
        engagementId: z.string().optional().describe('rental:<apartmentId>:<guestUid> or hotel:<reservationId>'),
        contractId: z.string().optional().describe('On-chain contract id (C…)'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ engagementId, contractId }) => {
      if (Boolean(engagementId) === Boolean(contractId)) {
        return errorResult('Provide exactly one of engagementId or contractId.');
      }
      try {
        const escrow = await getEscrow({ engagementId, contractId });
        if (!escrow) return textResult(`No escrow found for ${engagementId ?? contractId}.`);
        const onChainId = escrow.contract_id && escrow.contract_id !== escrow.engagement_id ? escrow.contract_id : null;
        const [transitions, twMirrorStatus] = await Promise.all([
          getTransitions(escrow.engagement_id, onChainId),
          getTrustlessWorkMirrorStatus(onChainId),
        ]);
        return textResult(
          `Escrow ${escrow.engagement_id}: ${escrow.status}`,
          jsonBlock({
            engagementId: escrow.engagement_id,
            contractId: onChainId,
            status: escrow.status,
            tenant: escrow.tenant_id,
            amount: Number(escrow.amount),
            guestWallet: redactWallet(escrow.sender_address),
            hostWallet: redactWallet(escrow.receiver_address),
            createdAt: escrow.created_at,
            updatedAt: escrow.updated_at,
            trustlessWorkMirrorStatus: twMirrorStatus,
            transitions,
          }),
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  server.registerTool(
    'get-pending-action',
    {
      title: 'Get pending action',
      description:
        'Transactions apps/api built for an escrow (escrow_pending_actions): action, status ' +
        '(built / submitted / confirmed / failed / expired), tx hash, signer and expiry. Never the XDR.',
      inputSchema: {
        engagementId: z.string().min(1).describe('rental:<apartmentId>:<guestUid> or hotel:<reservationId>'),
        action: z
          .enum(['initialize', 'fund', 'mark_milestone_completed', 'approve_milestone', 'release_funds', 'resolve_dispute'])
          .optional()
          .describe('Only this action'),
      },
      annotations: { readOnlyHint: true },
    },
    async ({ engagementId, action }) => {
      try {
        const rows = await getPendingActions(engagementId, action);
        if (rows.length === 0) return textResult(`No built transactions for ${engagementId}${action ? ` (${action})` : ''}.`);
        const now = Date.now();
        return textResult(
          `${rows.length} built transaction(s), newest first.`,
          jsonBlock(
            rows.map((row) => ({
              action: row.action,
              status: row.status,
              expired: row.status === 'built' && new Date(row.expires_at).getTime() <= now,
              txHash: row.tx_hash,
              signer: redactWallet(row.signer_address),
              createdAt: row.created_at,
              expiresAt: row.expires_at,
              submittedAt: row.submitted_at,
              confirmedAt: row.confirmed_at,
            })),
          ),
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  server.registerTool(
    'get-wallet-readiness',
    {
      title: 'Get wallet readiness',
      description:
        'Can this booking be escrowed? Asks apps/api GET /api/escrow/readiness — the same checks the app shows ' +
        'the guest: registered wallet, account exists, XLM for fees, USDC trustline, USDC balance, and whether ' +
        'host and platform can receive USDC — each failing check with its fix. While the MCP cannot call ' +
        "authenticated routes (#528) it falls back to its own read-only Hasura + Testnet Horizon checks and says so.",
      inputSchema: {
        ...booking,
        guestAddress: z
          .string()
          .regex(STELLAR_ADDRESS_REGEX)
          .optional()
          .describe(
            'Fallback only: guest wallet to check for an apartment. apps/api always uses the signed-in ' +
              "user's registered wallet; reservations carry their own.",
          ),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ apartmentId, reservationId, guestAddress }) => {
      if (Boolean(apartmentId) === Boolean(reservationId)) {
        return errorResult('Provide exactly one of apartmentId or reservationId.');
      }
      try {
        const query = apartmentId
          ? `apartmentId=${encodeURIComponent(apartmentId)}`
          : `reservationId=${encodeURIComponent(reservationId!)}`;
        let fallbackReason: string;
        try {
          const { ok, status, data } = await apiRequest<unknown>(`${routeUrl('readiness')}?${query}`);
          if (ok && isApiReadiness(data)) return textResult(...formatApiReadiness(data));
          if (ok) {
            fallbackReason = 'apps/api answered GET /api/escrow/readiness with an unexpected shape';
          } else if (status === 401 || status === 403) {
            fallbackReason =
              `apps/api GET /api/escrow/readiness needs the signed-in Testnet test user (HTTP ${status}); ` +
              'the MCP signs in once #528 lands';
          } else if (status === 404 && !(data as ApiFailure | null)?.type && !(data as ApiFailure | null)?.code) {
            fallbackReason = 'this apps/api has no GET /api/escrow/readiness route yet';
          } else {
            // A real answer from apps/api (e.g. 409 SELF_ESCROW_NOT_ALLOWED, 404 APARTMENT_NOT_FOUND).
            return apiFailure('Readiness', status, data as ApiFailure);
          }
        } catch (error) {
          fallbackReason = describeError(error);
        }

        const loaded = await loadContext(apartmentId, reservationId);
        if (typeof loaded === 'string') return errorResult(loaded);
        const context = { ...loaded, guestWallet: loaded.guestWallet ?? guestAddress ?? null };

        const guestRegistered = context.guestWallet
          ? context.kind === 'hotel_reservation'
            ? await isHotelWalletRegistered(context.guestWallet)
            : await isWalletRegistered(context.guestWallet)
          : null;
        const [guest, host] = await Promise.all([
          context.guestWallet ? getAccount(context.guestWallet, USDC_ADDRESS) : null,
          context.hostWallet ? getAccount(context.hostWallet, USDC_ADDRESS) : null,
        ]);
        const checks = readinessChecks({ context, guestRegistered, guest, host });
        const failing = checks.filter((c) => c.result === 'fail');
        return textResult(
          failing.length === 0
            ? `Ready: ${checks.filter((c) => c.result === 'pass').length} checks pass.`
            : `Not ready: ${failing.length} check(s) fail.`,
          `source: MCP read-only checks (Hasura + Testnet Horizon), not apps/api — ${fallbackReason}.`,
          ...checks.map((c) => `${c.result === 'pass' ? '✅' : c.result === 'fail' ? '❌' : '➖'} ${c.id}: ${c.detail}${c.fix ? `\n   fix: ${c.fix}` : ''}`),
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  server.registerTool(
    'diagnose-escrow',
    {
      title: 'Diagnose escrow',
      description:
        'Plain-language answer to "why is this booking stuck?": combines the escrow row, built and submitted ' +
        'transactions, the transition log, the Trustless Work mirror, Horizon (Testnet, read-only) and the ' +
        "reconciler's last correction, then names the next step.",
      inputSchema: {
        engagementId: z.string().min(1).describe('rental:<apartmentId>:<guestUid> or hotel:<reservationId>'),
      },
      annotations: { readOnlyHint: true, openWorldHint: true },
    },
    async ({ engagementId }) => {
      try {
        const result = diagnose(await collectDiagnosis(engagementId));
        return textResult(
          result.summary,
          '',
          `Next step: ${result.nextStep}`,
          '',
          `state: ${result.state}`,
          ...result.details.map((line) => `- ${line}`),
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );
}
