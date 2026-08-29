import { hasuraRequest, HasuraRequestError } from '../services/hasura.js';

export const executeGraphQL = hasuraRequest;
export { hasuraRequest, HasuraRequestError };
