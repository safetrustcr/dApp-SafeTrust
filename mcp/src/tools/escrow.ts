import { randomUUID } from 'node:crypto';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { z } from 'zod';

import { getSafetrustApiUrl, mutationsEnabled, STELLAR_ADDRESS_REGEX } from '../config.js';
import { apiRequest } from '../lib/api.js';
import { routeUrl } from '../lib/api-contract.js';
import { auditToolCall } from '../lib/audit.js';
import { escrowRolesDoc } from '../lib/escrow-roles.js';
import { describeError, errorResult, jsonBlock, textResult, textResultWithOptions } from '../lib/response.js';

const stellarAddress = z
  .string()
  .regex(STELLAR_ADDRESS_REGEX, 'Must be a Stellar public key (G…, 56 chars)');

async function mutationGuard(): Promise<string | undefined> {
  if (!mutationsEnabled()) {
    return 'Escrow mutations are disabled. Set SAFETRUST_MCP_ALLOW_MUTATIONS=true to enable them for a Testnet test user.';
  }

  const health = await apiRequest<{ stellarNetwork?: string }>(routeUrl('health'));
  if (!health.ok) {
    return `Cannot verify the API network (HTTP ${health.status}); escrow mutations are refused.`;
  }
  if (health.data.stellarNetwork !== 'TESTNET') {
    return 'Escrow mutations require apps/api to report stellarNetwork=TESTNET; no mutation was sent.';
  }
}

/**
 * apps/api answers errors as RFC 7807 problem details ({ type, title, detail })
 * from ApiError, or as { error, code? } from the auth middleware.
 */
export type ApiFailure = { error?: string; code?: string; detail?: string; title?: string; type?: string };

export function apiFailure(action: string, status: number, data: ApiFailure, idempotencyKey?: string) {
  const code = data.code ?? data.type?.split('/').pop()?.replace(/-/g, '_').toUpperCase();
  const message = data.detail ?? data.error ?? data.title ?? 'unknown error';
  const lines = [`${action} failed (HTTP ${status}${code ? ` ${code}` : ''}): ${message}`];
  if (idempotencyKey) lines.push(`idempotencyKey: ${idempotencyKey}`);
  if (status === 401) {
    lines.push(
      '',
      'apps/api rejected the configured Firebase test user. Check SAFETRUST_MCP_FIREBASE_API_KEY,',
      'SAFETRUST_MCP_TEST_EMAIL and SAFETRUST_MCP_TEST_PASSWORD (mcp/README.md#configuration).',
    );
  }
  return errorResult(...lines);
}

export function registerEscrowTools(server: McpServer) {
  /**
   * Deploy — POST /api/escrow/deploy, signed in as the local test user. apps/api
   * derives the host wallet and the amount from the apartment or reservation,
   * and the engagement id from the booking, so the MCP only passes the booking
   * and the guest wallet. The TrustlessWork API key stays server-side.
   */
  server.registerTool(
    'deploy-escrow',
    {
      title: 'Deploy escrow',
      description:
        'Build the unsigned Testnet deploy (initialize) transaction for an apartment deposit or a hotel ' +
        'reservation through apps/api POST /api/escrow/deploy, as the configured local test user. Pass ' +
        "exactly one of apartmentId or reservationId, plus the guest's registered wallet. Returns an " +
        'unsigned XDR only. Disabled unless SAFETRUST_MCP_ALLOW_MUTATIONS=true.',
      inputSchema: {
        apartmentId: z.string().uuid().optional().describe('Apartment being rented (deposit escrow)'),
        reservationId: z.string().uuid().optional().describe('Hotel reservation being paid'),
        senderAddress: stellarAddress.describe("Guest's registered Stellar wallet (approver and release signer)"),
        idempotencyKey: z.string().uuid().optional().describe('UUID reused to safely retry this request'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ apartmentId, reservationId, senderAddress, idempotencyKey }) => {
      auditToolCall('deploy-escrow');
      if (Boolean(apartmentId) === Boolean(reservationId)) {
        return errorResult('Provide exactly one of apartmentId or reservationId.');
      }
      try {
        const blocked = await mutationGuard();
        if (blocked) return errorResult(blocked);

        const key = idempotencyKey ?? randomUUID();
        const { ok, status, data } = await apiRequest<
          {
            status?: string;
            engagementId?: string;
            contractId?: string;
            unsignedXDR?: string;
            pendingActionId?: string;
            cached?: boolean;
          } & ApiFailure
        >(routeUrl('deploy'), {
          method: 'POST',
          body: apartmentId ? { apartmentId, senderAddress } : { reservationId, senderAddress },
          auth: 'required',
          idempotencyKey: key,
        });
        if (!ok) return apiFailure('Deploy', status, data, key);

        if (data.cached && !data.unsignedXDR) {
          return textResult(
            'Already deployed for this booking (idempotent replay).',
            `idempotencyKey: ${key}`,
            `engagementId: ${data.engagementId}`,
            `contractId: ${data.contractId ?? 'unknown'}`,
            '',
            'Next: diagnose-escrow with this engagementId.',
          );
        }
        return textResultWithOptions(
          { allowUnsignedXdr: true },
          data.cached
            ? 'Deploy transaction already built and still waiting for a signature.'
            : 'Unsigned Testnet escrow deployment built.',
          `idempotencyKey: ${key}`,
          `status: ${data.status ?? 'not returned'}`,
          `engagementId: ${data.engagementId ?? 'not returned'}`,
          `contractId: ${data.contractId ?? '(assigned on chain)'}`,
          `pendingActionId: ${data.pendingActionId ?? 'not returned'}`,
          `unsignedXDR: ${data.unsignedXDR ?? 'not returned'}`,
          '',
          'Next: the guest signs it in their wallet; the frontend submits it to',
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
        'Build the unsigned Testnet fund transaction for a deployed escrow through apps/api ' +
        "POST /api/escrow/fund, as the configured local test user. apps/api takes the signer (the guest's " +
        'approver wallet) and the amount from the escrow record. Returns an unsigned XDR only. ' +
        'Disabled unless SAFETRUST_MCP_ALLOW_MUTATIONS=true.',
      inputSchema: {
        engagementId: z.string().min(1).describe('rental:<apartmentId>:<guestUid> or hotel:<reservationId>'),
        idempotencyKey: z.string().uuid().optional().describe('UUID reused to safely retry this request'),
      },
      annotations: { readOnlyHint: false, destructiveHint: false },
    },
    async ({ engagementId, idempotencyKey }) => {
      auditToolCall('fund-escrow');
      try {
        const blocked = await mutationGuard();
        if (blocked) return errorResult(blocked);

        const key = idempotencyKey ?? randomUUID();
        const { ok, status, data } = await apiRequest<
          {
            unsignedXdr?: string;
            pendingActionId?: string;
            txHash?: string;
            engagementId?: string;
            contractId?: string | null;
            expiresAt?: string;
            reused?: boolean;
          } & ApiFailure
        >(routeUrl('fund'), {
          method: 'POST',
          body: { engagementId },
          auth: 'required',
          idempotencyKey: key,
        });
        if (!ok) return apiFailure('Fund', status, data, key);

        return textResultWithOptions(
          { allowUnsignedXdr: true },
          data.reused
            ? 'Fund transaction already built (reused, still unsigned).'
            : 'Unsigned Testnet funding transaction built.',
          `idempotencyKey: ${key}`,
          `engagementId: ${data.engagementId ?? engagementId}`,
          `contractId: ${data.contractId ?? '(none)'}`,
          `pendingActionId: ${data.pendingActionId ?? 'not returned'}`,
          `txHash: ${data.txHash ?? 'not returned'}`,
          `expiresAt: ${data.expiresAt ?? 'not returned'}`,
          `unsignedXDR: ${data.unsignedXdr ?? 'not returned'}`,
          '',
          'Next: the guest signs it in their wallet. Then diagnose-escrow shows confirmation.',
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
      auditToolCall('orchestrate-escrow');
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
            'The guest signs the returned transaction in their wallet.',
            'Then call orchestrate-escrow with step="after-deploy" and the engagementId.',
          );
        }
        case 'after-deploy':
          if (!engagementId) return errorResult('For step=after-deploy, provide engagementId.');
          return textResult(
            '── Step 2: Fund ──────────────────────────────────────────',
            `1. diagnose-escrow { engagementId: "${engagementId}" } must report the escrow as created.`,
            `2. fund-escrow { engagementId: "${engagementId}" } builds the fund transaction.`,
            '3. The guest signs it in their wallet.',
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
    async () => {
      auditToolCall('explain-escrow-roles');
      try {
        return textResult(escrowRolesDoc(), '', `apps/api base URL: ${getSafetrustApiUrl()}`);
      } catch (error) {
        return errorResult(describeError(error));
      }
    },
  );
}
