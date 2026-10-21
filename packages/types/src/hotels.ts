export interface HotelGeoJSONPoint {
  type: 'Point';
  coordinates: [number, number]; // GeoJSON order: [longitude, latitude]
}

export interface HotelImage { id?: string; image_url: string; position?: number; }
export interface HotelRoom {
  room_id: string;
  room_number: string;
  price_night: number;
  capacity: number;
  is_available: boolean;
  room_type?: { name: string } | null;
  images?: Array<{ id?: string; image_url: string }>;
}

export interface Hotel {
  id: string;
  name: string;
  address: string;
  description?: string | null;
  location_area?: string | null;
  locationArea?: string | null;
  coordinates?: HotelGeoJSONPoint | null;
  latitude?: number | null;
  longitude?: number | null;
  created_at: string;
  updated_at: string;
  owner_user_id: string;
  images?: HotelImage[];
  rooms?: HotelRoom[];
}

export interface HotelInput {
  image_urls?: string[];
  name?: string;
  address?: string;
  description?: string | null;
  locationArea?: string | null;
  location_area?: string | null;
  latitude?: number | string | null;
  longitude?: number | string | null;
  lat?: number | string | null;
  lng?: number | string | null;
  ownerUserId?: string | null;
  owner_user_id?: string | null;
}

export interface HotelValidationResult {
  valid: boolean;
  errors: Record<string, string>;
  message?: string;
}

/**
 * Validates hotel create/update input against the schema constraints.
 * Rules are identical across client and server to prevent drift.
 */
export function validateHotelInput(
  input: HotelInput,
  options: { isUpdate?: boolean } = {}
): HotelValidationResult {
  const errors: Record<string, string> = {};
  const isUpdate = options.isUpdate ?? false;

  // 1. name: required, trimmed, 1–100 characters
  if (!isUpdate || 'name' in input) {
    if (input.name === undefined || input.name === null || typeof input.name !== 'string') {
      errors.name = 'Hotel name is required';
    } else {
      const trimmed = input.name.trim();
      if (trimmed.length === 0) {
        errors.name = 'Hotel name is required';
      } else if (trimmed.length > 100) {
        errors.name = 'Hotel name must be between 1 and 100 characters';
      }
    }
  }

  // 2. address: required, trimmed, 1–200 characters
  if (!isUpdate || 'address' in input) {
    if (input.address === undefined || input.address === null || typeof input.address !== 'string') {
      errors.address = 'Hotel address is required';
    } else {
      const trimmed = input.address.trim();
      if (trimmed.length === 0) {
        errors.address = 'Hotel address is required';
      } else if (trimmed.length > 200) {
        errors.address = 'Hotel address must be between 1 and 200 characters';
      }
    }
  }

  // 3. description: optional, ≤ 500 characters
  if (input.description !== undefined && input.description !== null) {
    if (typeof input.description === 'string' && input.description.length > 500) {
      errors.description = 'Description must be at most 500 characters';
    }
  }

  // 4. locationArea / location_area: optional, ≤ 100 characters
  const locArea = input.locationArea !== undefined ? input.locationArea : input.location_area;
  if (locArea !== undefined && locArea !== null) {
    if (typeof locArea === 'string' && locArea.length > 100) {
      errors.locationArea = 'Location area must be at most 100 characters';
    }
  }

  // 5. latitude & longitude: optional number, −90 to 90 & −180 to 180; both or neither
  const rawLat = input.latitude !== undefined ? input.latitude : input.lat;
  const rawLng = input.longitude !== undefined ? input.longitude : input.lng;

  const hasLat = rawLat !== undefined && rawLat !== null && String(rawLat).trim() !== '';
  const hasLng = rawLng !== undefined && rawLng !== null && String(rawLng).trim() !== '';

  if (hasLat !== hasLng) {
    errors.coordinates = 'Both latitude and longitude must be provided together';
  } else if (hasLat && hasLng) {
    const latNum = typeof rawLat === 'number' ? rawLat : Number(rawLat);
    const lngNum = typeof rawLng === 'number' ? rawLng : Number(rawLng);

    if (isNaN(latNum) || !Number.isFinite(latNum) || latNum < -90 || latNum > 90) {
      errors.latitude = 'Latitude must be between -90 and 90';
    }

    if (isNaN(lngNum) || !Number.isFinite(lngNum) || lngNum < -180 || lngNum > 180) {
      errors.longitude = 'Longitude must be between -180 and 180';
    }
  }

  if (input.image_urls !== undefined) {
    if (!Array.isArray(input.image_urls) || input.image_urls.length > 8) {
      errors.image_urls = 'Choose up to 8 hotel images';
    } else {
      const images: string[] = [];
      for (const image of input.image_urls) {
        if (typeof image !== 'string' || image.length > 700000) {
          errors.image_urls = 'Each image must be a valid URL or a prepared attachment';
          break;
        }
        const value = image.trim();
        let validUrl = false;
        try { const url = new URL(value); validUrl = ['http:', 'https:'].includes(url.protocol) && value.length <= 2048; } catch {}
        const attachment = /^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/]+={0,2}$/.test(value);
        if (!validUrl && !attachment) { errors.image_urls = 'Use an HTTP image URL or attach a JPEG, PNG, or WebP image'; break; }
        images.push(value);
      }
      if (new Set(images).size !== images.length) errors.image_urls = 'Remove duplicate hotel images';
    }
  }

  const valid = Object.keys(errors).length === 0;
  const message = valid ? undefined : Object.values(errors)[0];

  return {
    valid,
    errors,
    message,
  };
}
