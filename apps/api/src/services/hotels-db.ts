import { hasuraRequest, HasuraRequestError } from './hasura.js';

export type GeoJSONPoint = {
  type: 'Point';
  coordinates: [number, number]; // GeoJSON order: [longitude, latitude]
};

export interface HotelRecord {
  id: string;
  name: string;
  address: string;
  description: string | null;
  location_area: string | null;
  coordinates: GeoJSONPoint | null;
  created_at: string;
  updated_at: string;
  owner_user_id: string;
}

export interface CreateHotelDbInput {
  name: string;
  address: string;
  description?: string | null;
  location_area?: string | null;
  coordinates?: GeoJSONPoint | null;
  owner_user_id: string;
}

export interface UpdateHotelDbInput {
  name?: string;
  address?: string;
  description?: string | null;
  location_area?: string | null;
  coordinates?: GeoJSONPoint | null;
}

export interface HotelIndustryUser {
  id: string;
  email: string;
  role: string;
  firebase_uid?: string | null;
}

/**
 * Builds a GeoJSON Point object from latitude and longitude.
 * PostGIS accepts GeoJSON objects via GraphQL variables without raw SQL concatenation.
 * Note: GeoJSON coordinates order is [longitude, latitude].
 */
export function toGeoJSONPoint(
  lat?: number | string | null,
  lng?: number | string | null,
): GeoJSONPoint | null {
  if (lat == null || lng == null) return null;
  const latStr = String(lat).trim();
  const lngStr = String(lng).trim();
  if (latStr === '' || lngStr === '') return null;

  const latNum = typeof lat === 'number' ? lat : Number(lat);
  const lngNum = typeof lng === 'number' ? lng : Number(lng);

  if (isNaN(latNum) || isNaN(lngNum) || !Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
    return null;
  }

  return {
    type: 'Point',
    coordinates: [lngNum, latNum],
  };
}

/**
 * Extracts latitude and longitude numbers from a GeoJSON Point object.
 */
export function fromGeoJSONPoint(
  point: unknown,
): { latitude: number; longitude: number } | null {
  if (!point || typeof point !== 'object') return null;
  const coordinates = (point as { coordinates?: unknown }).coordinates;
  if (!Array.isArray(coordinates) || coordinates.length < 2) return null;

  const lng = Number(coordinates[0]);
  const lat = Number(coordinates[1]);

  if (isNaN(lat) || isNaN(lng)) return null;
  return { latitude: lat, longitude: lng };
}

/**
 * Inserts a new hotel record into hotel_industry.hotels via Hasura.
 */
export async function createHotel(input: CreateHotelDbInput): Promise<HotelRecord> {
  const result = await hasuraRequest<{ insert_hotels_one: HotelRecord }>(
    `mutation CreateHotel($object: hotels_insert_input!) {
       insert_hotels_one(object: $object) {
         id
         name
         address
         description
         location_area
         coordinates
         created_at
         updated_at
         owner_user_id
       }
     }`,
    {
      object: {
        name: input.name,
        address: input.address,
        description: input.description ?? null,
        location_area: input.location_area ?? null,
        coordinates: input.coordinates ?? null,
        owner_user_id: input.owner_user_id,
      },
    },
  );

  return result.insert_hotels_one;
}

/**
 * Updates an existing hotel record.
 * Crucially, updated_at is NOT passed; it is maintained by the database trigger.
 */
export async function updateHotel(id: string, input: UpdateHotelDbInput): Promise<HotelRecord> {
  const setPayload: Record<string, unknown> = {};
  if (input.name !== undefined) setPayload.name = input.name;
  if (input.address !== undefined) setPayload.address = input.address;
  if (input.description !== undefined) setPayload.description = input.description;
  if (input.location_area !== undefined) setPayload.location_area = input.location_area;
  if (input.coordinates !== undefined) setPayload.coordinates = input.coordinates;

  const result = await hasuraRequest<{ update_hotels_by_pk: HotelRecord | null }>(
    `mutation UpdateHotel($id: uuid!, $set: hotels_set_input!) {
       update_hotels_by_pk(pk_columns: { id: $id }, _set: $set) {
         id
         name
         address
         description
         location_area
         coordinates
         created_at
         updated_at
         owner_user_id
       }
     }`,
    {
      id,
      set: setPayload,
    },
  );

  if (!result.update_hotels_by_pk) {
    throw new Error('Hotel not found or update returned no rows');
  }

  return result.update_hotels_by_pk;
}

/**
 * Retrieves a hotel by primary key ID.
 */
export async function getHotelById(id: string): Promise<HotelRecord | null> {
  const result = await hasuraRequest<{ hotels_by_pk: HotelRecord | null }>(
    `query GetHotelById($id: uuid!) {
       hotels_by_pk(id: $id) {
         id
         name
         address
         description
         location_area
         coordinates
         created_at
         updated_at
         owner_user_id
       }
     }`,
    { id },
  );

  return result.hotels_by_pk;
}

/**
 * Checks dependent records (rooms and reservations) for a hotel before deletion.
 */
export async function getHotelDependents(
  id: string,
): Promise<{ roomsCount: number; reservationsCount: number }> {
  const result = await hasuraRequest<{
    rooms_aggregate: { aggregate: { count: number } | null };
    reservations_aggregate: { aggregate: { count: number } | null };
  }>(
    `query GetHotelDependents($id: uuid!) {
       rooms_aggregate(where: { hotel_id: { _eq: $id } }) {
         aggregate {
           count
         }
       }
       reservations_aggregate(where: { room: { hotel_id: { _eq: $id } } }) {
         aggregate {
           count
         }
       }
     }`,
    { id },
  );

  const roomsCount = result.rooms_aggregate?.aggregate?.count ?? 0;
  const reservationsCount = result.reservations_aggregate?.aggregate?.count ?? 0;

  return { roomsCount, reservationsCount };
}

/**
 * Deletes a hotel by primary key ID.
 */
export async function deleteHotel(id: string): Promise<boolean> {
  const result = await hasuraRequest<{ delete_hotels_by_pk: { id: string } | null }>(
    `mutation DeleteHotel($id: uuid!) {
       delete_hotels_by_pk(id: $id) {
         id
       }
     }`,
    { id },
  );

  return Boolean(result.delete_hotels_by_pk?.id);
}

/**
 * Checks whether an error is a PostgreSQL foreign key restriction error.
 */
export function isForeignKeyViolation(error: unknown): boolean {
  if (!error) return false;
  const message = error instanceof Error ? error.message : String(error);
  if (
    /foreign[_\s]?key|fk_violation|violates foreign key constraint|update or delete on table.*violates foreign key/i.test(
      message,
    )
  ) {
    return true;
  }
  if (error instanceof HasuraRequestError) {
    return Boolean(
      error.details?.some(
        (detail) =>
          detail.extensions?.code === 'foreign_key_violation' ||
          detail.extensions?.code === 'constraint_violation' ||
          /foreign\s*key/i.test(detail.message ?? ''),
      ),
    );
  }
  return false;
}

/**
 * Resolves the caller's hotel_industry user account by firebase_uid or email.
 */
export async function findHotelUserByFirebaseUidOrEmail(
  firebaseUid: string,
  email?: string,
): Promise<HotelIndustryUser | null> {
  const conditions: Array<Record<string, unknown>> = [{ firebase_uid: { _eq: firebaseUid } }];
  if (email) {
    conditions.push({ email: { _eq: email.toLowerCase() } });
  }

  const result = await hasuraRequest<{ users: HotelIndustryUser[] }>(
    `query FindHotelUser($where: users_bool_exp!) {
       users(where: $where, limit: 1) {
         id
         email
         role
         firebase_uid
       }
     }`,
    { where: { _or: conditions } },
  );

  return result.users[0] ?? null;
}

/**
 * Verifies if the caller holds a platform admin role.
 */
export async function isPlatformAdmin(userId: string): Promise<boolean> {
  try {
    const result = await hasuraRequest<{
      user_roles: Array<{ role: { name: string } | null }>;
    }>(
      `query CheckPlatformAdmin($userId: String!) {
         user_roles(where: { user_id: { _eq: $userId }, role: { name: { _eq: "admin" } } }, limit: 1) {
           role { name }
         }
       }`,
      { userId },
    );

    return result.user_roles.some((assignment) => assignment.role?.name === 'admin');
  } catch {
    return false;
  }
}
