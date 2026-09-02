import { Request, Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { hasuraRequest } from '../../services/hasura.js';

type SendMessageBody = {
  conversationId: string;
  body: string;
  isAutomated?: boolean;
  eventType?: string;
};

type SendMessageResponse = {
  messageId: string;
  conversationId: string;
  createdAt: string;
};

export const sendMessageHandler = async (
  req: Request<unknown, unknown, SendMessageBody>,
  res: Response<SendMessageResponse | { error: string }>
): Promise<Response> => {
  const { uid } = (req as AuthenticatedRequest).user;
  const { conversationId, body, isAutomated = false, eventType } = req.body;

  if (!conversationId || !body?.trim()) {
    return res.status(400).json({ error: 'Missing required fields: conversationId, body' });
  }

  if (body.length > 4000) {
    return res.status(400).json({ error: 'Message body exceeds 4000 character limit' });
  }

  if (eventType && !isAutomated) {
    return res.status(400).json({ error: 'eventType requires isAutomated: true' });
  }

  try {
    const data = await hasuraRequest<{
      insert_messages_one: { id: string; created_at: string };
    }>(
      `mutation SendMessage(
        $conversationId: uuid!
        $senderId: String!
        $body: String!
        $isAutomated: Boolean!
        $eventType: String
      ) {
        insert_messages_one(object: {
          conversation_id: $conversationId
          sender_id: $senderId
          body: $body
          is_automated: $isAutomated
          event_type: $eventType
          tenant_id: "safetrust"
        }) {
          id created_at
        }
      }`,
      { conversationId, senderId: uid, body: body.trim(), isAutomated, eventType }
    );

    const message = data.insert_messages_one;
    console.log(`[messages/send] ✅ message sent — conversationId: ${conversationId}`);

    return res.status(201).json({
      messageId: message.id,
      conversationId,
      createdAt: message.created_at,
    });
  } catch (error) {
    console.error('[messages/send] ❌ error:', error);
    return res.status(500).json({ error: 'Failed to send message' });
  }
};
