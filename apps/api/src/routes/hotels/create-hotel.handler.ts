import { hotelWriteError } from './hotel-write-error.js';
import { hasuraRequest } from '../../services/hasura.js';
import type { Response } from 'express';
import { validateHotelInput, type HotelInput } from '@safetrust/types';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  createHotel,
  findHotelUserByFirebaseUidOrEmail,
  isPlatformAdmin,
  toGeoJSONPoint,
} from '../../services/hotels-db.js';

export async function createHotelHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const { uid, email } = req.user;

    // Check platform admin status
    const isAdmin = (req.user.role === 'admin') || (await isPlatformAdmin(uid));

    // Resolve user in hotel_industry
    const hotelUser = await findHotelUserByFirebaseUidOrEmail(uid, email);

    // Only MANAGER or platform admin may create hotels
    const isManager = hotelUser?.role?.toUpperCase() === 'MANAGER';
    if (!isAdmin && !isManager) {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Only managers and platform admins can create hotels',
      });
    }

    // Validate input using the shared validator
    const body: HotelInput = req.body || {};
    const validation = validateHotelInput(body);
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.message,
        errors: validation.errors,
      });
    }

    // Determine owner_user_id:
    // Platform admins may specify ownerUserId; for managers it is strictly their own user ID
    let ownerUserId: string;
    if (isAdmin && typeof body.ownerUserId === 'string' && body.ownerUserId.trim()) {
      ownerUserId = body.ownerUserId.trim();
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(ownerUserId)) return res.status(400).json({ error: 'Choose a registered hotel manager.', errors: { ownerUserId: 'Choose a registered hotel manager.' } });
      const owner = await hasuraRequest<{ hotel_users_by_pk: { role: string } | null }>(
        `query HotelOwner($id: uuid!) { hotel_users_by_pk(id: $id) { role } }`, { id: ownerUserId },
      );
      if (owner.hotel_users_by_pk?.role !== 'MANAGER') return res.status(400).json({ error: 'Choose a registered hotel manager.', errors: { ownerUserId: 'Choose a registered hotel manager.' } });
    } else if (hotelUser?.id) {
      ownerUserId = hotelUser.id;
    } else if (isAdmin) {
      return res.status(400).json({ error: "Choose a hotel manager as the owner.", errors: { ownerUserId: "Choose a hotel manager as the owner." } });
    } else {
      return res.status(403).json({
        error: 'Forbidden',
        message: 'Unable to resolve hotel manager identity',
      });
    }

    const coordinates = toGeoJSONPoint(body.latitude, body.longitude);

    const created = await createHotel({
      name: (body.name ?? '').trim(),
      address: (body.address ?? '').trim(),
      description: body.description ? body.description.trim() : null,
      location_area: (body.locationArea ?? body.location_area)?.trim() ?? null,
      coordinates,
      owner_user_id: ownerUserId,
      image_urls: body.image_urls,
    });

    return res.status(201).json({
      hotel: {
        ...created,
        latitude: created.coordinates?.coordinates ? created.coordinates.coordinates[1] : null,
        longitude: created.coordinates?.coordinates ? created.coordinates.coordinates[0] : null,
      },
    });
  } catch (error) {
    const requestId = res.locals?.requestId;
    console.error(`[hotels/create] request ${requestId ?? 'unknown'} failed:`, error);
    const failure = hotelWriteError(error);
    return res.status(failure.status).json({
      error: failure.message,
      code: failure.code,
      ...(requestId ? { requestId } : {}),
    });
  }
}
