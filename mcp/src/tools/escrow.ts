import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { SAFETRUST_API_URL, STELLAR_ADDRESS_REGEX } from '../config.js';
import { apiRequest } from '../lib/api.js';
import { routeUrl } from '../lib/api-contract.js';
import { escrowRolesDoc } from '../lib/escrow-roles.js';
import { describeError, errorResult, jsonBlock, textResult } from '../lib/response.js';

const stellarAddress = z
  .string()
  .regex(STELLAR_ADDRESS_REGEX, 'Must be a Stellar public key (G…, 56 chars)');

/**
 * apps/api answers errors as RFC 7807 problem details ({ type, title, detail })
 * from ApiError, or as { error, code? } from the auth middleware.
 */
export type ApiFailure = { error?: string; code?: string; detail?: string; title?: string; type?: string };

export function apiFailure(action: string, status: number, data: ApiFailure) {
  const code = data.code ?? data.type?.split('/').pop()?.replace(/-/g, '_').toUpperCase();
  const message = data.detail ?? data.error ?? data.title ?? 'unknown error';
  const lines = [`${action} failed (HTTP ${status}${code ? ` ${code}` : ''}): ${message}`];
  if (status === 401) {
    lines.push(
      '',
      'apps/api build routes require a signed-in user and an Idempotency-Key. The MCP does not sign in',
      'as the Testnet test user yet (#528), so build through the app in the browser for now, and use',
      'get-booking-context, get-wallet-readiness and diagnose-escrow to see where a booking stands.',
    );
  }
  return errorResult(...lines);
}

/** Show enough of an unsigned XDR to recognise it; signing happens in the browser wallet. */
const preview = (xdr: string | undefined | null) =>
  xdr ? `${xdr.slice(0, 48)}… (${xdr.length} chars, unsigned)` : 'none returned';

export function registerEscrowTools(server: McpServer) {
  /**
   * Deploy — POST /api/escrow/deploy. apps/api derives the host wallet and the
   * amount from the apartment or reservation, and the engagement id from the
   * booking, so the MCP only passes the booking and the guest wallet.
   */
  server.registerTool(
    'deploy-escrow',
    {
      title: 'Deploy escrow',
      description:
        'Build the unsigned deploy (initialize) transaction for an apartment deposit or a hotel reservation ' +
        'through apps/api POST /api/escrow/deploy. Pass exactly one of apartmentId or reservationId, plus ' +
        "the guest's registered wallet. Returns an unsigned XDR only; the guest signs it in their wallet.",
      inputSchema: {
        apartmentId: z.string().uuid().optional().describe('Apartment being rented (deposit escrow)'),
        reservationId: z.string().uuid().optional().describe('Hotel reservation being paid'),
        senderAddress: stellarAddress.describe("Guest's registered Stellar wallet (approver and release signer)"),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ apartmentId, reservationId, senderAddress }) => {
      if (Boolean(apartmentId) === Boolean(reservationId)) {
        return errorResult('Provide exactly one of apartmentId or reservationId.');
      }
      try {
        const { ok, status, data } = await apiRequest<
          { status?: string; engagementId?: string; contractId?: string; unsignedXDR?: string; cached?: boolean } & ApiFailure
        >(routeUrl('deploy'), {
          method: 'POST',
          body: apartmentId ? { apartmentId, senderAddress } : { reservationId, senderAddress },
        });
        if (!ok) return apiFailure('Deploy', status, data);

        if (data.cached && !data.unsignedXDR) {
          return textResult(
            'Already deployed for this booking (idempotent replay).',
            `engagementId: ${data.engagementId}`,
            `contractId: ${data.contractId ?? 'unknown'}`,
            '',
            'Next: diagnose-escrow with this engagementId.',
          );
        }
        return textResult(
          data.cached ? 'Deploy transaction already built and still waiting for a signature.' : 'Deploy transaction built.',
          `status: ${data.status}`,
          `engagementId: ${data.engagementId}`,
          `contractId: ${data.contractId ?? '(assigned on chain)'}`,
          `unsignedXDR: ${preview(data.unsignedXDR)}`,
          '',
          'Next: the guest signs it in their wallet in the app; the frontend submits it to',
          'POST /api/escrow/send-transaction, which only accepts the hash apps/api recorded.',
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  /** Fund — POST /api/escrow/fund. Signer and amount come from the escrow row. */
  server.registerTool(
    'fund-escrow',
    {
      title: 'Fund escrow',
      description:
        'Build the unsigned fund transaction for a deployed escrow through apps/api POST /api/escrow/fund. ' +
        "apps/api takes the signer (the guest's approver wallet) and the amount from the escrow record. " +
        'Returns an unsigned XDR only.',
      inputSchema: {
        engagementId: z.string().min(1).describe('rental:<apartmentId>:<guestUid> or hotel:<reservationId>'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ engagementId }) => {
      try {
        const { ok, status, data } = await apiRequest<
          {
            unsignedXdr?: string;
            txHash?: string;
            engagementId?: string;
            contractId?: string | null;
            expiresAt?: string;
            reused?: boolean;
          } & ApiFailure
        >(routeUrl('fund'), { method: 'POST', body: { engagementId } });
        if (!ok) return apiFailure('Fund', status, data);

        return textResult(
          data.reused ? 'Fund transaction already built (reused, still unsigned).' : 'Fund transaction built.',
          `engagementId: ${data.engagementId}`,
          `contractId: ${data.contractId ?? '(none)'}`,
          `txHash: ${data.txHash}`,
          `expiresAt: ${data.expiresAt}`,
          `unsignedXdr: ${preview(data.unsignedXdr)}`,
          '',
          'Next: the guest signs it in their wallet in the app. Then diagnose-escrow shows confirmation.',
        );
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );

  /**
   * Orchestrate — stateless guide through the lifecycle. Never calls anything;
   * every step points at another tool or at what a person does in the app.
   */
  server.registerTool(
    'orchestrate-escrow',
    {
      title: 'Orchestrate escrow',
      description:
        'Step-by-step guide for the SafeTrust escrow lifecycle (apartment deposits and hotel reservations). ' +
        'Stateless: call with step="start", then pass the engagementId from deploy-escrow to resume.',
      inputSchema: {
        step: z.enum(['start', 'after-deploy', 'after-fund', 'status']).describe('Current step in the lifecycle'),
        apartmentId: z.string().uuid().optional().describe('Apartment being rented'),
        reservationId: z.string().uuid().optional().describe('Hotel reservation being paid'),
        senderAddress: stellarAddress.optional().describe("Guest's registered Stellar wallet"),
        engagementId: z.string().optional().describe('Resume key returned by deploy-escrow'),
      },
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async ({ step, apartmentId, reservationId, senderAddress, engagementId }) => {
      switch (step) {
        case 'start': {
          if (Boolean(apartmentId) === Boolean(reservationId) || !senderAddress) {
            return errorResult('For step=start, provide exactly one of apartmentId or reservationId, and senderAddress.');
          }
          const booking = apartmentId ? { apartmentId } : { reservationId };
          return textResult(
            '── Step 1: Check, then deploy ─────────────────────────────',
            '1. get-wallet-readiness with:',
            jsonBlock({ ...booking, ...(apartmentId ? { guestAddress: senderAddress } : {}) }),
            '2. deploy-escrow with:',
            jsonBlock({ ...booking, senderAddress }),
            '',
            'The guest signs the returned transaction in their wallet in the app.',
            'Then call orchestrate-escrow with step="after-deploy" and the engagementId.',
          );
        }
        case 'after-deploy':
          if (!engagementId) return errorResult('For step=after-deploy, provide engagementId.');
          return textResult(
            '── Step 2: Fund ──────────────────────────────────────────',
            `1. diagnose-escrow { engagementId: "${engagementId}" } must report the escrow as created.`,
            `2. fund-escrow { engagementId: "${engagementId}" } builds the fund transaction.`,
            '3. The guest signs it in their wallet in the app.',
            'Then call orchestrate-escrow with step="after-fund".',
          );
        case 'after-fund':
          return textResult(
            '── Step 3: Milestone and release ─────────────────────────',
            '1. The host marks the milestone complete (POST /api/escrow/milestone-status) and signs.',
            '2. The guest approves (POST /api/escrow/approve-milestone) and releases',
            '   (POST /api/escrow/release-funds), signing each in their wallet.',
            '',
            'At any point, diagnose-escrow explains where the booking stands.',
            '',
            escrowRolesDoc(),
          );
        case 'status':
          if (!engagementId) return errorResult('Provide engagementId to check status.');
          return textResult('Call diagnose-escrow (plain-language) or get-escrow-status (raw rows) with:', jsonBlock({ engagementId }));
      }
    },
  );

  /** Pure context — no network calls. */
  server.registerTool(
    'explain-escrow-roles',
    {
      title: 'Explain escrow roles',
      description:
        'Explain which wallet fills each Trustless Work role on a SafeTrust escrow, which role signs each ' +
        'action, the build route for each, and the engagement id formats.',
      inputSchema: {},
      annotations: { readOnlyHint: true, openWorldHint: false },
    },
    async () => textResult(escrowRolesDoc(), '', `apps/api base URL: ${SAFETRUST_API_URL}`),
  );
}
