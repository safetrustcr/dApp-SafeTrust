import { Response } from 'express';
import { AuthenticatedRequest } from '../../middleware/auth.middleware.js';
import { executeGraphQL } from '../../lib/hasura.js';

type StartConversationBody = {
  apartmentId: string;
};

type StartConversationResponse = {
  conversationId: string;
};

export const startConversationHandler = async (
  req: AuthenticatedRequest & { body: StartConversationBody },
  res: Response<StartConversationResponse | { error: string }>
): Promise<Response> => {
  const { uid } = req.user;
  const { apartmentId } = req.body;

  if (!apartmentId) {
    return res.status(400).json({ error: 'Missing required field: apartmentId' });
  }

  // Validate apartmentId is a valid UUID string
  if (typeof apartmentId !== 'string' || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(apartmentId)) {
    return res.status(400).json({ error: 'Invalid apartmentId format: must be a valid UUID' });
  }

  try {
    // First, get the apartment owner (host)
    const apartmentData = await executeGraphQL<{
      apartments: Array<{ owner_id: string }>;
    }>(
      `query GetApartmentOwner($apartmentId: uuid!) {
        apartments(where: { id: { _eq: $apartmentId }, deleted_at: { _is_null: true } }, limit: 1) {
          owner_id
        }
      }`,
      { apartmentId }
    );

    const apartment = apartmentData.apartments[0];
    if (!apartment) {
      return res.status(404).json({ error: 'Apartment not found' });
    }

    const hostId = apartment.owner_id;

    // Prevent users from messaging themselves
    if (hostId === uid) {
      return res.status(409).json({ error: 'Cannot start a conversation with yourself' });
    }

    // Create new conversation with atomic insert-or-return logic
    // Using insert with on_conflict to handle race conditions
    const result = await executeGraphQL<{
      insert_conversations_one: { id: string } | null;
    }>(
      `mutation CreateConversation($guestId: String!, $hostId: String!, $apartmentId: uuid!) {
        insert_conversations_one(
          object: {
            guest_id: $guestId
            host_id: $hostId
            apartment_id: $apartmentId
            status: "active"
            tenant_id: "safetrust"
          }
          on_conflict: {
            constraint: conversations_guest_id_host_id_apartment_id_key
            update_columns: []
          }
        ) {
          id
        }
      }`,
      { guestId: uid, hostId, apartmentId }
    );

    // If insert returned null (conflict), the conversation already exists
    // Query to get the existing conversation
    if (!result.insert_conversations_one) {
      const existingConversation = await executeGraphQL<{
        conversations: Array<{ id: string }>;
      }>(
        `query GetExistingConversation($guestId: String!, $hostId: String!, $apartmentId: uuid!) {
          conversations(
            where: {
              guest_id: { _eq: $guestId }
              host_id: { _eq: $hostId }
              apartment_id: { _eq: $apartmentId }
            }
            limit: 1
          ) {
            id
          }
        }`,
        { guestId: uid, hostId, apartmentId }
      );

      if (existingConversation.conversations.length > 0) {
        return res.status(200).json({
          conversationId: existingConversation.conversations[0].id,
        });
      }
    }

    console.log(`[messages/conversations] ✅ conversation created — conversationId: ${result.insert_conversations_one?.id}`);

    return res.status(201).json({
      conversationId: result.insert_conversations_one?.id,
    });
  } catch (error) {
    console.error('[messages/conversations] ❌ error:', error);
    return res.status(500).json({ error: 'Failed to start conversation' });
  }
};
