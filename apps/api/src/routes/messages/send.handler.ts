import type { Response } from 'express';
import type { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { ApiError } from '../../http/api-error.js';
import { asyncHandler } from '../../http/async-handler.js';
import { getConversation, insertManualMessage } from '../../services/messages-db.js';

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

export const sendMessageHandler = asyncHandler(
  async (req: AuthenticatedRequest, res: Response) => {
    const { conversationId, body, ...rest } = req.body ?? {};

    if (FORBIDDEN_FIELDS.some((k) => k in rest)) {
      throw new ApiError(400, 'FORBIDDEN_FIELD', 'Message metadata is set by the server.');
    }

    const text = typeof body === 'string' ? body : '';
    if (!text.trim() || text.length > 4000) {
      throw new ApiError(400, 'INVALID_MESSAGE_BODY', 'Message must be 1–4000 characters.');
    }

    if (!conversationId || typeof conversationId !== 'string' || !conversationId.trim()) {
      throw new ApiError(404, 'CONVERSATION_NOT_FOUND', 'Conversation not found.');
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

    const message = await insertManualMessage({
      conversationId: convo.id,
      senderId: req.user.uid,
      body: text,
      readerRole: role,
    });

    return res.status(201).json({ message });
  },
);
