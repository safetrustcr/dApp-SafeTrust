import { afterEach, describe, expect, it } from 'vitest';

import { loadFresh, restoreEnv } from '../helpers/env.js';

type RedactModule = typeof import('../../src/lib/redact.js');
type ResponseModule = typeof import('../../src/lib/response.js');

const WALLET = 'GAOQJGUAB7NI7K7I62ORBXMN3J4HOUX3CB2IA7V6M6YVBN5UCDJUR6Z6';
const XDR = `AAAAAgAAAA${'B'.repeat(1200)}==`;

function loadRedact(env: Record<string, string | undefined> = {}): Promise<RedactModule> {
  return loadFresh<RedactModule>(
    { SAFETRUST_MCP_SHOW_FULL_IDS: undefined, ...env },
    () => import('../../src/lib/redact.js'),
  );
}

function loadResponse(): Promise<ResponseModule> {
  return loadFresh<ResponseModule>(
    { SAFETRUST_MCP_SHOW_FULL_IDS: undefined },
    () => import('../../src/lib/response.js'),
  );
}

afterEach(restoreEnv);

describe('redactText', () => {
  it('shortens Stellar addresses to GABC…WXYZ', async () => {
    const { redactText } = await loadRedact();

    expect(redactText(`guest wallet ${WALLET}.`)).toBe('guest wallet GAOQ…R6Z6.');
  });

  it('shows full addresses only with SAFETRUST_MCP_SHOW_FULL_IDS=true', async () => {
    const { redactText } = await loadRedact({ SAFETRUST_MCP_SHOW_FULL_IDS: 'true' });

    expect(redactText(WALLET)).toBe(WALLET);
  });

  it('masks emails to the first character and the domain', async () => {
    const { redactText } = await loadRedact();

    expect(redactText('owner: jane.doe@example.com')).toBe('owner: j***@example.com');
  });

  it('masks phone numbers to their last four digits', async () => {
    const { redactText } = await loadRedact();

    expect(redactText('call +506 8888-1234')).toBe('call ***1234');
    expect(redactText('call (555) 867-5309')).toBe('call ***5309');
  });

  it('leaves UUIDs, amounts, hashes and timestamps intact', async () => {
    const { redactText } = await loadRedact();
    const text =
      'id 123e4567-e89b-12d3-a456-426614174000 amount 1500000000 price 1250.50 ' +
      'at 2026-10-28T12:00:00Z on 2026-10-28 tx 3f2a9c81d4e5b6a70011223344556677';

    expect(redactText(text)).toBe(text);
  });

  it('replaces long base64 blobs with their size', async () => {
    const { redactText } = await loadRedact();

    expect(redactText(`xdr: ${XDR}`)).toBe('xdr: <xdr 1.2 KB>');
  });

  it('keeps the blob for the build tools that are meant to return an unsigned XDR', async () => {
    const { redactText } = await loadRedact();

    expect(redactText(XDR, { allowUnsignedXdr: true })).toBe(XDR);
  });
});

describe('structured redaction', () => {
  it('masks phone fields by key, including bare digit strings', async () => {
    const { redactPhoneFields } = await loadRedact();

    expect(redactPhoneFields({ user: { phone_number: '50688881234', name: 'Ana' } })).toEqual({
      user: { phone_number: '***1234', name: 'Ana' },
    });
  });

  it('withholds XDR-looking keys and values', async () => {
    const { redactXdr, REDACTED_XDR } = await loadRedact();

    expect(redactXdr({ unsigned_xdr: 'anything', nested: [XDR], status: 'funded' })).toEqual({
      unsigned_xdr: REDACTED_XDR,
      nested: [REDACTED_XDR],
      status: 'funded',
    });
  });
});

describe('errorMessageOnly', () => {
  it('keeps the first line of an upstream error, without the stack', async () => {
    const { errorMessageOnly } = await loadRedact();

    expect(errorMessageOnly('Escrow not found.\n    at handler (/app/src/routes/escrow.ts:42:7)')).toBe(
      'Escrow not found.',
    );
  });

  it('caps long messages and falls back for non-strings', async () => {
    const { errorMessageOnly } = await loadRedact();

    expect(errorMessageOnly('x'.repeat(500))).toHaveLength(201);
    expect(errorMessageOnly({ stack: 'boom' })).toBe('unknown error');
  });
});

describe('tool responses', () => {
  it('redacts every text and JSON result before it is returned', async () => {
    const { textResult, jsonBlock } = await loadResponse();

    const result = textResult(
      `wallet ${WALLET}`,
      jsonBlock({ email: 'jane@example.com', phone: '88881234', unsignedXdr: XDR }),
    );
    const text = result.content.map((block) => (block.type === 'text' ? block.text : '')).join('\n');

    expect(text).toContain('wallet GAOQ…R6Z6');
    expect(text).toContain('"email": "j***@example.com"');
    expect(text).toContain('"phone": "***1234"');
    expect(text).not.toContain(WALLET);
    expect(text).not.toContain(XDR);
  });

  it('never surfaces an unexpected error message, stack or header', async () => {
    const { describeError, errorResult } = await loadResponse();
    const upstream = new Error('SELECT * FROM users WHERE x-hasura-admin-secret = hunter2');

    const result = errorResult(describeError(upstream));
    const text = result.content.map((block) => (block.type === 'text' ? block.text : '')).join('\n');

    expect(result.isError).toBe(true);
    expect(text).toBe('Request failed. Check MCP configuration and local service status.');
  });
});
