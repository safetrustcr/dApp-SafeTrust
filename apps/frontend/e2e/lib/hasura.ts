/**
 * Admin reads and fixtures in the local SafeTrust Hasura.
 *
 * The specs read SafeTrust's own view of the escrow straight from the
 * database (escrows.status and the check_in milestone) so a wrong status is
 * caught even when the UI would hide it.
 */

import { e2eConfig } from "./env";

export async function hasura<T>(query: string, variables: Record<string, unknown> = {}): Promise<T> {
  const cfg = e2eConfig();
  const res = await fetch(cfg.hasuraUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json", "x-hasura-admin-secret": cfg.hasuraAdminSecret },
    body: JSON.stringify({ query, variables }),
    signal: AbortSignal.timeout(15_000),
  });
  if (!res.ok) throw new Error(`[hasura] HTTP ${res.status}`);
  const json = (await res.json()) as { data?: T; errors?: Array<{ message: string }> };
  if (json.errors?.length) throw new Error(`[hasura] ${json.errors[0].message}`);
  return json.data as T;
}

/**
 * One escrow is allowed per apartment and guest (engagement id
 * `rental:<apartmentId>:<guestUid>`), so every spec run books a fresh
 * apartment owned by the provisioned host. The small deposit keeps the run
 * cheap in faucet USDC.
 */
export async function createRunApartment(hostUid: string, hostWallet: string, label: string): Promise<string> {
  const { depositUsdc } = e2eConfig();
  const data = await hasura<{ insert_apartments_one: { id: string } }>(
    `mutation E2EApartment(
      $ownerId: String!, $name: String!, $deposit: numeric!,
      $address: jsonb!, $availableFrom: timestamptz!, $coordinates: point!
    ) {
      insert_apartments_one(object: {
        owner_id: $ownerId
        name: $name
        description: "Created by the SafeTrust testnet E2E suite."
        price: 1
        warranty_deposit: $deposit
        coordinates: $coordinates
        address: $address
        is_available: true
        available_from: $availableFrom
        image_urls: ["https://example.com/testnet-demo.jpg"]
      }) { id }
    }`,
    {
      ownerId: hostUid,
      name: `E2E ${label} ${new Date().toISOString()}`,
      deposit: depositUsdc,
      coordinates: "(-84.0807,9.9282)",
      address: { line1: "Testnet Lane 1", city: "San José", country: "CR", ownerWallet: hostWallet },
      availableFrom: new Date(Date.now() - 60_000).toISOString(),
    },
  );
  return data.insert_apartments_one.id;
}

export type SafeTrustEscrowState = {
  status: string | null;
  contractId: string | null;
  amount: number | null;
  milestoneStatus: string | null;
};

export async function getSafeTrustEscrow(engagementId: string): Promise<SafeTrustEscrowState> {
  const data = await hasura<{
    escrows: Array<{ status: string; contract_id: string | null; amount: string | number }>;
  }>(
    `query E2EEscrow($engagementId: String!) {
      escrows(where: { engagement_id: { _eq: $engagementId } }, limit: 1) { status contract_id amount }
    }`,
    { engagementId },
  );
  const escrow = data.escrows[0];
  if (!escrow) return { status: null, contractId: null, amount: null, milestoneStatus: null };

  let milestoneStatus: string | null = null;
  if (escrow.contract_id) {
    const ms = await hasura<{
      trustlessWorkEscrows: Array<{ milestones: Array<{ milestoneId: string; status: string }> }>;
    }>(
      `query E2EMilestones($contractId: String!) {
        trustlessWorkEscrows(where: { contractId: { _eq: $contractId } }, limit: 1) {
          milestones { milestoneId status }
        }
      }`,
      { contractId: escrow.contract_id },
    );
    milestoneStatus =
      ms.trustlessWorkEscrows[0]?.milestones.find((m) => m.milestoneId === "check_in")?.status ?? null;
  }

  return {
    status: escrow.status,
    contractId: escrow.contract_id,
    amount: Number(escrow.amount),
    milestoneStatus,
  };
}

/** Polls SafeTrust until the escrow (and optionally its milestone) reaches the expected status. */
export async function waitForSafeTrustStatus(
  engagementId: string,
  expected: { status: string; milestoneStatus?: string },
  timeoutMs = 60_000,
): Promise<SafeTrustEscrowState> {
  const deadline = Date.now() + timeoutMs;
  let last: SafeTrustEscrowState | null = null;
  while (Date.now() < deadline) {
    last = await getSafeTrustEscrow(engagementId);
    if (
      last.status === expected.status &&
      (expected.milestoneStatus === undefined || last.milestoneStatus === expected.milestoneStatus)
    ) {
      return last;
    }
    await new Promise((r) => setTimeout(r, 2_000));
  }
  throw new Error(
    `[safetrust] escrow ${engagementId} did not reach ${JSON.stringify(expected)}. Last: ${JSON.stringify(last)}`,
  );
}
