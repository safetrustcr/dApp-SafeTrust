import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import {
  deleteHotel,
  findHotelUserByFirebaseUidOrEmail,
  getHotelById,
  getHotelDependents,
  isForeignKeyViolation,
  isPlatformAdmin,
} from '../../services/hotels-db.js';

export async function deleteHotelHandler(
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

    // Only platform admins or the owning MANAGER may delete
    if (!isAdmin) {
      const isManager = hotelUser?.role?.toUpperCase() === 'MANAGER';
      if (!isManager) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'Only managers and platform admins can delete hotels',
        });
      }

      if (hotel.owner_user_id !== hotelUser?.id) {
        return res.status(403).json({
          error: 'Forbidden',
          message: 'You do not have permission to manage this hotel',
        });
      }
    }

    // Check dependent records (rooms & reservations)
    const { roomsCount, reservationsCount } = await getHotelDependents(id);
    if (roomsCount > 0) {
      const roomLabel = roomsCount === 1 ? 'room' : 'rooms';
      return res.status(409).json({
        code: 'HOTEL_HAS_DEPENDENTS',
        error: `Remove this hotel's ${roomsCount} ${roomLabel} first`,
        message: `Remove this hotel's ${roomsCount} ${roomLabel} first`,
        roomsCount,
        reservationsCount,
      });
    }

    if (reservationsCount > 0) {
      const reservationLabel = reservationsCount === 1 ? 'reservation' : 'reservations';
      return res.status(409).json({
        code: 'HOTEL_HAS_DEPENDENTS',
        error: `Remove this hotel's ${reservationsCount} ${reservationLabel} first`,
        message: `Remove this hotel's ${reservationsCount} ${reservationLabel} first`,
        roomsCount,
        reservationsCount,
      });
    }

    // Attempt delete with foreign key error backstop
    try {
      await deleteHotel(id);
      return res.status(200).json({ success: true, id });
    } catch (error) {
      if (isForeignKeyViolation(error)) {
        return res.status(409).json({
          code: 'HOTEL_HAS_DEPENDENTS',
          error: 'Cannot delete hotel because it has dependent records (rooms or reservations).',
          message: 'Cannot delete hotel because it has dependent records (rooms or reservations).',
        });
      }
      throw error;
    }
  } catch (error) {
    console.error('[hotels/delete] Failed to delete hotel:', error);
    return res.status(500).json({
      error: 'Internal server error deleting hotel',
      detail: error instanceof Error ? error.message : String(error),
    });
  }
}
