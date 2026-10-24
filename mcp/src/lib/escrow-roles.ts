import { PLATFORM_ADDRESS, USDC_ADDRESS } from '../config.js';

/**
 * SafeTrust's Trustless Work role mapping, for display only.
 *
 * apps/api owns the logic: routes/escrow/deploy.handler.ts sends the roles and
 * services/escrow-authz.ts decides which wallet must sign each action
 * (ACTION_ROLE, rolesFor). The MCP does not authorize anything; it only
 * explains. apps/api's mcp-contract test fails if these tables drift from
 * that code.
 */

/** Who fills each Trustless Work role on deploy: the guest (escrow sender), the host (receiver) or the platform. */
export const DEPLOY_ROLES = {
  approver: 'guest',
  serviceProvider: 'host',
  receiver: 'host',
  platformAddress: 'platform',
  releaseSigner: 'guest',
  disputeResolver: 'platform',
} as const;

/** Which role must sign each action (mirrors apps/api ACTION_ROLE). */
export const ACTION_SIGNER_ROLE = {
  initialize: 'approver',
  fund: 'approver',
  mark_milestone_completed: 'serviceProvider',
  approve_milestone: 'approver',
  release_funds: 'releaseSigner',
  resolve_dispute: 'disputeResolver',
} as const;

const ACTION_ROUTE: Record<keyof typeof ACTION_SIGNER_ROLE, string> = {
  initialize: 'POST /api/escrow/deploy',
  fund: 'POST /api/escrow/fund',
  mark_milestone_completed: 'POST /api/escrow/milestone-status',
  approve_milestone: 'POST /api/escrow/approve-milestone',
  release_funds: 'POST /api/escrow/release-funds',
  resolve_dispute: 'POST /api/escrow/resolve-dispute',
};

const ACTOR: Record<string, string> = {
  guest: 'Guest — escrow sender (`escrows.sender_address`)',
  host: 'Host — escrow receiver (`escrows.receiver_address`)',
  platform: 'SafeTrust platform — `PLATFORM_STELLAR_ADDRESS`',
};

export function escrowRolesDoc(): string {
  const platform = PLATFORM_ADDRESS ?? '(unset — PLATFORM_STELLAR_ADDRESS)';
  const roleOf = (role: string) =>
    Object.entries(DEPLOY_ROLES).find(([r]) => r === role)?.[1] ?? 'platform';

  return `# SafeTrust escrow roles (Trustless Work single-release)

\`apps/api\` is the only deploy path: \`POST /api/escrow/deploy\` takes
\`apartmentId\` **or** \`reservationId\` plus the guest's registered wallet, derives
the host wallet and the amount server-side, and sends these roles:

| Trustless Work role | Filled by |
|---|---|
${Object.entries(DEPLOY_ROLES)
  .map(([role, actor]) => `| \`${role}\` | ${ACTOR[actor]} |`)
  .join('\n')}

Platform wallet: ${platform}. \`platformFee\` is 0. The escrow carries a USDC
trustline, issuer \`${USDC_ADDRESS}\` (\`USDC_TRUSTLINE_ADDRESS\`).

## Who signs what

\`apps/api\` builds every transaction for the caller's own registered wallet
(\`services/escrow-authz.ts\`): the wallet must hold the role below, or the build
route answers \`403 WALLET_NOT_AUTHORIZED\`. The unsigned XDR is recorded in
\`escrow_pending_actions\` under its hash, and \`POST /api/escrow/send-transaction\`
only accepts a signed XDR whose hash matches a row built for the same user.

| Action | Signing role | Signer | Build route |
|---|---|---|---|
${Object.entries(ACTION_SIGNER_ROLE)
  .map(([action, role]) => `| \`${action}\` | \`${role}\` | ${ACTOR[roleOf(role)].split(' — ')[0]} | ${ACTION_ROUTE[action as keyof typeof ACTION_ROUTE]} |`)
  .join('\n')}

\`resolve_dispute\` also requires the admin role at the route.

## Engagement ids

- Apartment deposit: \`rental:<apartmentId>:<guestFirebaseUid>\`
- Hotel reservation: \`hotel:<reservationId>\``;
}
