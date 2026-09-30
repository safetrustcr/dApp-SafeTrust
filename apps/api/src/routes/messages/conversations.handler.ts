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

    // Check if conversation already exists
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
      // Return existing conversation
      return res.status(200).json({
        conversationId: existingConversation.conversations[0].id,
      });
    }

    // Create new conversation
    const newConversation = await executeGraphQL<{
      insert_conversations_one: { id: string };
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
        ) {
          id
        }
      }`,
      { guestId: uid, hostId, apartmentId }
    );

    console.log(`[messages/conversations] ✅ conversation created — conversationId: ${newConversation.insert_conversations_one.id}`);

    return res.status(201).json({
      conversationId: newConversation.insert_conversations_one.id,
    });
  } catch (error) {
    console.error('[messages/conversations] ❌ error:', error);
    return res.status(500).json({ error: 'Failed to start conversation' });
  }
};
