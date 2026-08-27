import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('../../../services/hasura-ws.js', () => ({
  subscribeToEscrowStatus: vi.fn(),
}));

import { subscribeToEscrowStatus } from '../../../services/hasura-ws.js';
import { escrowStatusStreamHandler } from '../status-stream.handler.js';

function mockSseRes() {
  const chunks = [];
  const listeners = {};

  return {
    _chunks: chunks,
    _status: null,
    _body: undefined,
    setHeader: vi.fn(),
    flushHeaders: vi.fn(),
    write(chunk) {
      chunks.push(chunk);
    },
    status(code) {
      this._status = code;
      return this;
    },
    json(body) {
      this._body = body;
      return this;
    },
    on(event, cb) {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    },
    _emit(event) {
      (listeners[event] ?? []).forEach((cb) => cb());
    },
  };
}

function mockReq(query = {}) {
  const listeners = {};
  return {
    query,
    on(event, cb) {
      listeners[event] = listeners[event] ?? [];
      listeners[event].push(cb);
    },
    _emit(event) {
      (listeners[event] ?? []).forEach((cb) => cb());
    },
  };
}

describe('escrowStatusStreamHandler', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('returns 400 when contractId query param is missing', () => {
    const req = mockReq();
    const res = mockSseRes();

    escrowStatusStreamHandler(req, res);

    expect(res._status).toBe(400);
    expect(res._body).toMatchObject({ error: expect.stringContaining('contractId') });
    expect(subscribeToEscrowStatus).not.toHaveBeenCalled();
  });

  it('returns 400 when contractId is blank', () => {
    const req = mockReq({ contractId: '   ' });
    const res = mockSseRes();

    escrowStatusStreamHandler(req, res);

    expect(res._status).toBe(400);
    expect(subscribeToEscrowStatus).not.toHaveBeenCalled();
  });

  it('sets SSE headers and sends connected event when contractId is provided', () => {
    const cleanupMock = vi.fn();
    vi.mocked(subscribeToEscrowStatus).mockReturnValue(cleanupMock);

    const req = mockReq({ contractId: 'CAZT001' });
    const res = mockSseRes();

    escrowStatusStreamHandler(req, res);

    expect(res.setHeader).toHaveBeenCalledWith('Content-Type', 'text/event-stream');
    expect(res.setHeader).toHaveBeenCalledWith('Cache-Control', 'no-cache');
    expect(res.setHeader).toHaveBeenCalledWith('Connection', 'keep-alive');
    expect(res.setHeader).toHaveBeenCalledWith('X-Accel-Buffering', 'no');
    expect(res.flushHeaders).toHaveBeenCalled();
    expect(res._chunks[0]).toContain('event: connected');
    expect(subscribeToEscrowStatus).toHaveBeenCalledWith(
      'CAZT001',
      expect.any(Function),
      expect.any(Function),
    );
  });

  it('writes a status event when Hasura subscription pushes an escrow row', () => {
    let capturedOnData = null;
    vi.mocked(subscribeToEscrowStatus).mockImplementation((_id, onData) => {
      capturedOnData = onData;
      return vi.fn();
    });

    const req = mockReq({ contractId: 'CAZT001' });
    const res = mockSseRes();

    escrowStatusStreamHandler(req, res);

    const escrow = {
      id: '1',
      contract_id: 'CAZT001',
      status: 'funded',
      amount: 1200,
      updated_at: '2025-01-01T00:00:00Z',
    };

    capturedOnData({ escrows: [escrow] });

    const statusChunk = res._chunks.find((c) => c.includes('event: status'));
    expect(statusChunk).toBeDefined();
    expect(statusChunk).toContain(JSON.stringify(escrow));
  });

  it('does not write a status event when the subscription payload has no escrow', () => {
    let capturedOnData = null;
    vi.mocked(subscribeToEscrowStatus).mockImplementation((_id, onData) => {
      capturedOnData = onData;
      return vi.fn();
    });

    const req = mockReq({ contractId: 'CAZT001' });
    const res = mockSseRes();

    escrowStatusStreamHandler(req, res);
    capturedOnData({ escrows: [] });

    expect(res._chunks.some((c) => c.includes('event: status'))).toBe(false);
  });

  it('calls cleanup when client disconnects', () => {
    const cleanupMock = vi.fn();
    vi.mocked(subscribeToEscrowStatus).mockReturnValue(cleanupMock);

    const req = mockReq({ contractId: 'CAZT001' });
    const res = mockSseRes();

    escrowStatusStreamHandler(req, res);

    req._emit('close');

    expect(cleanupMock).toHaveBeenCalledTimes(1);
  });

  it('writes heartbeat events at 30-second intervals', () => {
    vi.useFakeTimers();
    vi.mocked(subscribeToEscrowStatus).mockReturnValue(vi.fn());

    const req = mockReq({ contractId: 'CAZT001' });
    const res = mockSseRes();

    escrowStatusStreamHandler(req, res);

    const initialChunks = res._chunks.length;
    vi.advanceTimersByTime(60_000);
    expect(res._chunks.length).toBe(initialChunks + 2);
    expect(res._chunks[initialChunks]).toContain('event: heartbeat');

    req._emit('close');
    vi.useRealTimers();
  });
});
