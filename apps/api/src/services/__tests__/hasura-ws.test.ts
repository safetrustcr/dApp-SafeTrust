import { beforeEach, describe, expect, it, vi } from 'vitest';

const { MockWebSocket } = vi.hoisted(() => {
  class MockWebSocket {
    static instances: MockWebSocket[] = [];
    url: string;
    protocol: string;
    sent: unknown[] = [];
    closed = false;
    handlers: Record<string, (arg?: unknown) => void> = {};

    constructor(url: string, protocol: string) {
      this.url = url;
      this.protocol = protocol;
      MockWebSocket.instances.push(this);
    }

    on(event: string, cb: (arg?: unknown) => void) {
      this.handlers[event] = cb;
    }

    send(data: string) {
      this.sent.push(JSON.parse(data));
    }

    close() {
      this.closed = true;
    }

    emit(event: string, arg?: unknown) {
      this.handlers[event]?.(arg);
    }
  }

  return { MockWebSocket };
});

vi.mock('ws', () => ({ default: MockWebSocket }));

import { subscribeToEscrowStatus } from '../hasura-ws.js';

describe('subscribeToEscrowStatus', () => {
  beforeEach(() => {
    MockWebSocket.instances = [];
    process.env.HASURA_GRAPHQL_WS_URL = 'ws://hasura.test/v1/graphql';
    process.env.HASURA_ADMIN_SECRET = 'test-secret';
    delete process.env.HASURA_GRAPHQL_ADMIN_SECRET;
  });

  it('opens a graphql-ws socket and inits with the admin secret', () => {
    subscribeToEscrowStatus('CAZT001', vi.fn(), vi.fn());

    expect(MockWebSocket.instances).toHaveLength(1);
    const ws = MockWebSocket.instances[0]!;
    expect(ws.url).toBe('ws://hasura.test/v1/graphql');
    expect(ws.protocol).toBe('graphql-ws');

    ws.emit('open');
    expect(ws.sent[0]).toEqual({
      type: 'connection_init',
      payload: { headers: { 'x-hasura-admin-secret': 'test-secret' } },
    });
  });

  it('subscribes to escrows by contract_id after connection_ack', () => {
    subscribeToEscrowStatus('CAZT001', vi.fn(), vi.fn());
    const ws = MockWebSocket.instances[0]!;

    ws.emit('open');
    ws.emit('message', Buffer.from(JSON.stringify({ type: 'connection_ack' })));

    const subscribe = (ws.sent as { type: string }[]).find((m) => m.type === 'subscribe') as {
      id: string;
      type: string;
      payload: { query: string; variables: { contractId: string } };
    };
    expect(subscribe.id).toBe('sub-1');
    expect(subscribe.payload.variables).toEqual({ contractId: 'CAZT001' });
    expect(subscribe.payload.query).toContain('escrows');
    expect(subscribe.payload.query).toContain('amount');
    expect(subscribe.payload.query).not.toContain('trustless_work_escrows');
  });

  it('forwards next payloads to onData', () => {
    const onData = vi.fn();
    subscribeToEscrowStatus('CAZT001', onData, vi.fn());
    const ws = MockWebSocket.instances[0]!;

    const payload = {
      escrows: [
        {
          id: '1',
          contract_id: 'CAZT001',
          status: 'funded',
          amount: 950,
          updated_at: '2026-01-01T00:00:00Z',
        },
      ],
    };

    ws.emit(
      'message',
      Buffer.from(JSON.stringify({ type: 'next', id: 'sub-1', payload: { data: payload } })),
    );

    expect(onData).toHaveBeenCalledWith(payload);
  });

  it('does not call onData when a next frame has no data', () => {
    const onData = vi.fn();
    subscribeToEscrowStatus('CAZT001', onData, vi.fn());
    const ws = MockWebSocket.instances[0]!;

    ws.emit('message', Buffer.from(JSON.stringify({ type: 'next', id: 'sub-1', payload: {} })));

    expect(onData).not.toHaveBeenCalled();
  });

  it('completes the subscription and closes the socket on cleanup', () => {
    const cleanup = subscribeToEscrowStatus('CAZT001', vi.fn(), vi.fn());
    const ws = MockWebSocket.instances[0]!;

    cleanup();

    expect(ws.sent).toContainEqual({ id: 'sub-1', type: 'complete' });
    expect(ws.closed).toBe(true);
  });
});
