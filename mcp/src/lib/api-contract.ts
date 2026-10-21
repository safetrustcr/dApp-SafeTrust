/**
 * Every apps/api route the MCP calls, with the request fields it sends and the
 * response fields it reads. apps/api's mcp-contract test
 * (apps/api/tests/mcp-contract.test.ts) runs the real
 * routers and handlers against this table, so renaming a route or a field on
 * either side fails CI instead of failing a contributor's chat.
 */
export const API_CONTRACT = {
  deploy: {
    method: 'POST',
    mount: '/api/escrow',
    path: '/deploy',
    /** Exactly one of apartmentId / reservationId, plus the guest wallet. */
    request: ['apartmentId', 'reservationId', 'senderAddress'],
    response: ['status', 'engagementId', 'contractId', 'unsignedXDR'],
    /** Present only on idempotent replays. */
    optionalResponse: ['cached'],
  },
  fund: {
    method: 'POST',
    mount: '/api/escrow',
    path: '/fund',
    request: ['engagementId'],
    response: ['unsignedXdr', 'txHash', 'engagementId', 'contractId', 'expiresAt', 'reused'],
    optionalResponse: [],
  },
  health: {
    method: 'GET',
    mount: '',
    path: '/health',
    request: [],
    response: [],
    optionalResponse: [],
  },
} as const;

export type ApiRoute = keyof typeof API_CONTRACT;

export function routeUrl(route: ApiRoute): string {
  const { mount, path } = API_CONTRACT[route];
  return `${mount}${path}`;
}
