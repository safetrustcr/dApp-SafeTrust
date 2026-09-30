import { auth } from '@/lib/firebase';
import { useGlobalAuthenticationStore } from '@/core/store/data';
import type { Hotel, HotelInput } from '@safetrust/types';

const API_BASE_URL =
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.NEXT_PUBLIC_BACKEND_URL ??
  'http://localhost:3002';

export class HotelApiError extends Error {
  readonly status: number;
  readonly payload: unknown;
  readonly code?: string;

  constructor(message: string, status: number, payload: unknown = null, code?: string) {
    super(message);
    this.name = 'HotelApiError';
    this.status = status;
    this.payload = payload;
    this.code = code;
  }
}

/**
 * Resolves Firebase ID token from the active session or persistent store.
 */
async function resolveToken(): Promise<string> {
  const user = auth.currentUser;
  if (user) {
    try {
      const token = await user.getIdToken();
      if (token) return token;
    } catch {
      // Fall through to store
    }
  }

  const storeToken = useGlobalAuthenticationStore.getState().token;
  if (storeToken) return storeToken;

  if (typeof window !== 'undefined') {
    try {
      const raw = localStorage.getItem('safetrust-auth');
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.state?.token) return parsed.state.token;
      }
    } catch {
      // Ignore localStorage errors
    }
  }

  throw new HotelApiError('You must be signed in to perform this action.', 401, null);
}

/**
 * Performs an authenticated HTTP request to apps/api for hotel industry operations.
 * Sets the validated X-Tenant-ID: hotel_industry header to route queries and mutations correctly.
 */
export async function apiRequest<T>(
  path: string,
  method: 'GET' | 'POST' | 'PATCH' | 'DELETE',
  body?: unknown,
): Promise<T> {
  const token = await resolveToken();

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    'X-Tenant-ID': 'hotel_industry',
    Authorization: `Bearer ${token}`,
  };

  const response = await fetch(`${API_BASE_URL}${path}`, {
    method,
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  });

  const payload: any = await response.json().catch(() => null);

  if (!response.ok) {
    const message =
      (payload && typeof payload === 'object' && typeof payload.message === 'string' && payload.message) ||
      (payload && typeof payload === 'object' && typeof payload.error === 'string' && payload.error) ||
      `Request failed with status ${response.status}`;

    const code =
      payload && typeof payload === 'object' && typeof payload.code === 'string'
        ? payload.code
        : undefined;

    throw new HotelApiError(message, response.status, payload, code);
  }

  return payload as T;
}

/** Shared POST helper for authenticated hotel API endpoints. */
export async function apiPost<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, 'POST', body);
}

/** Shared PATCH helper for authenticated hotel API endpoints. */
export async function apiPatch<T>(path: string, body: unknown): Promise<T> {
  return apiRequest<T>(path, 'PATCH', body);
}

/** Shared DELETE helper for authenticated hotel API endpoints. */
export async function apiDelete<T>(path: string): Promise<T> {
  return apiRequest<T>(path, 'DELETE');
}

/**
 * Creates a new hotel through apps/api.
 */
export async function createHotel(input: HotelInput): Promise<Hotel> {
  const result = await apiPost<{ hotel: Hotel }>('/api/hotels', input);
  return result.hotel;
}

/**
 * Updates an existing hotel through apps/api.
 */
export async function updateHotel(id: string, input: Partial<HotelInput>): Promise<Hotel> {
  const result = await apiPatch<{ hotel: Hotel }>(`/api/hotels/${id}`, input);
  return result.hotel;
}

/**
 * Deletes a hotel through apps/api.
 */
export async function deleteHotel(id: string): Promise<{ success: boolean; id: string }> {
  return apiDelete<{ success: boolean; id: string }>(`/api/hotels/${id}`);
}
