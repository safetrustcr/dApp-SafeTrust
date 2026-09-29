import { executeGraphQL } from '../lib/hasura.js';

export type EscrowRole = "approver" | "serviceProvider" | "releaseSigner" | "disputeResolver";
export type EscrowAction = "initialize" | "fund" | "mark_milestone_completed" | "approve_milestone" | "release_funds" | "resolve_dispute";

const ACTION_ROLE: Record<EscrowAction, EscrowRole> = {
  initialize:               "approver",
  fund:                     "approver",
  mark_milestone_completed: "serviceProvider",
  approve_milestone:        "approver",
  release_funds:            "releaseSigner",
  resolve_dispute:          "disputeResolver",
};

export class ForbiddenError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ForbiddenError";
  }
}

async function getUserWallets(uid: string): Promise<string[]> {
  const data = await executeGraphQL<{ user_wallets: Array<{ wallet_address: string }> }>(
    `query ($uid: String!) { user_wallets(where: { user_id: { _eq: $uid } }) { wallet_address } }`,
    { uid }
  );
  return data.user_wallets.map(w => w.wallet_address);
}

async function getEscrowRoles(engagementId: string): Promise<{ roles: Record<string, string> }> {
  // Mock fetching from DB for now
  return {
    roles: {
      approver: "GAPPROVER...",
      serviceProvider: "GPROVIDER...",
      releaseSigner: "GRELEASE...",
      disputeResolver: "GDISPUTE..."
    }
  };
}

export async function authorizeEscrowAction(uid: string, engagementId: string, action: EscrowAction) {
  const wallets = await getUserWallets(uid);
  const escrow  = await getEscrowRoles(engagementId);
  const required = escrow.roles[ACTION_ROLE[action]];
  if (!wallets.includes(required)) {
    throw new ForbiddenError(`Your wallet is not the ${ACTION_ROLE[action]} for this escrow`);
  }
  return { signer: required, escrow };
}
