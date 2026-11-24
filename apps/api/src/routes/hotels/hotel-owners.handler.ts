import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { isPlatformAdmin } from '../../services/hotels-db.js';
import { hasuraRequest } from '../../services/hasura.js';

export const hotelOwnerOptionsHandler = asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (req.user.role !== 'admin' && !await isPlatformAdmin(req.user.uid)) throw new ApiError(403, 'ADMIN_REQUIRED', 'Only admins can choose another hotel owner.');
  const data = await hasuraRequest<{ hotel_users: Array<{ id: string; first_name: string | null; last_name: string | null; email: string }> }>(
    `query HotelOwnerOptions { hotel_users(where: { role: { _eq: "MANAGER" } }, order_by: { created_at: asc }) { id first_name last_name email } }`,
  );
  res.json({ owners: data.hotel_users.map((user) => ({ id: user.id, name: [user.first_name, user.last_name].filter(Boolean).join(' ') || user.email })) });
});
