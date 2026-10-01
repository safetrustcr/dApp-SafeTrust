import type { Response } from 'express';
import { validateHotelInput, type HotelInput } from '@safetrust/types';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  findHotelUserByFirebaseUidOrEmail,
  getHotelById,
  isPlatformAdmin,
  toGeoJSONPoint,
  updateHotel,
  type UpdateHotelDbInput,
} from '../../services/hotels-db.js';

export async function updateHotelHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ error: 'Hotel ID is required' });
    }

    const { uid, email } = req.user;

    // Check hotel exists
    const hotel = await getHotelById(id);
    if (!hotel) {
      return res.status(404).json({ error: 'Hotel not found' });
    }

    // Check platform admin status
    const isAdmin = (req.user.role === 'admin') || (await isPlatformAdmin(uid));

    // Resolve user in hotel_industry
    const hotelUser = await findHotelUserByFirebaseUidOrEmail(uid, email);

    // Only platform admins or the owning MANAGER may update
    if (!isAdmin) {
      const isManager = hotelUser?.role?.toUpperCase() === 'MANAGER';
      if (!isManager) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only managers and platform admins can update hotels',
        });
      }

      if (hotel.owner_user_id !== hotelUser?.id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to manage this hotel',
        });
      }
    }

    // Validate update input using the shared validator
    const body: HotelInput = req.body || {};
    const validation = validateHotelInput(body, { isUpdate: true });
    if (!validation.valid) {
      return res.status(400).json({
        error: validation.message,
        errors: validation.errors,
      });
    }

    // Prepare update payload with allowed fields only (updated_at is maintained by trigger)
    const updatePayload: UpdateHotelDbInput = {};
    if (body.name !== undefined) {
      updatePayload.name = body.name.trim();
    }
    if (body.address !== undefined) {
      updatePayload.address = body.address.trim();
    }
    if (body.description !== undefined) {
      updatePayload.description = body.description ? body.description.trim() : null;
    }
    if (body.locationArea !== undefined || body.location_area !== undefined) {
      const loc = body.locationArea ?? body.location_area;
      updatePayload.location_area = loc ? loc.trim() : null;
    }
    if (
      body.latitude !== undefined ||
      body.longitude !== undefined ||
      body.lat !== undefined ||
      body.lng !== undefined
    ) {
      const rawLat = body.latitude !== undefined ? body.latitude : body.lat;
      const rawLng = body.longitude !== undefined ? body.longitude : body.lng;
      updatePayload.coordinates = toGeoJSONPoint(rawLat, rawLng);
    }

    const updated = await updateHotel(id, updatePayload);

    return res.status(200).json({
      hotel: {
        ...updated,
        latitude: updated.coordinates?.coordinates ? updated.coordinates.coordinates[1] : null,
        longitude: updated.coordinates?.coordinates ? updated.coordinates.coordinates[0] : null,
      },
    });
  } catch (error) {
    console.error('[hotels/update] Failed to update hotel:', error);
    return res.status(500).json({
      error: 'Internal server error updating hotel',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
