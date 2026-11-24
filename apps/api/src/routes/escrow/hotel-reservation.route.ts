import { Router } from 'express';
import { authenticateFirebase, type AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { asyncHandler } from '../../http/async-handler.js';
import { ApiError } from '../../http/api-error.js';
import { getHotelReservation, getHotelReservationEscrowTerms, hotelBookingView } from '../../services/hotel-reservation-escrow.js';
import { assertEscrowParticipant, rolesFor, EscrowAccessError } from '../../services/escrow-authz.js';
import { hasuraRequest } from '../../services/hasura.js';

const router = Router();
router.get('/hotel-reservations/:id', authenticateFirebase, asyncHandler(async (req: AuthenticatedRequest, res) => {
  const terms = await getHotelReservationEscrowTerms(req.params.id, req.user!.uid);
  res.json({ booking: hotelBookingView(terms.reservation, terms.amount, terms.receiverAddress), senderAddress: terms.senderAddress, checkIn: terms.reservation.check_in, checkOut: terms.reservation.check_out });
}));

router.get('/hotel-reservations/:id/escrows/:engagementId', authenticateFirebase, asyncHandler(async (req: AuthenticatedRequest, res) => {
  if (req.params.engagementId !== `hotel:${req.params.id}`) throw new ApiError(404, 'ESCROW_NOT_FOUND', 'Escrow not found for this reservation.');
  let escrow;
  try { escrow = await assertEscrowParticipant(req.user!.uid, req.params.engagementId); }
  catch (error) {
    if (error instanceof EscrowAccessError) throw new ApiError(error.status, error.code, error.message);
    throw error;
  }
  const reservation = await getHotelReservation(req.params.id);
  const roles = rolesFor(escrow);
  const data = await hasuraRequest<{ trustlessWorkEscrows: Array<{ milestones: unknown[] }> }>(
    `query HotelEscrowMilestones($contractId: String!) { trustlessWorkEscrows(where: { contractId: { _eq: $contractId } }, limit: 1) { milestones { milestoneId status } } }`,
    { contractId: escrow.contract_id },
  );
  res.json({ escrows: [{ ...escrow, amount: Number(escrow.amount), apartment: hotelBookingView(reservation, Number(escrow.amount), escrow.receiver_address) }], trustlessWorkEscrows: [{ approver: roles.approver, marker: roles.serviceProvider, releaser: roles.releaseSigner, resolver: roles.disputeResolver, milestones: data.trustlessWorkEscrows[0]?.milestones ?? [] }] });
}));
export default router;
