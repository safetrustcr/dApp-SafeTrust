import { HasuraRequestError } from '../../services/hasura.js';

/** Safe, actionable errors; keep the full database diagnostic in server logs. */
export function hotelWriteError(error: unknown) {
  if (error instanceof HasuraRequestError) {
    const messages = [error.message, ...(error.details?.map((detail) => detail.message) ?? [])].join(' ');
    if (/Missing required env var|admin.secret|access.denied|invalid.*secret/i.test(messages)) {
      return { status: 503, code: 'DATABASE_NOT_CONFIGURED', message: 'The API cannot authenticate with Hasura. Check the API database configuration and restart the API.' };
    }
    if (/not found in type|does not exist|unknown type|unknown.*field/i.test(messages)) {
      return { status: 503, code: 'HOTEL_SCHEMA_NOT_READY', message: 'The hotel database schema is not ready. Apply the hotel migrations and redeploy metadata for both tenants.' };
    }
    if (error.details?.some((detail) => detail.extensions?.code === 'constraint-violation' || detail.extensions?.code === 'foreign-key-violation' || detail.extensions?.code === 'foreign_key_violation')) {
      return { status: 409, code: 'HOTEL_DATA_CONFLICT', message: 'The hotel could not be saved because a related record changed. Reload the form and check the selected hotel manager.' };
    }
  }
  if (error instanceof TypeError && /fetch failed|Failed to fetch/i.test(error.message)) {
    return { status: 503, code: 'DATABASE_UNAVAILABLE', message: 'The API cannot reach Hasura. Check that the backend containers are running.' };
  }
  return { status: 500, code: 'HOTEL_CREATE_FAILED', message: 'The hotel could not be saved. Check the API log for the request ID.' };
}
