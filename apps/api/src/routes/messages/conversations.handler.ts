import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';
import {
  getApartment,
  getConversation,
  upsertConversation,
  markConversationRead,
} from '../../services/messages-db.js';

const FORBIDDEN_FIELDS = [
  'senderId',
  'isAutomated',
  'eventType',
  'eventKey',
  'sender_id',
  'is_automated',
  'event_type',
  'event_key',
];

export const startConversationHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { apartmentId, ...rest } = req.body ?? {};

    if (FORBIDDEN_FIELDS.some((k) => k in rest)) {
      throw new ApiError(400, 'FORBIDDEN_FIELD', 'Message metadata is set by the server.');
    }

    if (!apartmentId || typeof apartmentId !== 'string' || !apartmentId.trim()) {
      throw new ApiError(400, 'INVALID_APARTMENT_ID', 'apartmentId is required.');
    }

    const apartment = await getApartment(apartmentId.trim());
    if (!apartment) {
      throw new ApiError(404, 'APARTMENT_NOT_FOUND', 'Apartment not found.');
    }

    if (apartment.owner_id === req.user.uid) {
      throw new ApiError(
        400,
        'CANNOT_MESSAGE_OWN_LISTING',
        'Cannot message your own listing.',
      );
    }

    const result = await upsertConversation({
      apartmentId: apartment.id,
      hostId: apartment.owner_id,
      guestId: req.user.uid,
    });

    const statusCode = result.created ? 201 : 200;
    return res.status(statusCode).json(result);
  },
);

export const markConversationReadHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const conversationId = req.params.id;

    if (!conversationId || typeof conversationId !== 'string' || !conversationId.trim()) {
      throw new ApiError(400, 'INVALID_CONVERSATION_ID', 'conversationId is required.');
    }

    const convo = await getConversation(conversationId.trim());
    if (!convo) {
      throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
    }

    const role =
      convo.host_id === req.user.uid
        ? 'host'
        : convo.guest_id === req.user.uid
          ? 'guest'
          : null;

    if (!role) {
      throw new ApiError(403, 'NOT_A_PARTICIPANT', 'You are not part of this conversation.');
    }

    await markConversationRead({
      conversationId: convo.id,
      readerRole: role,
    });

    return res.status(204).send();
  },
);
