import WebSocket from 'ws';

export type EscrowStatus = {
  id: string;
  contract_id: string;
  status: string;
  amount: number;
  updated_at: string;
};

export type EscrowStatusPayload = {
  escrows: EscrowStatus[];
};

const SUBSCRIPTION_QUERY = `
  subscription EscrowStatus($contractId: String!) {
    escrows(where: { contract_id: { _eq: $contractId } }, limit: 1) {
      id
      contract_id
      status
      amount
      updated_at
    }
  }
`;

function adminSecret(): string | undefined {
  return process.env.HASURA_ADMIN_SECRET ?? process.env.HASURA_GRAPHQL_ADMIN_SECRET;
}

/**
 * Opens a Hasura graphql-ws subscription for one escrow and forwards payloads to onData.
 */
export function subscribeToEscrowStatus(
  contractId: string,
  onData: (data: EscrowStatusPayload) => void,
  onError: (error: Error) => void,
): () => void {
  const wsUrl = process.env.HASURA_GRAPHQL_WS_URL ?? 'ws://localhost:8080/v1/graphql';
  const ws = new WebSocket(wsUrl, 'graphql-ws');
  const subId = 'sub-1';
  let isClosed = false;

  ws.on('open', () => {
    ws.send(
      JSON.stringify({
        type: 'connection_init',
        payload: {
          headers: { 'x-hasura-admin-secret': adminSecret() },
        },
      }),
    );
  });

  ws.on('message', (raw) => {
    let msg: {
      type: string;
      id?: string;
      payload?: { data?: EscrowStatusPayload; errors?: { message: string }[] };
    };
    try {
      msg = JSON.parse(raw.toString());
    } catch {
      return;
    }

    if (msg.type === 'ping') {
      ws.send(JSON.stringify({ type: 'pong', payload: msg.payload }));
      return;
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

    if ((msg.type === 'next' || msg.type === 'data') && msg.payload?.data) {
      onData(msg.payload.data);
    }

    if (msg.type === 'error') {
      const detail =
        msg.payload?.errors?.map((e) => e.message).join(', ') ?? 'Unknown Hasura error';
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
      // socket may already be closed
    }
    ws.close();
  };
}
