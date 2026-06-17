const HASURA_URL = process.env.NEXT_PUBLIC_HASURA_GRAPHQL_URL ?? 'http://localhost:8080/v1/graphql';
const HASURA_ADMIN_SECRET = process.env.NEXT_PUBLIC_HASURA_ADMIN_SECRET ?? '';

async function hasuraRequest<T>(query: string, variables: Record<string, unknown>): Promise<T> {
  const response = await fetch(HASURA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-hasura-admin-secret': HASURA_ADMIN_SECRET,
    },
    body: JSON.stringify({ query, variables }),
  });

  const json = (await response.json()) as { data?: T; errors?: { message: string }[] };

  if (json.errors?.length) {
    throw new Error(json.errors.map((e) => e.message).join(', '));
  }

  return json.data as T;
}

type InsertEscrowInput = {
  contractId: string;
  engagementId: string;
  propertyId: string;
  senderAddress: string;
  receiverAddress: string;
  amount: number;
  status: string;
};

type InsertEscrowResult = {
  insert_escrows_one: { id: string };
};

export async function insertEscrowRecord(input: InsertEscrowInput): Promise<InsertEscrowResult> {
  return hasuraRequest<InsertEscrowResult>(
    `mutation InsertEscrow(
      $contract_id: String!
      $engagement_id: String!
      $property_id: uuid!
      $sender_address: String!
      $receiver_address: String!
      $amount: numeric!
      $status: String!
    ) {
      insert_escrows_one(object: {
        contract_id: $contract_id
        engagement_id: $engagement_id
        property_id: $property_id
        sender_address: $sender_address
        receiver_address: $receiver_address
        amount: $amount
        status: $status
      }) {
        id
      }
    }`,
    {
      contract_id: input.contractId,
      engagement_id: input.engagementId,
      property_id: input.propertyId,
      sender_address: input.senderAddress,
      receiver_address: input.receiverAddress,
      amount: input.amount,
      status: input.status,
    },
  );
}

type UpdateEscrowStatusResult = {
  update_escrows: { affected_rows: number };
};

export async function updateEscrowStatus(
  engagementId: string,
  status: string,
): Promise<UpdateEscrowStatusResult> {
  return hasuraRequest<UpdateEscrowStatusResult>(
    `mutation UpdateEscrowStatus($engagement_id: String!, $status: String!) {
      update_escrows(
        where: { engagement_id: { _eq: $engagement_id } }
        _set: { status: $status }
      ) {
        affected_rows
      }
    }`,
    { engagement_id: engagementId, status },
  );
}
