import { hasuraRequest } from '../../services/hasura.js';
import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { findHotelUserByFirebaseUidOrEmail, isPlatformAdmin } from '../../services/hotels-db.js';
import { hotelWriteError } from './hotel-write-error.js';

export async function createReservationHandler(
  req: AuthenticatedRequest,
  res: Response,
): Promise<Response> {
  try {
    const { uid, email } = req.user;
    const { roomId, checkIn, checkOut, guests, walletAddress } = req.body || {};

    // Validate required fields
    if (!roomId || typeof roomId !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'roomId is required',
      });
    }
    if (!checkIn || typeof checkIn !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'checkIn is required',
      });
    }
    if (!checkOut || typeof checkOut !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'checkOut is required',
      });
    }
    if (guests === undefined || typeof guests !== 'number' || guests < 1) {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'guests must be a positive number',
      });
    }
    if (!walletAddress || typeof walletAddress !== 'string') {
      return res.status(400).json({
        error: 'Invalid input',
        message: 'walletAddress is required',
      });
    }

    // Parse and validate dates
    const checkInDate = new Date(checkIn);
    const checkOutDate = new Date(checkOut);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (isNaN(checkInDate.getTime()) || isNaN(checkOutDate.getTime())) {
      return res.status(400).json({
        error: 'INVALID_DATES',
        message: 'Invalid date format',
      });
    }

    if (checkInDate < today) {
      return res.status(400).json({
        error: 'INVALID_DATES',
        message: 'Check-in date must be today or later',
      });
    }

    if (checkOutDate <= checkInDate) {
      return res.status(400).json({
        error: 'INVALID_DATES',
        message: 'Check-out date must be after check-in date',
      });
    }

    const nights = Math.ceil((checkOutDate.getTime() - checkInDate.getTime()) / (1000 * 60 * 60 * 24));
    if (nights > 30) {
      return res.status(400).json({
        error: 'INVALID_DATES',
        message: 'Maximum stay is 30 nights',
      });
    }

    // Get room details
    const roomData = await hasuraRequest<{ rooms_by_pk: { room_id: string; capacity: number; price_night: string; hotel: { owner_user_id: string } } | null }>(
      `query GetRoomDetails($roomId: uuid!) {
        rooms_by_pk(room_id: $roomId) {
          room_id
          capacity
          price_night
          hotel {
            owner_user_id
          }
        }
      }`,
      { roomId },
    );

    const room = roomData.rooms_by_pk;
    if (!room) {
      return res.status(404).json({
        error: 'ROOM_NOT_FOUND',
        message: 'Room not found',
      });
    }

    // Check guest capacity
    if (guests > room.capacity) {
      return res.status(400).json({
        error: 'TOO_MANY_GUESTS',
        message: `Room capacity is ${room.capacity} guests`,
      });
    }

    // Resolve caller's hotel user
    const hotelUser = await findHotelUserByFirebaseUidOrEmail(uid, email);
    const isAdmin = (req.user.role === 'admin') || (await isPlatformAdmin(uid));

    // Check for self-booking (caller is hotel owner or staff)
    if (!isAdmin && hotelUser?.id === room.hotel.owner_user_id) {
      return res.status(403).json({
        error: 'SELF_BOOKING',
        message: 'You cannot book your own hotel',
      });
    }

    // Calculate total price
    const pricePerNight = Number(room.price_night);
    const total = pricePerNight * nights;

    // Calculate hold expiration (30 minutes from now)
    const holdExpiresAt = new Date(Date.now() + 30 * 60 * 1000).toISOString();

    // Insert reservation with overlap check handled by the exclusion constraint
    const result = await hasuraRequest<{ insert_reservations_one: { id: string } }>(
      `mutation CreateReservation($object: hotel_industry_reservations_insert_input!) {
        insert_reservations_one(object: $object) {
          id
        }
      }`,
      {
        object: {
          room_id: roomId,
          check_in: checkInDate.toISOString(),
          check_out: checkOutDate.toISOString(),
          capacity: guests,
          wallet_address: walletAddress,
          reservation_status: 'PENDING',
          total_amount: total,
          hold_expires_at: holdExpiresAt,
        },
      },
    );

    return res.status(201).json({
      reservationId: result.insert_reservations_one.id,
      total,
      holdExpiresAt,
    });
  } catch (error) {
    const requestId = res.locals?.requestId;
    console.error(`[hotel-reservations/create] request ${requestId ?? 'unknown'} failed:`, error);

    // Check for overlap constraint violation
    if (error instanceof Error && /reservations_room_date_overlap/.test(error.message)) {
      return res.status(409).json({
        error: 'ROOM_UNAVAILABLE',
        message: 'Room is unavailable for the selected dates',
        ...(requestId ? { requestId } : {}),
      });
    }

    const failure = hotelWriteError(error);
    return res.status(failure.status).json({
      error: failure.message,
      code: failure.code,
      ...(requestId ? { requestId } : {}),
    });
  }
}
