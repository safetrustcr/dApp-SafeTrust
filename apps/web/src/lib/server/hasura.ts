const HASURA_INSERT_ESCROW = `
  mutation InsertEscrow($object: escrows_insert_input!) {
    insert_escrows_one(object: $object) {
      id
      engagement_id
      contract_id
      status
    }
  }
`;

const HASURA_UPDATE_ESCROW_STATUS = `
  mutation UpdateEscrowStatus($engagementId: String!, $status: String!) {
    update_escrows(
      where: { engagement_id: { _eq: $engagementId } }
      _set: { status: $status }
    ) {
      affected_rows
      returning {
        id
        engagement_id
        status
      }
    }
  }
`;

function getHasuraConfig() {
  const url = process.env.HASURA_GRAPHQL_URL ?? process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL;
  const adminSecret = process.env.HASURA_GRAPHQL_ADMIN_SECRET;

  if (!url) {
    throw new Error('Missing HASURA_GRAPHQL_URL');
  }

  if (!adminSecret) {
    throw new Error('Missing HASURA_GRAPHQL_ADMIN_SECRET');
  }

  return { url, adminSecret };
}

async function hasuraRequest<T>(query: string, variables: Record<string, unknown>) {
  const { url, adminSecret } = getHasuraConfig();
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': adminSecret,
    },
    body: JSON.stringify({ query, variables }),
    cache: 'no-store',
  });

  const payload = await response.json().catch(() => null);
  if (!response.ok || payload?.errors) {
    console.error('[hasura] request failed', {
      status: response.status,
      errors: payload?.errors ?? payload,
    });
    throw new Error(`Hasura request failed (status ${response.status})`);
  }

  return payload.data as T;
}

export async function insertEscrowRecord(input: {
  contractId: string;
  engagementId: string;
  propertyId: string;
  senderAddress: string;
  receiverAddress: string;
  amount: number;
  status: string;
  unsignedXdr?: string;
}) {
  return hasuraRequest<{ insert_escrows_one: { id: string; engagement_id: string; contract_id: string; status: string } }>(
    HASURA_INSERT_ESCROW,
    {
      object: {
        contract_id: input.contractId,
        engagement_id: input.engagementId,
        property_id: input.propertyId,
        sender_address: input.senderAddress,
        receiver_address: input.receiverAddress,
        amount: input.amount,
        status: input.status,
        unsigned_xdr: input.unsignedXdr,
      },
    },
  );
}

export async function updateEscrowStatus(engagementId: string, status: string) {
  return hasuraRequest<{ update_escrows: { affected_rows: number; returning: Array<{ id: string; engagement_id: string; status: string }> } }>(
    HASURA_UPDATE_ESCROW_STATUS,
    { engagementId, status },
  );
}