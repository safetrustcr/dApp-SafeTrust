import WebSocket from 'ws';

/** Shape of a single escrow record returned by the subscription. */
export type EscrowStatusPayload = {
  id: string;
  contract_id: string;
  status: string;
  balance: number;
  updated_at: string;
};

type SubscriptionData = {
  trustless_work_escrows: EscrowStatusPayload[];
};

type SubscriptionCallback = (escrow: EscrowStatusPayload) => void;
type ErrorCallback = (error: Error) => void;

/** Returned by subscribeToEscrowStatus — call it to stop the subscription. */
export type SubscriptionCleanup = () => void;

const HASURA_WS_URL =
  process.env.HASURA_GRAPHQL_WS_URL ?? 'ws://localhost:8080/v1/graphql';

/**
 * GraphQL subscription that streams status changes for a single escrow.
 * Hasura maps `trustless_work_escrows(where: …, limit: 1)` onto
 * the alias key used in the response data.
 */
const SUBSCRIPTION_QUERY = `
  subscription EscrowStatusStream($contractId: String!) {
    trustless_work_escrows(
      where: { contract_id: { _eq: $contractId } }
      limit: 1
    ) {
      id
      contract_id
      status
      balance
      updated_at
    }
  }
`;

/**
 * Opens a Hasura WebSocket subscription (graphql-ws protocol) for the given
 * contractId and calls onData whenever the escrow row changes.
 *
 * @returns A cleanup function that closes the WebSocket when called.
 */
export function subscribeToEscrowStatus(
  contractId: string,
  onData: SubscriptionCallback,
  onError: ErrorCallback,
): SubscriptionCleanup {
  const ws = new WebSocket(HASURA_WS_URL, 'graphql-ws');
  const subId = 'sub-1';
  let isClosed = false;

  ws.on('open', () => {
    ws.send(
      JSON.stringify({
        type: 'connection_init',
        payload: {
          headers: {
            'x-hasura-admin-secret':
              process.env.HASURA_ADMIN_SECRET ?? 'myadminsecretkey',
          },
        },
      }),
    );
  });

  ws.on('message', (raw) => {
    let msg: { type: string; id?: string; payload?: { data?: SubscriptionData; errors?: { message: string }[] } };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return; // ignore malformed frames
    }

    if (msg.type === 'connection_ack') {
      ws.send(
        JSON.stringify({
          id: subId,
          type: 'subscribe',
          payload: {
            query: SUBSCRIPTION_QUERY,
            variables: { contractId },
          },
        }),
      );
    }

    if (msg.type === 'next' && msg.id === subId) {
      const escrow = msg.payload?.data?.trustless_work_escrows?.[0];
      if (escrow) {
        onData(escrow);
      }
    }

    if (msg.type === 'error') {
      const detail = msg.payload?.errors?.map((e) => e.message).join(', ') ?? 'Unknown Hasura error';
      onError(new Error(detail));
    }
  });

  ws.on('error', (err) => {
    if (!isClosed) {
      onError(err instanceof Error ? err : new Error(String(err)));
    }
  });

  return () => {
    isClosed = true;
    try {
      ws.send(JSON.stringify({ id: subId, type: 'complete' }));
    } catch {
      // socket may already be closed; safe to ignore
    }
    ws.close();
  };
}
